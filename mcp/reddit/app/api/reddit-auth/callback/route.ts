import { verifyOAuthState } from '../../../../lib/oauth-state';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return new Response(`Reddit OAuth error: ${error}`, { status: 400 });
  if (!code || !state || !verifyOAuthState(state)) {
    return new Response('Invalid or expired OAuth callback', { status: 400 });
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const redirectUri = process.env.REDDIT_REDIRECT_URI;
  const userAgent = process.env.REDDIT_USER_AGENT;
  if (!clientId || !clientSecret || !redirectUri || !userAgent) {
    return new Response('Missing Reddit OAuth environment variables', { status: 503 });
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body,
    cache: 'no-store',
  });

  const tokenJson = await tokenResponse.json() as any;
  if (!tokenResponse.ok || !tokenJson.refresh_token) {
    return new Response(`Could not obtain Reddit refresh token: ${JSON.stringify(tokenJson)}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const escaped = String(tokenJson.refresh_token).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char] as string));

  return new Response(`<!doctype html><meta charset="utf-8"><title>Reddit connected</title><main style="font-family:system-ui;max-width:760px;margin:48px auto;padding:0 20px"><h1>Reddit authorization complete</h1><p>Copy this value into the Vercel environment variable <strong>REDDIT_REFRESH_TOKEN</strong>, then redeploy. Treat it like a password.</p><pre style="white-space:pre-wrap;word-break:break-all;padding:16px;background:#f4f4f4;border-radius:8px">${escaped}</pre><p>After saving it, this page is no longer needed.</p></main>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
