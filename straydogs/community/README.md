# StrayDogs community — isolated implementation branch

This directory prepares the real application form and email-code member access for the existing GitHub Pages site. It does not replace either live StrayDogs landing page. No fixture is published as an actual member.

## Deployment boundary

- Frontend: existing repository and GitHub Pages, `confluenceofminds.com`.
- Backend proposal: a separate StrayDogs Cloudflare Worker and D1 database. Never reuse RALUVAAA data, schema, sessions or deployment workflow.
- Email: existing verified Confluence of Minds domain on Resend. Runtime credentials are not read into local source.
- Read-only infrastructure check only. Resource creation, deployment and runtime secret configuration remain gated pending account/cost evidence and the precise activation approval.
- No ChatGPT Sites hosting. A GitHub branch does not create a second private Pages URL. Public assets are not a security boundary; member data must be checked server-side.

The first alpha can accept profile/project links. Real file uploads require an isolated private object store and additional content/permission checks; an image link is not an attachment upload.

## Implemented in this branch

- Bilingual responsive public shell and portfolio; no fictional profiles in the live bundle.
- Short application, public/private split, optional HTTPS visual link, preview, separate publication consent. Real API submission, not a simulated success.
- Email-code login for admitted members, eight-digit code, seven-day absolute HttpOnly cookie session with daily-on-return rotation, editable public profile pending review, immediate withdrawal and logout.
- Backend in `../member-api`: SQLite-backed security tests, transactional one-time OTP, bounded/indexed reads, rate limits, no polling, no public administrator endpoint.
- A nonconfigured backend disables send/sign-in and is visibly labelled. `runtime-config.js` intentionally has an empty public API origin until activation is approved and verified.

## Not yet live or complete

No resources or runtime secrets were created. No application was collected, no email sent, and no live landing page changed. The worker must be deployed and the endpoint configured before any real journey works online. A guarded manual D1 administration adapter is prepared, but its remote execution and transaction behaviour still need to be verified on the dedicated environment before real admissions can be operated. Uploads, work-round submissions, collaboration requests, account export/deletion and a full admin interface are not implemented; the live UI does not pretend otherwise.

Historical Workers Free evidence does not guarantee current available capacity. D1 quotas apply to the account, not independently to this new database. The first version does not poll: members load on initial view or a deliberate update; API lists are capped at 100. Do not enable a paid plan or paid overages as a fallback.

## Validation

Run with Node 24 or later:

```sh
node straydogs/community/qa-model.cjs
node straydogs/community/qa-events.cjs
node straydogs/community/qa-live-render.cjs
node --test straydogs/community/qa-api-client.cjs
(cd straydogs/member-api && npm test)
```

The first two tests exercise the reusable prototype model with explicitly fictional fixtures. Those fixtures are never loaded by `index.html`. `qa-live-render` checks the production adapter with an empty directory. `qa-browser.cjs` runs in GitHub Actions using a fake intercepted API and reserved `example.invalid` addresses; it does not send mail or provision services. Screenshot artifacts are labelled QA fixtures, not evidence of a deployed real member account.

`configure-endpoint.mjs` accepts only an HTTPS same-site origin under confluenceofminds.com, updates the public API URL and the CSP, and does not deploy or configure credentials. Leave the placeholder untouched until the dedicated backend is approved and smoke-tested.

Infrastructure evidence: read-only preflight run `39846186911`; configured account concordance `39848571644` / job `120068328294` was true. These were one-off checks. Subsequent UI CI is pull-request-only, has no provider credentials and sends no email. Historical plan evidence is not a live capacity guarantee.


## 23 October integration review

Synced with main after PR35, retaining all homepage, ChatMargin animation and Explorer changes. No landing-page replacement. Sign-in now prefers the member’s latest submitted profile name over the older admission name; browser QA covers this distinction. The completed one-off infrastructure preflight has been removed from active workflows to prevent an accidental repeat of a denied subscription read. No provider configuration is changed by this update.

## Session persistence update — 23 October

Reloading restores a server cookie rather than requesting another email. No raw token is returned to JS or browser storage. Exact-Origin/custom-header CSRF checks, Secure/HttpOnly/Strict host-only cookie, absolute expiry, bounded rotation grace and server logout revocation are covered in SQLite tests. Browser QA intercepts reserved HTTPS same-site origins and exercises actual Chromium cookie handling, reload, a second tab, expiry, failed logout and final logout. It is still synthetic API QA, not a Cloudflare/Resend deployment. The backend needs an explicitly approved same-site API hostname before activation; no DNS or service is provisioned here.
