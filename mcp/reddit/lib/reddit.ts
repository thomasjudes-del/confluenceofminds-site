const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_BASE = 'https://oauth.reddit.com';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function redditAccessToken(): Promise<string> {
  const clientId = required('REDDIT_CLIENT_ID');
  const clientSecret = required('REDDIT_CLIENT_SECRET');
  const refreshToken = required('REDDIT_REFRESH_TOKEN');

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': required('REDDIT_USER_AGENT'),
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Reddit token error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json() as { access_token?: string };
  if (!json.access_token) throw new Error('Reddit did not return an access token');
  return json.access_token;
}

export async function redditFetch(path: string, init: RequestInit = {}) {
  const token = await redditAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': required('REDDIT_USER_AGENT'),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Reddit API error ${response.status}: ${await response.text()}`);
  }
  return response;
}

export function postThingId(id: string): string {
  return id.startsWith('t3_') ? id : `t3_${id}`;
}

export function normalizePostId(input: string): string {
  if (input.startsWith('t3_')) return input.slice(3);
  const match = input.match(/\/comments\/([a-z0-9]+)(?:\/|$)/i);
  if (match) return match[1];
  return input.trim();
}
