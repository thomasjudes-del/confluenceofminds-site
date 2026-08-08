import crypto from 'node:crypto';

function secret() {
  const value = process.env.REDDIT_OAUTH_STATE_SECRET;
  if (!value) throw new Error('Missing environment variable: REDDIT_OAUTH_STATE_SECRET');
  return value;
}

export function createOAuthState() {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', secret()).update(ts).digest('hex');
  return `${ts}.${sig}`;
}

export function verifyOAuthState(state: string) {
  const [ts, sig] = state.split('.');
  if (!ts || !sig) return false;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > 15 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', secret()).update(ts).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
