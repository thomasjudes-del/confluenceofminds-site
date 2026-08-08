import { createOAuthState } from '../../../../lib/oauth-state';

export async function GET() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const redirectUri = process.env.REDDIT_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return new Response('Missing REDDIT_CLIENT_ID or REDDIT_REDIRECT_URI', { status: 503 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state: createOAuthState(),
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: 'identity read submit',
  });

  return Response.redirect(`https://www.reddit.com/api/v1/authorize?${params.toString()}`, 302);
}
