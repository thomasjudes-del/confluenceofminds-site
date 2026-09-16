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

Status: CURRENT WORKING PREVIEW FOR MANUAL WORKFLOW VALIDATION. Dedicated CI: PASSED.

Preview:

`https://confluenceofminds.com/raluvaaa/mvp-v25/`

V25.1 validated implementation head before this registry update:

`b2245e0bba1391d8737922b5aae60f59ef433684`

Contract:

`raluvaaa/MANUAL_MVP_V25.md`

Architecture:

`VISUAL-V03-LOCKED + semantic wish histories + manual Wisher/Helper workflows + local event log`

V25 deliberately contains no LLM and no MCP.

Key V25 workflow changes:

- first SPLIT creates at least two branches;
- revisiting an already split node exposes ADD BRANCH and allows one or more additional children while preserving existing branches;
- one semantic state has at most one direct EVOLVE continuation;
- BLOOM is terminal and renders flowering at the same endpoint, with no generated child branch;
- ABANDON preserves a real historical path;
- REMOVE MISTAKE is explicitly different from ABANDON and can rewrite local sandbox events to remove an accidental node/subtree;
- REATTACH works both through a fallback parent selector and direct node drag/drop inside the owner's lineage;
- LINEAGE FOCUS hides unrelated lineages while retaining relevant connected warps/endpoints;
- a genuine local ENCOURAGE is deliberately much more visible while the real-user population is tiny;
- HELP remains a concrete contribution;
- SUGGEST A BRANCH records a human helper's proposed micro-step without changing another person's lineage.

V25.1 hardening after live testing:

- ENCOURAGE is idempotent per local human/session and wish, so repeated clicks cannot manufacture unlimited encouragements;
- public encouragement counts are not shown in the wish detail;
- CONNECT is now a proposal first, represented by `connect_proposed`;
- each relevant wisher controls consent for their own wish through `connect_accept` or `connect_decline`;
- the durable `connect` event and visual warp are materialized only after all required consents exist;
- owned wishes may also initiate a connection proposal;
- a private Inbox surface now holds connection approvals and is the future home for HELP offers and branch suggestions;
- Entrusted wishes, Inbox, My world and Release a wish moved into a compact collapsible side rail/drawer;
- permanent bottom navigation was removed to protect map visibility, especially on mobile;
- redundant renderer plus/minus navigation controls are hidden, leaving wheel, trackpad, pinch and pan as the primary navigation mechanisms.

Dedicated validation checks JavaScript syntax, V03 visual lock, the semantic event contract, connection consent primitives, single-encouragement protection, side-rail navigation and that Bloom no longer calls the growth primitive to create fake descendants.

The official `/raluvaaa/` route intentionally remains on V22 until the V25 manual workflow is reviewed in-browser and judged ready to replace the semantic/product layer.

## Future layers, not current MVP

### OPTIONAL LLM ASSISTANCE

May later propose structure/evolution/splits, always requiring human confirmation. Not implemented in V25.

### MCP / EXTERNAL LLM INTERFACE

May later expose the same event model to ChatGPT/Claude/other clients for read/update/exploration. Not implemented in V25.
