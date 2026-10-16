import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { inspectD1Usage, runCli, safeInspectionError } from './inspect-d1-usage.mjs';

const DATABASE = '11111111-1111-4111-8111-111111111111';
const OTHER_DATABASE = '22222222-2222-4222-8222-222222222222';
const ACCOUNT = 'a'.repeat(32);
const TOKEN = 'PRIVATE-TOKEN-DO-NOT-LOG';
const PRIVATE = 'PRIVATE-WISH-EMAIL-SQL-DO-NOT-LOG';
const NOW = new Date('2026-10-16T13:41:00.000Z');
const group = (overrides = {}) => ({ dimensions: { databaseId: DATABASE, date: '2026-10-16', query: PRIVATE }, sum: { rowsRead: 4250000, readQueries: 12000, rowsWritten: 50, writeQueries: 10 }, private: PRIVATE, ...overrides });
const payload = (groups = [group()]) => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: groups, token: TOKEN }] } }, extensions: { account: ACCOUNT, private: PRIVATE } });
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const inspect = fetchImpl => inspectD1Usage({ fetchImpl, accountId: ACCOUNT, token: TOKEN, now: NOW });
const cli = fetchImpl => {
  const output = [], errors = [];
  return runCli({ env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN }, fetchImpl, now: NOW, stdout: text => output.push(text), stderr: text => errors.push(text) }).then(code => ({ code, output, errors }));
};
const assertPrivate = value => {
  for (const secret of [ACCOUNT, TOKEN, PRIVATE]) assert(!JSON.stringify(value).includes(secret));
};

test('exactly one fixed-host GraphQL query, bounded dates, no SQL or mutations', async () => {
  const calls = [];
  const summary = await inspect(async (url, options) => { calls.push({ url, options }); return response(payload()); });
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
  assert.equal(options.method, 'POST');
  assert.equal(options.redirect, 'error');
  assert(options.signal instanceof AbortSignal);
  assert.equal(options.headers.authorization, 'Bearer ' + TOKEN);
  const body = JSON.parse(options.body);
  assert.deepEqual(body.variables, { accountTag: ACCOUNT, start: '2026-10-15', end: '2026-10-16' });
  assert.match(body.query, /^query D1UsageInventory\(/);
  assert.match(body.query, /limit: 200/);
  assert.match(body.query, /dimensions \{ databaseId date \}/);
  assert.match(body.query, /sum \{ rowsRead readQueries rowsWritten writeQueries \}/);
  assert.doesNotMatch(body.query, /\bmutation\b|d1Queries|\bquery\s*\{|\bSELECT\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b/);
  assert.deepEqual(summary.rows[0], { databaseId: DATABASE, date: '2026-10-16', rowsRead: 4250000, readQueries: 12000, rowsWritten: 50, writeQueries: 10 });
  assert.equal(summary.limitReached, false);
  assert.deepEqual(summary.dailyTotals[0], { date: '2026-10-15', recordsReturned: false });
  assertPrivate(summary);
});

test('safe whitelist applies to successful CLI output', async () => {
  const result = await cli(async () => response(payload()));
  assert.equal(result.code, 0);
  assert.equal(result.output.length, 1);
  assert.equal(result.errors.length, 0);
  assertPrivate(result);
  assert.doesNotMatch(result.output[0], /"query"|"private"|"extensions"|"accountTag"/);
});

test('HTTP access denial stops after one call without reading error body', async () => {
  for (const status of [401, 403, 429, 500, 302]) {
    let calls = 0, bodyRead = false;
    const result = await cli(async () => { calls++; return { ok: false, status, get body() { bodyRead = true; throw new Error(TOKEN); } }; });
    assert.equal(calls, 1);
    assert.equal(bodyRead, false);
    assert.equal(result.code, 1);
    assert.deepEqual(result.output, []);
    assertPrivate(result);
    if (status === 401 || status === 403) assert.match(result.errors[0], /access denied; stop without changing/);
  }
});

test('GraphQL errors suppress partial data and raw error details', async () => {
  for (const errors of [[{ message: TOKEN, extensions: { details: PRIVATE } }], PRIVATE, {}]) {
    const result = await cli(async () => response({ ...payload(), errors }));
    assert.equal(result.code, 1);
    assert.deepEqual(result.output, []);
    assertPrivate(result);
    assert.match(result.errors[0], /API rejected/);
  }
});

test('network, redirect, timeout, JSON and stream errors cannot print secrets', async () => {
  const failing = [
    async () => { throw new Error(TOKEN); },
    async () => { throw new DOMException(TOKEN, 'TimeoutError'); },
    async () => new Response(TOKEN),
    async () => ({ ok: true, body: new ReadableStream({ start(controller) { controller.error(new Error(TOKEN)); } }) })
  ];
  for (const fetchImpl of failing) {
    const result = await cli(fetchImpl);
    assert.equal(result.code, 1);
    assert.deepEqual(result.output, []);
    assertPrivate(result);
  }
  assert.equal(safeInspectionError(new Error(TOKEN)), 'D1 analytics inspection failed; details suppressed');
});

test('malformed, missing, duplicate and out-of-window groups fail closed', async () => {
  const invalid = [
    null, {}, { data: null }, { data: { viewer: { accounts: [] } } },
    { data: { viewer: { accounts: [{}, {}] } } },
    payload([null]), payload([group({ dimensions: { databaseId: PRIVATE, date: '2026-10-16' } })]),
    payload([group({ dimensions: { databaseId: DATABASE, date: '2026-10-14' } })]),
    payload([group(), group()]),
    payload([group({ sum: { rowsRead: -1 } })]),
    payload([group({ sum: { rowsRead: '4250000', readQueries: 1, rowsWritten: 1, writeQueries: 1 } })]),
    payload([group({ sum: { rowsRead: Number.MAX_SAFE_INTEGER + 1, readQueries: 1, rowsWritten: 1, writeQueries: 1 } })]),
    payload([group({ sum: { rowsRead: 1.5, readQueries: 1, rowsWritten: 1, writeQueries: 1 } })])
  ];
  for (const data of invalid) {
    const result = await cli(async () => response(data));
    assert.equal(result.code, 1);
    assert.deepEqual(result.output, []);
    assertPrivate(result);
  }
});

test('UTC boundary is used even if the input date carries a different timezone', async () => {
  let variables;
  await inspectD1Usage({ accountId: ACCOUNT, token: TOKEN, now: new Date('2026-10-15T23:30:00-07:00'), fetchImpl: async (_, options) => { variables = JSON.parse(options.body).variables; return response(payload([])); } });
  assert.deepEqual(variables, { accountTag: ACCOUNT, start: '2026-10-15', end: '2026-10-16' });
});

test('daily totals add only validated numeric aggregates', async () => {
  const summary = await inspect(async () => response(payload([group(), group({ dimensions: { databaseId: OTHER_DATABASE, date: '2026-10-16' } })])));
  assert.equal(summary.dailyTotals[1].rowsRead, 8500000);
  const result = await cli(async () => response(payload([group({ sum: { rowsRead: Number.MAX_SAFE_INTEGER, readQueries: 1, rowsWritten: 1, writeQueries: 1 } }), group({ dimensions: { databaseId: OTHER_DATABASE, date: '2026-10-16' } })])));
  assert.equal(result.code, 1);
  assert.deepEqual(result.output, []);
});

test('a full page is explicitly incomplete and never paginated', async () => {
  const groups = Array.from({ length: 200 }, (_, i) => group({ dimensions: { databaseId: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`, date: '2026-10-16' } }));
  let calls = 0;
  const result = await cli(async () => { calls++; return response(payload(groups)); });
  assert.equal(calls, 1);
  assert.equal(result.code, 2);
  assert.equal(JSON.parse(result.output[0]).limitReached, true);
  assert.equal((await cli(async () => response(payload([...groups, group({ dimensions: { databaseId: OTHER_DATABASE, date: '2026-10-16' } })])))).code, 1);
});

test('oversized response is rejected and cancelled', async () => {
  let cancelled = false;
  const result = await cli(async () => ({ ok: true, body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(256 * 1024 + 1)); }, cancel() { cancelled = true; } }) }));
  assert.equal(result.code, 1);
  assert.equal(cancelled, true);
  assert.deepEqual(result.output, []);
  assertPrivate(result);
});

test('missing credentials and invalid times never make a request', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not call'); };
  for (const overrides of [{ token: '' }, { accountId: TOKEN }, { token: TOKEN + '\n' }, { now: new Date('invalid') }]) {
    await assert.rejects(() => inspectD1Usage({ accountId: ACCOUNT, token: TOKEN, now: NOW, fetchImpl, ...overrides }));
  }
  assert.equal(calls, 0);
});

test('workflow is diagnostic-branch-only and credentials are scoped to the last step', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/check-raluvaaa-d1-usage.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(pull_request|schedule|workflow_run):/m);
  assert.match(workflow, /push:\n    branches:\n      - 'inspect\/d1-usage-local-20261016'/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/inspect\/d1-usage-local-20261016'/);
  assert.equal((workflow.match(/      - '(?:\.github|raluvaaa)\//g) || []).length, 3);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.equal((workflow.match(/CLOUDFLARE_API_TOKEN:/g) || []).length, 1);
  assert(workflow.indexOf('node --test') < workflow.indexOf('CLOUDFLARE_API_TOKEN:'));
  assert.match(workflow, /      - name: Read two UTC days of aggregate D1 analytics once\n        env:/);
  assert.doesNotMatch(workflow, /npm |npx |wrangler|upload-artifact|curl|wget/);
});


test('documented GraphQL authentication/permission errors get fixed safe blockers', async () => {
  for (const [message, expected] of [
    ['Unauthorized ' + TOKEN, 'Analytics authentication rejected (GraphQL); stop without changing credentials or permissions'],
    ['not authorized for that account ' + ACCOUNT, 'Analytics access denied (GraphQL); stop without changing credentials or permissions'],
    ['zones [' + PRIVATE + '] are not authorized', 'Analytics access denied (GraphQL); stop without changing credentials or permissions'],
    ['does not have access to the path ' + PRIVATE, 'Analytics access denied (GraphQL); stop without changing credentials or permissions']
  ]) {
    const result = await cli(async () => response({ ...payload(), errors: [{ message, path: [PRIVATE], extensions: { secret: TOKEN } }] }));
    assert.equal(result.code, 1); assert.deepEqual(result.output, []);
    assert.deepEqual(result.errors, [expected]); assertPrivate(result);
  }
});

test('documented GraphQL schema errors are distinct; unknown/mixed errors stay generic', async () => {
  for (const message of ['unknown field ' + PRIVATE, 'Cannot query field ' + PRIVATE, 'error parsing args ' + PRIVATE]) {
    const result = await cli(async () => response({ ...payload(), errors: [{ message }] }));
    assert.equal(result.code, 1); assert.deepEqual(result.output, []);
    assert.deepEqual(result.errors, ['Analytics schema/query validation failed (GraphQL); no retry performed']); assertPrivate(result);
  }
  for (const errors of [[{ message: PRIVATE }], [{ message: 'unknown field ' + PRIVATE }, { message: 'not authorized for that account ' + ACCOUNT }]]) {
    const result = await cli(async () => response({ ...payload(), errors }));
    assert.equal(result.code, 1); assert.deepEqual(result.output, []);
    assert.deepEqual(result.errors, ['Analytics API rejected the query; error details suppressed']); assertPrivate(result);
  }
});
