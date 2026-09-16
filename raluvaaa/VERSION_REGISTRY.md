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

Status: CURRENT WORKING PREVIEW FOR SEMANTIC/WORKFLOW VALIDATION.

Preview:

`https://confluenceofminds.com/raluvaaa/mvp-v24/`

Current complete preview head:

`9728c3c641527ed0ae17b11d2c68fdb938ade01d`

Contract:

`raluvaaa/MANUAL_MVP_V24.md`

Architecture:

`VISUAL-V03-LOCKED + coherent semantic simulation + manual Wisher/Helper workflows + local event log`

V24 deliberately contains no LLM and no MCP.

Manual Wisher actions:

- CREATE
- EVOLVE
- SPLIT
- BLOOM
- ABANDON
- REATTACH
- SHARE

Manual Helper actions:

- ENCOURAGE
- HELP
- CONNECT
- SHARE

The simulation starts from about 100 independent root wishes and generates coherent semantic histories with real changed text for evolutions, recursive splits, bloom, abandoned branches, help traces and a small number of warps.

The official `/raluvaaa/` route remains on V22 until V24 is semantically and visually reviewed.

## Future layers, not current MVP

### OPTIONAL LLM ASSISTANCE

May later propose structure/evolution/splits, always requiring human confirmation. Not implemented in V24.

### MCP / EXTERNAL LLM INTERFACE

May later expose the same event model to ChatGPT/Claude/other clients for read/update/exploration. Not implemented in V24.
