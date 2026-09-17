# RALUVAAA version registry

This is the permanent restore map for RALUVAAA. Visual versions and product/semantic versions are tracked separately.

## Permanent versioning rule

For every material iteration, record:

- visual baseline;
- product/semantic layer;
- exact Git commit SHA;
- preview/public URL;
- validation status;
- restore branch when relevant.

Never silently change a validated visual baseline while implementing product logic.

## VISUAL-V03-REFERENCE

Status: VALIDATED graphical reference.

Reference URLs:

- `https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/preview/v03/index.html`
- `https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/preview/v03/index.html?test=1`

Snapshot commit:

`17714b78996183fdb3aa8080cf76df9ccf72d140`

Exact engine blob:

`a961308b1811015afad015641ecadfeafea1ee69`

Restore branch:

`archive/raluvaaa-v03-visual-reference`

The V03 visual language includes the approved organic lineages, palette, halos, density/performance balance, pan/zoom and minimap.

## PRODUCT-V20

Status: functional product reference, NOT a visual reference.

Preview:

`https://confluenceofminds.com/raluvaaa-wish-classic/?build=v20-20260913-1135`

Commit:

`63f17937942efec7670d310893a5b317ccf7cb2a`

Restore branch:

`archive/raluvaaa-v20-product-demo`

Key product elements: seeded wishes, Entrusted to you, World Pulse, My World, create/release wish, wish detail, ENCOURAGE, HELP, CONNECT, PIVOT, SPLIT, BLOOM, LET GO, SHARE, Report, FR/EN, local persistence.

## V21 FIREWORK EXPERIMENT

Status: REJECTED visual experiment.

Commit:

`188541a87644e4414e468f4143c94d7a666469a1`

Restore branch:

`archive/raluvaaa-v21-firework`

Reason: excessive density/load and a firework effect that diverged from the validated V03 reference.

## V22 OFFICIAL PRODUCT-ON-V03

Status: CURRENT VALIDATED GRAPHICAL PRODUCT BASELINE.

Public URL:

`https://confluenceofminds.com/raluvaaa/`

Integration commit:

`cabbec0d2312e488ef2f9c29cbcd95bf37add589`

Restore branches:

- `archive/raluvaaa-v22-v03-product-layer`
- `archive/raluvaaa-v22-before-semantic-v23`

Architecture:

`VISUAL-V03-REFERENCE + PRODUCT-V20 layer`

Thomas explicitly validated the graphics of this build. Its remaining problem is semantic: wishes are still partly mapped onto a pre-existing graphical world rather than generating their own meaningful lineage histories.

## SEMANTIC-V23

Status: USEFUL EXPERIMENT, NOT VALIDATED AS PRODUCT MODEL.

Preview:

`https://confluenceofminds.com/raluvaaa/semantic-v23/`

Contract:

`raluvaaa/SEMANTIC_GRAPH_V23.md`

What it proved:

- one root wish can become one lineage;
- semantic splits, bloom, abandonment, help traces and warps can be rendered with the V03 language.

Why it is superseded:

- repeated parent/child text;
- fake pivot/evolution semantics created to justify geometry;
- too much explanatory/debug UI;
- incomplete Wisher/Helper product actions.

Do not promote V23 to the official route.

## MANUAL-MVP-V24

Status: SUPERSEDED WORKING PREVIEW, retained for comparison.

Preview:

`https://confluenceofminds.com/raluvaaa/mvp-v24/`

Complete preview head:

`9728c3c641527ed0ae17b11d2c68fdb938ade01d`

Contract:

`raluvaaa/MANUAL_MVP_V24.md`

Architecture:

`VISUAL-V03-LOCKED + coherent semantic simulation + manual Wisher/Helper workflows + local event log`

V24 established the manual event model but exposed workflow gaps found during real testing: revisiting an already split node could not add one branch, correction was confused with abandonment, Reattach was selector-only, Bloom generated decorative branch geometry, and helper branch suggestions / lineage focus were absent.

## MANUAL-MVP-V25 / V25.1

Status: SUPERSEDED WORKING PREVIEW, retained as the immediate predecessor of V26.

Preview:

`https://confluenceofminds.com/raluvaaa/mvp-v25/`

V25.1 validated implementation head:

`b2245e0bba1391d8737922b5aae60f59ef433684`

Contract:

`raluvaaa/MANUAL_MVP_V25.md`

Architecture:

`VISUAL-V03-LOCKED + semantic wish histories + manual Wisher/Helper workflows + local event log`

Key V25/V25.1 changes included ADD BRANCH after an existing split, terminal BLOOM without fake child growth, ABANDON versus REMOVE MISTAKE, REATTACH including drag/drop, lineage focus, stronger real-user ENCOURAGE, SUGGEST A BRANCH, consent-first CONNECT, and compact side-rail navigation.

## MANUAL-MVP-V26 PRE-ALPHA

Status: CURRENT TECHNICAL PRE-ALPHA CANDIDATE. Dedicated V26 browser QA: PASSED.

Review URLs:

- Person A: `https://confluenceofminds.com/raluvaaa/mvp-v26/?actor=A`
- Person B: `https://confluenceofminds.com/raluvaaa/mvp-v26/?actor=B`

Important: A and B are deterministic personas sharing the same browser-origin local storage. They validate the product state machine, notification semantics and consent logic, but they are not independent real users on a shared backend.

Technical green baseline:

`1bf0443e26599efc192ccaf26d09b7b364ff3b50`

Restore branch:

`archive/raluvaaa-v26-alpha-candidate`

Architecture:

`VISUAL-V03-LOCKED + semantic manual MVP + local A/B consent sandbox + alpha hardening layer`

V26 dedicated browser QA covers:

- CREATE / EVOLVE / SPLIT / later ADD BRANCH;
- REATTACH;
- BLOOM / ABANDON / correction of an accidental item;
- SHARE;
- ENCOURAGE limited to one per actor and wish;
- HELP, SUGGEST A BRANCH and CONNECT as proposals;
- A -> B notifications and recipient consent before materialisation;
- lineage focus;
- reset returning to V26 rather than an older build;
- FR/EN;
- desktop and compact mobile technical layout checks.

The previous integration-only Canvas `createRadialGradient` non-finite blocker was hardened without modifying the archived V03 source.

Entrusted wishes are again explicitly temporal and non-personalized, with three distinct bands in the alpha surface:

- short: approximately 3–8 hours, urgent/red;
- medium: approximately 18–30 hours, intermediate/amber;
- long: approximately 60–84 hours, calm/green.

Expiry replaces the slot without deleting the wish from the world.

For clearer first-use navigation, the private surface previously called `Mon monde / My world` is presented as `Mes wishes / My wishes` in this sandbox.

Supporting alpha documents live in `raluvaaa/mvp-v26/`, including `QA_MATRIX.md`, `ALPHA_LAUNCH_CHECKLIST.md`, `ALPHA_COMMS_DRAFT.md`, `ALPHA_CONTACT_SHEET.md` and `ALPHA_GATE_GREEN.md`.

The official `/raluvaaa/` route intentionally remains on V22 while Thomas completes manual UX review.

## SHARED-ALPHA BACKEND SCAFFOLD V1

Status: CODE + SCHEMA + BROWSER CLIENT READY AND CI-VALIDATED, NOT DEPLOYED TO CLOUDFLARE YET.

Directory:

`raluvaaa/alpha-api/`

Latest validated code/client head:

`fbbcc50756f591693dfbc6a8c8e8ca4a5f854e28`

Restore branches:

- `archive/raluvaaa-alpha-api-scaffold-v1`
- `archive/raluvaaa-alpha-api-client-v1`

Stack:

- Cloudflare Worker;
- D1 schema;
- lightweight opaque anonymous session identity;
- shared wishes and wish events;
- encouragement uniqueness;
- proposal/consent state;
- notifications;
- reports;
- browser client `RaluvaaaAlphaClient`.

The Worker API is prepared for shared CREATE / EVOLVE / SPLIT / ADD BRANCH / BLOOM / ABANDON / REATTACH, one encouragement per human/wish, consent-based HELP / branch suggestions / CONNECT, inbox/notifications, reports and basic publication-scope filtering.

A true cross-browser alpha cannot be claimed until a real D1 database is created and the Worker is deployed in the project's Cloudflare account. Cloudflare credentials/account access are the current external deployment hard stop.

## Future layers, not current MVP

### OPTIONAL LLM ASSISTANCE

May later propose structure/evolution/splits, always requiring human confirmation. Not part of V26.

### MCP / EXTERNAL LLM INTERFACE

May later expose the same event model to ChatGPT/Claude/other clients for read/update/exploration. Not part of V26.
