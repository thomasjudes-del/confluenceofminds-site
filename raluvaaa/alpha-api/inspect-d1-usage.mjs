import { pathToFileURL } from 'node:url';

// Read-only Analytics API request. This never executes SQL or calls the app.
// Schema sources, checked 2026-10-16:
// https://developers.cloudflare.com/d1/observability/metrics-analytics/
// https://github.com/cloudflare/skills/blob/main/skills/cloudflare/references/graphql-api/patterns.md
// https://developers.cloudflare.com/d1/observability/billing/
// https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/
// Daily dimensions are documented by Cloudflare; an hourly schema is deliberately
// not guessed. Adaptive analytics are attribution evidence, not a billing receipt.
const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const MAX_GROUPS = 200;
const MAX_RESPONSE_BYTES = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METRICS = ['rowsRead', 'readQueries', 'rowsWritten', 'writeQueries'];
const QUERY = `query D1UsageInventory($accountTag: string!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      d1AnalyticsAdaptiveGroups(
        limit: 200
        filter: { date_geq: $start, date_leq: $end }
        orderBy: [date_DESC]
      ) {
        dimensions { databaseId date }
        sum { rowsRead readQueries rowsWritten writeQueries }
      }
    }
  }
}`;

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

async function readBoundedJson(response) {
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
      if (total > MAX_RESPONSE_BYTES) fail('Analytics response exceeded the safe size limit');
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

export async function inspectD1Usage({ fetchImpl = fetch, accountId, token, now = new Date() } = {}) {
  if (typeof accountId !== 'string' || !/^[0-9a-f]{32}$/i.test(accountId) || typeof token !== 'string' || !token || /[\r\n]/.test(token)) {
    fail('Existing Cloudflare credentials are missing or invalid');
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) fail('Invalid inspection time');
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 86400000).toISOString().slice(0, 10);
  const variables = { accountTag: accountId, start: yesterday, end: today };
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
  const groups = array(object(accounts[0]).d1AnalyticsAdaptiveGroups);
  if (groups.length > MAX_GROUPS) fail('Analytics group limit was exceeded');
  const seen = new Set();
  const rows = groups.map(raw => {
    const row = object(raw);
    const dimensions = object(row.dimensions);
    if (typeof dimensions.databaseId !== 'string' || !UUID.test(dimensions.databaseId)) fail('Invalid analytics database identifier');
    if (dimensions.date !== today && dimensions.date !== yesterday) fail('Analytics date was outside the approved two-day window');
    const databaseId = dimensions.databaseId.toLowerCase();
    const key = dimensions.date + '/' + databaseId;
    if (seen.has(key)) fail('Duplicate analytics group');
    seen.add(key);
    const sums = object(row.sum);
    return { databaseId, date: dimensions.date, ...Object.fromEntries(METRICS.map(metric => [metric, count(sums[metric])])) };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.rowsRead - a.rowsRead || a.databaseId.localeCompare(b.databaseId));
  const dailyTotals = [yesterday, today].map(date => {
    const dailyRows = rows.filter(row => row.date === date);
    // A missing group does not establish zero activity or complete ingestion.
    if (!dailyRows.length) return { date, recordsReturned: false };
    return { date, recordsReturned: true, ...Object.fromEntries(METRICS.map(metric => [metric, count(dailyRows.reduce((total, row) => total + row[metric], 0))])) };
  });
  return {
    inspection: 'read-only-d1-aggregate-usage',
    observedAt: now.toISOString(),
    window: { firstDateUtc: yesterday, lastDateUtc: today, currentDayIsPartial: true },
    dataset: 'd1AnalyticsAdaptiveGroups',
    granularity: 'database-per-UTC-day',
    requestCount: 1,
    limitReached: groups.length === MAX_GROUPS,
    dailyTotals,
    rows,
    limitations: [
      'Adaptive analytics are attribution evidence, not an exact billable-usage receipt.',
      'Current-day data may be partial or delayed; absent records do not establish zero use.',
      'At the group limit, totals are incomplete; no pagination or retry is performed.',
      'Database IDs alone do not establish which application caused the usage.',
      'Hourly grouping is not included because the primary D1 examples only verify daily dimensions.'
    ]
  };
}

export async function runCli({ env = process.env, stdout = console.log, stderr = console.error, ...options } = {}) {
  try {
    const summary = await inspectD1Usage({ ...options, accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN });
    stdout(JSON.stringify(summary, null, 2));
    return summary.limitReached ? 2 : 0;
  } catch (error) {
    stderr(safeInspectionError(error));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
