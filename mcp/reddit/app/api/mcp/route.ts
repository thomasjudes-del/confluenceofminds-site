// @ts-nocheck
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { normalizePostId, postThingId, redditFetch } from '../../../lib/reddit';

function asText(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'search_discussions',
      'Search Reddit for recent public discussions relevant to a topic. Use this to find a conversation worth contributing to, not to mass-promote links.',
      {
        query: z.string().min(2).max(300),
        subreddit: z.string().min(1).max(100).optional(),
        sort: z.enum(['relevance', 'new', 'comments', 'top']).default('relevance'),
        time: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).default('week'),
        limit: z.number().int().min(1).max(20).default(10),
      },
      async ({ query, subreddit, sort, time, limit }) => {
        const params = new URLSearchParams({
          q: query,
          sort,
          t: time,
          limit: String(limit),
          raw_json: '1',
          type: 'link',
        });
        if (subreddit) params.set('restrict_sr', '1');
        const path = subreddit
          ? `/r/${encodeURIComponent(subreddit)}/search.json?${params}`
          : `/search.json?${params}`;
        const response = await redditFetch(path);
        const json = await response.json() as any;
        const posts = (json?.data?.children || []).map((item: any) => {
          const p = item.data || {};
          return {
            thing_id: p.name,
            id: p.id,
            subreddit: p.subreddit,
            title: p.title,
            author: p.author,
            score: p.score,
            comments: p.num_comments,
            created_utc: p.created_utc,
            permalink: p.permalink ? `https://www.reddit.com${p.permalink}` : null,
            selftext: (p.selftext || '').slice(0, 1800),
          };
        });
        return asText({ query, subreddit: subreddit || null, posts });
      },
    );

    server.tool(
      'read_thread',
      'Read one Reddit discussion and the subreddit rules before drafting a useful reply. Accepts a Reddit URL, post ID, or t3_ thing ID.',
      {
        url_or_id: z.string().min(3).max(1000),
        comment_limit: z.number().int().min(1).max(50).default(20),
      },
      async ({ url_or_id, comment_limit }) => {
        const id = normalizePostId(url_or_id);
        const response = await redditFetch(`/comments/${encodeURIComponent(id)}.json?limit=${comment_limit}&depth=2&raw_json=1`);
        const json = await response.json() as any[];
        const post = json?.[0]?.data?.children?.[0]?.data || {};

        const topComments = (json?.[1]?.data?.children || [])
          .filter((c: any) => c.kind === 't1')
          .map((c: any) => ({
            thing_id: c.data?.name,
            author: c.data?.author,
            score: c.data?.score,
            body: (c.data?.body || '').slice(0, 2500),
          }));

        let rules: any[] = [];
        if (post.subreddit) {
          try {
            const rulesResponse = await redditFetch(`/r/${encodeURIComponent(post.subreddit)}/about/rules.json?raw_json=1`);
            const rulesJson = await rulesResponse.json() as any;
            rules = (rulesJson?.rules || []).map((r: any) => ({
              short_name: r.short_name,
              description: r.description,
              violation_reason: r.violation_reason,
            }));
          } catch {
            rules = [];
          }
        }

        return asText({
          post: {
            thing_id: post.name || postThingId(id),
            id: post.id || id,
            subreddit: post.subreddit,
            title: post.title,
            author: post.author,
            score: post.score,
            comments: post.num_comments,
            permalink: post.permalink ? `https://www.reddit.com${post.permalink}` : null,
            selftext: post.selftext || '',
          },
          subreddit_rules: rules,
          top_comments: topComments,
        });
      },
    );

    server.tool(
      'reply_to_thread',
      'Post one reply as the authenticated Reddit account. Use only after reading the thread and subreddit rules. The reply should contribute to the conversation first and avoid repetitive or unsolicited promotion.',
      {
        thing_id: z.string().regex(/^t[13]_[a-z0-9]+$/i, 'Use a Reddit post/comment thing ID such as t3_abc or t1_xyz'),
        text: z.string().min(1).max(10000),
      },
      async ({ thing_id, text }) => {
        const body = new URLSearchParams({
          api_type: 'json',
          thing_id,
          text,
          raw_json: '1',
        });
        const response = await redditFetch('/api/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const json = await response.json() as any;
        const errors = json?.json?.errors || [];
        if (errors.length) throw new Error(`Reddit rejected comment: ${JSON.stringify(errors)}`);
        const data = json?.json?.data || {};
        return asText({
          posted: true,
          thing_id: data?.things?.[0]?.data?.name || null,
          permalink: data?.things?.[0]?.data?.permalink
            ? `https://www.reddit.com${data.things[0].data.permalink}`
            : null,
        });
      },
    );
  },
  {},
  { basePath: '/api' },
);

async function guarded(request: Request) {
  const configured = process.env.MCP_API_KEY;
  if (!configured) return new Response('MCP_API_KEY is not configured', { status: 503 });
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${configured}`) return new Response('Unauthorized', { status: 401 });
  return handler(request);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
