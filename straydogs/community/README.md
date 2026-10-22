# StrayDogs community — isolated implementation branch

This directory prepares the real application form and email-code member access for the existing GitHub Pages site. It does not replace either live StrayDogs landing page. No fixture is published as an actual member.

## Deployment boundary

- Frontend: existing repository and GitHub Pages, `confluenceofminds.com`.
- Backend proposal: a separate StrayDogs Cloudflare Worker and D1 database. Never reuse RALUVAAA data, schema, sessions or deployment workflow.
- Email: existing verified Confluence of Minds domain on Resend. Runtime credentials are not read into local source.
- Read-only infrastructure check only. Resource creation, deployment and runtime secret configuration remain gated pending account/cost evidence and the precise activation approval.
- No ChatGPT Sites hosting. A GitHub branch does not create a second private Pages URL. Public assets are not a security boundary; member data must be checked server-side.

The first alpha can accept profile/project links. Real file uploads require an isolated private object store and additional content/permission checks; an image link is not an attachment upload.
