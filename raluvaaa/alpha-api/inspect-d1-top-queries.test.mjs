import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { classifyQuery, inspectD1TopQueries, runCli, safeInspectionError } from './inspect-d1-top-queries.mjs';

const DATABASE = '572c4e83-d06e-4779-9763-c8895af33fa7';
const ACCOUNT = 'a'.repeat(32), TOKEN = 'PRIVATE-TOKEN-DO-NOT-LOG', PRIVATE = 'PRIVATE-WISH-EMAIL-SQL-DO-NOT-LOG';
const NOW = new Date('2026-10-16T13:41:00.000Z');
const AUTH = 'SELECT actor_id FROM sessions WHERE token_hash=?';
const FAMILY = 'WITH RECURSIVE family(id) AS (SELECT id FROM wishes WHERE id IN (?,?,?,?,?) UNION SELECT w.id FROM wishes w JOIN family f ON w.parent_wish_id=f.id OR w.root_wish_id=f.id OR w.lineage_id=f.id) SELECT w.id,w.owner_actor_id,w.room_key,w.root_wish_id,w.lineage_id,w.parent_wish_id,w.kind FROM wishes w JOIN family f ON f.id=w.id';
const group = (query = AUTH, overrides = {}) => ({ dimensions: { query, identity: PRIVATE }, count: 100, sum: { rowsRead: 10000, rowsWritten: 0 }, private: PRIVATE, ...overrides });
const payload = (groups = [group()]) => ({ data: { viewer: { accounts: [{ d1QueriesAdaptiveGroups: groups, token: TOKEN }] } }, extensions: { account: ACCOUNT, private: PRIVATE } });
const response = data => new Response(JSON.stringify(data));
const settings = (bindings = [{ name: 'DB', type: 'd1', id: DATABASE }, { name: 'AUTH_CODE_SECRET', type: 'secret_text', value: TOKEN }, { name: 'PRIVATE_VAR', type: 'plain_text', text: PRIVATE }]) => ({ success: true, errors: [], result: { bindings, private: PRIVATE } });
const bindingThen = fetchImpl => (url, options) => options.method === 'GET' ? Promise.resolve(response(settings())) : fetchImpl(url, options);
const inspect = fetchImpl => inspectD1TopQueries({ fetchImpl: bindingThen(fetchImpl), accountId: ACCOUNT, token: TOKEN, databaseId: DATABASE, now: NOW });
const cli = fetchImpl => {
  const output = [], errors = [];
  return runCli({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN, D1_USAGE_DATABASE_ID: DATABASE }, fetchImpl: bindingThen(fetchImpl), now: NOW, stdout: text => output.push(text), stderr: text => errors.push(text) }).then(code => ({ code, output, errors }));
};
const assertPrivate = value => {
  for (const secret of [ACCOUNT, TOKEN, PRIVATE, AUTH, FAMILY]) assert(!JSON.stringify(value).includes(secret));
};

const checkpoint = { inspection: 'read-only-worker-db-association', worker: 'raluvaaa-alpha-api', databaseId: DATABASE, matched: true };
const assertCheckpointOnly = output => { assert.equal(output.length, 1); assert.deepEqual(JSON.parse(output[0]), checkpoint); assertPrivate(output); };

test('after binding verification, one fixed top-ten GraphQL query targets the pinned UUID and today only', async () => {
  const calls = [];
  const summary = await inspect(async (url, options) => { calls.push({ url, options }); return response(payload()); });
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
  assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
  assert(options.signal instanceof AbortSignal);
  assert.equal(options.headers.authorization, 'Bearer ' + TOKEN);
  const body = JSON.parse(options.body);
  assert.deepEqual(body.variables, { accountTag: ACCOUNT, filter: { AND: [{ datetimeHour_geq: '2026-10-16T00:00:00.000Z', datetimeHour_leq: NOW.toISOString(), databaseId: DATABASE }] } });
  assert.match(body.query, /^query D1TopQueryUsage\(\$accountTag: string, \$filter: ZoneWorkersRequestsFilter_InputObject\)/);
  assert.match(body.query, /filter: \$filter/);
  assert.match(body.query, /limit: 10/);
  assert.match(body.query, /orderBy: \[sum_rowsRead_DESC\]/);
  assert.match(body.query, /dimensions \{ query \}/);
  assert.match(body.query, /sum \{ rowsRead rowsWritten \}/);
  assert.doesNotMatch(body.query, /\bmutation\b|\bSELECT\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b/);
  assert.equal(summary.rows[0].category, 'session-authentication');
  assert.equal(summary.rows[0].knownShape, true);
  assert.equal(summary.rows[0].executions, 100);
  assert.match(summary.rows[0].shapeHash, /^[0-9a-f]{64}$/);
  assert.equal(summary.topQuerySubsetOnly, true);
  assert.equal(summary.requestCount, 2);
  assert.equal(summary.bindingMatchesExpectedDatabase, true);
  assertPrivate(summary);
});

test('recursive family is an exact normalized-shape match', () => {
  assert.equal(classifyQuery(FAMILY).category, 'qa-recursive-family');
  assert.equal(classifyQuery(' /* private comment */ ' + FAMILY.toLowerCase() + '; -- private').category, 'qa-recursive-family');
  assert.equal(classifyQuery(FAMILY.replace(' UNION SELECT w.id', ' UNION ALL SELECT w.id')).category, 'other-or-unrecognized');
});

test('literals, bind names, comments and numeric values do not enter hashes', () => {
  const target = classifyQuery(AUTH);
  for (const sql of [
    AUTH.replace('?', "'" + PRIVATE + "'"),
    AUTH.replace('?', ':private_name'), AUTH.replace('?', '@private_name'), AUTH.replace('?', '$private_name'), AUTH.replace('?', '?234'),
    AUTH.replace('?', '12345'), AUTH.replace('?', '0x123abc'), AUTH.replace('?', '1.234e+5'),
    AUTH + ' /* ' + PRIVATE + ' */', AUTH + ' -- ' + PRIVATE,
    AUTH.replace('?', "'embedded '' quote /* -- " + PRIVATE + "'")
  ]) assert.deepEqual(classifyQuery(sql), target);
  assert.equal(classifyQuery('SELECT "secret one" FROM unusual').shapeHash, classifyQuery('SELECT "secret two" FROM unusual').shapeHash);
  assert.equal(classifyQuery('SELECT `secret one` FROM unusual').shapeHash, classifyQuery('SELECT `secret two` FROM unusual').shapeHash);
  assertPrivate(target);
});

test('unknown query returns a fixed label and hash without exposing text', async () => {
  const result = await cli(async () => response(payload([group("SELECT '" + PRIVATE + "' FROM unfamiliar_table")])));
  assert.equal(result.code, 0); assert.equal(result.output.length, 2); assert.equal(result.errors.length, 0);
  const row = JSON.parse(result.output.at(-1)).rows[0];
  assert.equal(row.category, 'other-or-unrecognized'); assert.equal(row.knownShape, false);
  assert.deepEqual(Object.keys(row), ['shapeHash', 'category', 'knownShape', 'executions', 'rowsRead', 'rowsWritten']);
  assertPrivate(result);
  assert.doesNotMatch(result.output.at(-1), /unfamiliar_table|"query"|"private"|"extensions"|"accountTag"/);
});

test('HTTP access errors stop once without reading bodies', async () => {
  for (const status of [401, 403, 429, 500, 302]) {
    let calls = 0, read = false;
    const result = await cli(async () => { calls++; return { ok: false, status, get body() { read = true; throw new Error(TOKEN); } }; });
    assert.equal(calls, 1); assert.equal(read, false); assert.equal(result.code, 1); assertCheckpointOnly(result.output); assertPrivate(result);
  }
});

test('GraphQL errors suppress partial data and raw details', async () => {
  for (const errors of [[{ message: TOKEN + PRIVATE }], PRIVATE, {}]) {
    const result = await cli(async () => response({ ...payload(), errors }));
    assert.equal(result.code, 1); assertCheckpointOnly(result.output); assertPrivate(result);
  }
});

test('malformed shapes, count types, SQL and response structures fail closed', async () => {
  const invalid = [null, {}, { data: null }, { data: { viewer: { accounts: [] } } }, payload([null]),
    payload([group(null)]), payload([group('')]), payload([group("SELECT '" + PRIVATE)]), payload([group('SELECT 1 /* ' + PRIVATE)]),
    payload([group('SELECT 🚨')]), payload([group('x'.repeat(65537))]), payload([group(AUTH, { count: '100' })]),
    payload([group(AUTH, { count: -1 })]), payload([group(AUTH, { sum: { rowsRead: 1.5, rowsWritten: 0 } })]),
    payload([group(AUTH, { sum: { rowsRead: Number.MAX_SAFE_INTEGER + 1, rowsWritten: 0 } })]),
    payload(Array.from({ length: 11 }, () => group()))];
  for (const data of invalid) {
    const result = await cli(async () => response(data));
    assert.equal(result.code, 1); assertCheckpointOnly(result.output); assertPrivate(result);
  }
});

test('network, timeout, JSON and stream errors suppress all raw details', async () => {
  for (const fetchImpl of [async () => { throw new Error(TOKEN); }, async () => { throw new DOMException(TOKEN, 'TimeoutError'); },
    async () => new Response(PRIVATE), async () => ({ ok: true, body: new ReadableStream({ start(c) { c.error(new Error(TOKEN)); } }) })]) {
    const result = await cli(fetchImpl); assert.equal(result.code, 1); assertCheckpointOnly(result.output); assertPrivate(result);
  }
  assert.equal(safeInspectionError(new Error(TOKEN)), 'D1 analytics inspection failed; details suppressed');
});

test('ten results remain explicitly a subset and never trigger pagination', async () => {
  let calls = 0;
  const result = await cli(async () => { calls++; return response(payload(Array.from({ length: 10 }, () => group()))); });
  assert.equal(calls, 1); assert.equal(result.code, 0);
  const summary = JSON.parse(result.output.at(-1));
  assert.equal(summary.rows.length, 10); assert.equal(summary.topQuerySubsetOnly, true); assert.equal(summary.selectedQueryRowsRead, 100000);
});

test('oversized response is cancelled; missing target makes no call', async () => {
  let cancelled = false;
  const result = await cli(async () => ({ ok: true, body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(768 * 1024 + 1)); }, cancel() { cancelled = true; } }) }));
  assert.equal(result.code, 1); assert.equal(cancelled, true); assertCheckpointOnly(result.output); assertPrivate(result);
  let calls = 0;
  for (const databaseId of [null, '', PRIVATE, '11111111-1111-4111-8111-111111111111']) {
    await assert.rejects(() => inspectD1TopQueries({ accountId: ACCOUNT, token: TOKEN, databaseId, fetchImpl: async () => { calls++; } }));
  }
  assert.equal(calls, 0);
});

test('workflow is fixed-repository/branch/path gated with credentials only in the last step', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/check-raluvaaa-d1-top-queries.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(pull_request|schedule|workflow_run):/m);
  assert.match(workflow, /push:\n    branches:\n      - 'inspect\/d1-query-usage-20261016'/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/inspect\/d1-query-usage-20261016' && github.repository == 'thomasjudes-del\/confluenceofminds-site'/);
  assert.equal((workflow.match(/      - '(?:\.github|raluvaaa)\//g) || []).length, 3);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert(workflow.indexOf('node --test') < workflow.indexOf('CLOUDFLARE_API_TOKEN:'));
  assert.doesNotMatch(workflow, /npm |npx |wrangler|upload-artifact|curl|wget|D1_USAGE_DATABASE_ID/);
});

test('known GraphQL access and schema failures are distinguished without raw text', async () => {
  for (const [message, expected] of [
    ['Unauthorized ' + TOKEN, 'Analytics authentication rejected (GraphQL); stop without changing credentials or permissions'],
    ['does not have access to the path ' + PRIVATE, 'Analytics access denied (GraphQL); stop without changing credentials or permissions'],
    ['unknown field ' + PRIVATE, 'Analytics schema/query validation failed (GraphQL); no retry performed']
  ]) {
    const result = await cli(async () => response({ ...payload(), errors: [{ message }] }));
    assert.equal(result.code, 1); assertCheckpointOnly(result.output); assert.deepEqual(result.errors, [expected]); assertPrivate(result);
  }
});


test('exact settings GET precedes analytics and only the UUID/match leave the binding boundary', async () => {
  const calls = [];
  const result = await runCli({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN, D1_USAGE_DATABASE_ID: 'ignored-hostile-value' }, now: NOW,
    fetchImpl: async (url, options) => { calls.push({ url, options }); return response(calls.length === 1 ? settings() : payload()); },
    stdout: text => { assertPrivate(text); assert.doesNotMatch(text, /AUTH_CODE_SECRET|PRIVATE_VAR|"bindings"|ignored-hostile-value/); },
    stderr: () => assert.fail('unexpected error')
  });
  assert.equal(result, 0); assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT + '/workers/scripts/raluvaaa-alpha-api/settings');
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.redirect, 'error'); assert(!('body' in calls[0].options));
  assert(calls[0].options.signal instanceof AbortSignal);
  assert.equal(calls[1].url, 'https://api.cloudflare.com/client/v4/graphql'); assert.equal(calls[1].options.method, 'POST');
});

test('missing, ambiguous, wrong-type and mismatched DB bindings stop before analytics', async () => {
  const invalid = [
    settings([]), settings([{ name: 'OTHER', type: 'd1', id: DATABASE }]),
    settings([{ name: 'DB', type: 'plain_text', text: DATABASE }]),
    settings([{ name: 'DB', type: 'd1', id: '11111111-1111-4111-8111-111111111111' }]),
    settings([{ name: 'DB', type: 'd1', id: PRIVATE }]),
    settings([{ name: 'DB', type: 'd1', id: DATABASE }, { name: 'DB', type: 'd1', id: DATABASE }]),
    settings([null]), { success: false, errors: [{ message: PRIVATE }], result: { bindings: [] } },
    { ...settings(), errors: [{ message: PRIVATE }] }, { success: true, result: { bindings: {} } }
  ];
  for (const data of invalid) {
    let calls = 0; const output = [], errors = [];
    const code = await runCli({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN }, now: NOW,
      fetchImpl: async () => { calls++; return response(data); }, stdout: text => output.push(text), stderr: text => errors.push(text) });
    assert.equal(code, 1); assert.equal(calls, 1); assert.deepEqual(output, []); assertPrivate(errors);
  }
});

test('settings HTTP, network, stream and oversized failures never reach analytics or leak values', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 403, get body() { assert.fail('must not read denied body'); } }),
    async () => { throw new Error(TOKEN); }, async () => new Response(PRIVATE),
    async () => ({ ok: true, body: new ReadableStream({ start(c) { c.error(new Error(TOKEN)); } }) }),
    async () => new Response('x'.repeat(256 * 1024 + 1))
  ]) {
    let calls = 0; const output = [], errors = [];
    const code = await runCli({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN }, now: NOW,
      fetchImpl: async (...args) => { calls++; return fetchImpl(...args); }, stdout: text => output.push(text), stderr: text => errors.push(text) });
    assert.equal(code, 1); assert.equal(calls, 1); assert.deepEqual(output, []); assertPrivate(errors);
  }
});


test('a validated binding checkpoint survives later GraphQL failure and precedes that request', async () => {
  const output = [], errors = []; let calls = 0;
  const code = await runCli({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN }, now: NOW,
    fetchImpl: async () => {
      calls++;
      if (calls === 1) { assert.deepEqual(output, []); return response(settings()); }
      assertCheckpointOnly(output);
      return response({ errors: [{ message: 'does not have access to the path ' + PRIVATE }], data: null });
    }, stdout: text => output.push(text), stderr: text => errors.push(text) });
  assert.equal(code, 1); assert.equal(calls, 2); assertCheckpointOnly(output);
  assert.deepEqual(errors, ['Analytics access denied (GraphQL); stop without changing credentials or permissions']); assertPrivate(errors);
});
