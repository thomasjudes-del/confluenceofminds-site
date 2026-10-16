import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

// Read-only Worker settings preflight, then GraphQL analytics. No SQL execution
// or application call. Settings schema: official Wrangler 4.151.0
// fetchWorkerConfig()/mapBindings(), cli.js lines 32544-32550: d1 id -> database_id.
// https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/settings/methods/get/
// Raw SQL strings arrive only as analytics data, are processed in memory, and
// are never returned, logged, written, sent to a second service or interpolated
// into a request. No D1 SQL-execution endpoint or GraphQL mutation exists here.
// Schema: official Wrangler 4.151.0 src/d1/insights.ts, installed cli.js lines
// 238758-238790, and https://developers.cloudflare.com/d1/observability/metrics-analytics/
// Wrangler selects dimensions.query, count and sum.rowsRead/rowsWritten,
// sorts sum_rowsRead_DESC and filters databaseId/datetimeHour_geq/leq.
const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const APPROVED_DATABASE_ID = '572c4e83-d06e-4779-9763-c8895af33fa7';
const APPROVED_WORKER = 'raluvaaa-alpha-api';
const MAX_GROUPS = 10;
const MAX_RESPONSE_BYTES = 768 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUERY = `query D1TopQueryUsage($accountTag: string, $filter: ZoneWorkersRequestsFilter_InputObject) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      d1QueriesAdaptiveGroups(
        limit: 10
        filter: $filter
        orderBy: [sum_rowsRead_DESC]
      ) {
        dimensions { query }
        count
        sum { rowsRead rowsWritten }
      }
    }
  }
}`;

// Exact normalized-shape hashes generated from the 14 unique statements in a
// synthetic capture of worker.mjs at local 5d03153 (remote-equivalent fe1c85d7).
// Literal values, comments, numeric constants and bind names do not enter hashes.
// Hash matches identify a known source-code shape, not a user or an HTTP caller.
const KNOWN_SHAPES = new Map([
  ["e96bd7e0306f9509dd4a0a556631c3b305a477d1b4e5593a750b0baf60111130","session-authentication"],
  ["78162f95eaed0d753c10c0eead8d22e92246ff314904a6d9000b22bec7bc1e76","session-last-seen-bookkeeping"],
  ["ace873f6132d22a88a3989c224f94afea44a4e714189cb4212b78dd1bac16871","qa-root-provenance"],
  ["b921256d8eceb4d2ef831af1c3cebd29a66ef9c0cf028acda8591a1540aa0eb9","qa-recursive-family"],
  ["9354c5288479cc9d322426c026ad13a14becb6ccd2daf1d31a7eee7b3cfb5a7f","world-wish-list"],
  ["47a33fcc50bc9e2bc1d5d22bb93992e32187a752d0c351421de119eeaa2d3307","world-event-history"],
  ["35f64a91fa88468b730df52bb331ecf6ab8a86b81a5d795c50dd6da66c2b13a1","own-wish-list"],
  ["8963cb0e0945a637cf0df75e2e1d9c4d546a56c9628781f3028b7d2d8e802448","unread-notification-count"],
  ["4bc8b6a0ffc839fa9f72266cd7dcf1196db163dc2b8a724c91d1f87c81c6c297","encouraged-wish-list"],
  ["26ce1f1ff727d6b20a8e97f800ed761cbb0fa5e1c42b72844bba2c252e57b950","actor-profile"],
  ["e017fd98b05d05a6ddd9d95365830af9bd2447c8979a50bdadfb09bf8db1ce5f","inbox-notification-list"],
  ["2d277d0813852d4fa8759353840f7a75ee45d7a40ea019337c0fa2e7e214f55c","inbox-pending-proposals"],
  ["ab090e706bf0581ea856bf397b321e1e0c7aae63dcde8eb7e2c2b932103adcaa","inbox-sent-proposals"],
  ["3dc73a2d830de2cdcbe6b624adef8694422e1f958b0d218b202212e09e0d79d0","inbox-received-proposals"],
]);

class InspectionError extends Error {}
const fail = message => { throw new InspectionError(message); };
const object = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Unexpected analytics response shape');
  return value;
};
const array = value => {
  if (!Array.isArray(value)) fail('Unexpected analytics response shape');
  return value;
};
const count = value => {
  if (!Number.isSafeInteger(value) || value < 0) fail('Invalid analytics count');
  return value;
};

export function safeInspectionError(error) {
  return error instanceof InspectionError ? error.message : 'D1 analytics inspection failed; details suppressed';
}

// Only known Cloudflare error categories cross this boundary. Provider messages,
// paths, account IDs and arbitrary extension values never enter output.
// https://developers.cloudflare.com/analytics/graphql-api/errors/
function graphqlFailure(errors) {
  if (!Array.isArray(errors) || !errors.length) return 'Analytics API rejected the query; error details suppressed';
  const categories = new Set(errors.map(error => {
    const message = typeof error?.message === 'string' ? error.message.slice(0, 2048).toLowerCase() : '';
    if (/^unauthorized(?:\b|$)/.test(message)) return 'authentication';
    if (/\bnot authorized for (?:that|this|the) account\b|\bare not authorized\b|\bdoes not have access to (?:the )?path\b/.test(message)) return 'permission';
    if (/^(?:unknown field\b|cannot query field\b|error parsing args\b|scalar fields must have no selections\b|object field must have selections\b|query contains error, please review it and retry)/.test(message)) return 'schema';
    return 'unknown';
  }));
  if (categories.size === 1 && categories.has('permission')) return 'Analytics access denied (GraphQL); stop without changing credentials or permissions';
  if (categories.size === 1 && categories.has('authentication')) return 'Analytics authentication rejected (GraphQL); stop without changing credentials or permissions';
  if (categories.size === 1 && categories.has('schema')) return 'Analytics schema/query validation failed (GraphQL); no retry performed';
  return 'Analytics API rejected the query; error details suppressed';
}

async function readBoundedJson(response, maxBytes = MAX_RESPONSE_BYTES) {
  if (!response.body || typeof response.body.getReader !== 'function') fail('Invalid analytics response');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let complete = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      total += value.byteLength;
      if (total > maxBytes) fail('Analytics response exceeded the safe size limit');
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof InspectionError) throw error;
    fail('Analytics response could not be read');
  } finally {
    if (!complete) { try { await reader.cancel(); } catch {} }
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks, total).toString('utf8'));
  } catch { fail('Invalid analytics JSON response'); }
}

// Tokenize just enough to fingerprint safely, without interpreting/executing SQL.
// A closed grammar rejects unsupported or malformed text instead of echoing it.
function normalizedShape(sql) {
  if (typeof sql !== 'string' || !sql.trim() || Buffer.byteLength(sql, 'utf8') > 65536) fail('Invalid analytics query shape');
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i], next = sql[i + 1];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '-' && next === '-') { i = sql.indexOf('\n', i + 2); if (i < 0) break; continue; }
    if (c === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end < 0) fail('Invalid analytics query shape');
      i = end + 2; continue;
    }
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const endQuote = c === '[' ? ']' : c;
      i++;
      let ended = false;
      while (i < sql.length) {
        if (sql[i] === endQuote) {
          if (sql[i + 1] === endQuote && c !== '[') { i += 2; continue; }
          i++; ended = true; break;
        }
        i++;
      }
      if (!ended) fail('Invalid analytics query shape');
      tokens.push(c === "'" ? '?' : '[quoted]'); continue;
    }
    if (c === '?' || c === ':' || c === '@' || c === '$') {
      i++;
      while (i < sql.length && /[A-Za-z0-9_]/.test(sql[i])) i++;
      tokens.push('?'); continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(next || ''))) {
      const match = /^(?:0[xX][0-9a-fA-F]+|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/.exec(sql.slice(i));
      if (!match) fail('Invalid analytics query shape');
      i += match[0].length; tokens.push('?'); continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i++;
      while (i < sql.length && /[A-Za-z0-9_]/.test(sql[i])) i++;
      tokens.push(sql.slice(start, i).toLowerCase()); continue;
    }
    if ('(),.*=<>!+-/%|&~;'.includes(c)) { tokens.push(c); i++; continue; }
    fail('Invalid analytics query shape');
  }
  while (tokens.at(-1) === ';') tokens.pop();
  if (!tokens.length) fail('Invalid analytics query shape');
  return tokens.join(' ');
}

export function classifyQuery(sql) {
  const shapeHash = createHash('sha256').update(normalizedShape(sql)).digest('hex');
  const category = KNOWN_SHAPES.get(shapeHash) || 'other-or-unrecognized';
  return { shapeHash, category, knownShape: category !== 'other-or-unrecognized' };
}

export async function inspectD1TopQueries({ fetchImpl = fetch, accountId, token, databaseId = APPROVED_DATABASE_ID, now = new Date(), onBindingVerified = () => {} } = {}) {
  if (typeof accountId !== 'string' || !/^[0-9a-f]{32}$/i.test(accountId) || typeof token !== 'string' || !token || /[\r\n]/.test(token)) {
    fail('Existing Cloudflare credentials are missing or invalid');
  }
  if (databaseId !== APPROVED_DATABASE_ID) fail('Database target is not the reviewed phase-one UUID');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) fail('Invalid inspection time');
  // First establish the exact DB association using the existing identity. No
  // other binding names or values are returned, logged, or retained in output.
  let settingsResponse;
  try {
    settingsResponse = await fetchImpl('https://api.cloudflare.com/client/v4/accounts/' + accountId + '/workers/scripts/' + APPROVED_WORKER + '/settings', {
      method: 'GET', redirect: 'error',
      headers: { authorization: 'Bearer ' + token, accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
  } catch { fail('Worker settings request failed; analytics not requested'); }
  if (!settingsResponse.ok) {
    if (settingsResponse.status === 401 || settingsResponse.status === 403) fail('Worker settings access denied; stop without changing credentials or permissions');
    fail('Worker settings HTTP request failed; analytics not requested');
  }
  const settings = object(await readBoundedJson(settingsResponse, 256 * 1024));
  if (settings.success !== true || (settings.errors != null && (!Array.isArray(settings.errors) || settings.errors.length))) fail('Worker settings API rejected the read; analytics not requested');
  const bindings = array(object(settings.result).bindings);
  if (bindings.length > 1000) fail('Unexpected Worker binding inventory size; analytics not requested');
  const matches = bindings.filter(binding => object(binding).name === 'DB');
  if (matches.length !== 1) fail('Worker DB binding is absent or ambiguous; analytics not requested');
  const binding = matches[0];
  if (binding.type !== 'd1' || typeof binding.id !== 'string' || !UUID.test(binding.id) || binding.id.toLowerCase() !== APPROVED_DATABASE_ID) {
    fail('Worker DB binding does not match the reviewed database; analytics not requested');
  }
  onBindingVerified({ inspection: 'read-only-worker-db-association', worker: APPROVED_WORKER, databaseId: APPROVED_DATABASE_ID, matched: true });
  const start = now.toISOString().slice(0, 10) + 'T00:00:00.000Z';
  const end = now.toISOString();
  const variables = { accountTag: accountId, filter: { AND: [{ datetimeHour_geq: start, datetimeHour_leq: end, databaseId }] } };
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      headers: { authorization: 'Bearer ' + token, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables }),
      signal: AbortSignal.timeout(15000)
    });
  } catch { fail('Analytics request failed; no retry or alternate endpoint attempted'); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) fail('Analytics access denied; stop without changing credentials or permissions');
    fail('Analytics HTTP request failed; response details suppressed');
  }
  const result = object(await readBoundedJson(response));
  if ('errors' in result && result.errors !== null && (!Array.isArray(result.errors) || result.errors.length)) {
    fail(graphqlFailure(result.errors));
  }
  const accounts = array(object(object(result.data).viewer).accounts);
  if (accounts.length !== 1) fail('Analytics account was unavailable or ambiguous; stop without changing access');
  const groups = array(object(accounts[0]).d1QueriesAdaptiveGroups);
  if (groups.length > MAX_GROUPS) fail('Analytics group limit was exceeded');
  const rows = groups.map(raw => {
    const row = object(raw);
    const dimensions = object(row.dimensions);
    const sums = object(row.sum);
    // Never retain the query in the returned object. The only SQL-derived values
    // allowed across this boundary are a 64-character hash and a fixed label.
    const classification = classifyQuery(dimensions.query);
    return { ...classification, executions: count(row.count), rowsRead: count(sums.rowsRead), rowsWritten: count(sums.rowsWritten) };
  }).sort((a, b) => b.rowsRead - a.rowsRead || a.shapeHash.localeCompare(b.shapeHash));
  return {
    inspection: 'read-only-d1-top-query-usage',
    observedAt: end,
    databaseId: databaseId.toLowerCase(),
    window: { startUtc: start, observedThroughUtc: end, currentDayIsPartial: true },
    dataset: 'd1QueriesAdaptiveGroups',
    requestCount: 2,
    bindingMatchesExpectedDatabase: true,
    queryLimit: MAX_GROUPS,
    topQuerySubsetOnly: true,
    selectedQueryRowsRead: count(rows.reduce((total, row) => total + row.rowsRead, 0)),
    rows,
    limitations: [
      'Top ten query groups only; this is not a database or account total.',
      'Adaptive analytics may be sampled or delayed and are not an exact billing receipt.',
      'Known categories are exact normalized-shape matches against the reviewed local Worker; they do not identify a user or calling application.',
      'Shape hashes remove literal values, numeric constants, bind names and comments; distinct server groups may therefore share a hash.',
      'Unknown shapes remain unclassified; no raw SQL is emitted or saved.',
      'Only the fixed Worker settings GET and this GraphQL query are performed; no SQL execution, app call, retry or permission change.'
    ]
  };
}

export async function runCli({ env = process.env, stdout = console.log, stderr = console.error, ...options } = {}) {
  try {
    const summary = await inspectD1TopQueries({ ...options, accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN, onBindingVerified: checkpoint => stdout(JSON.stringify(checkpoint)) });
    stdout(JSON.stringify(summary, null, 2));
    return 0;
  } catch (error) {
    stderr(safeInspectionError(error));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
