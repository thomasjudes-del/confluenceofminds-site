# RALUVAAA MANUAL MVP V26

## Purpose

V26 is a QA sandbox before any promotion to the official `/raluvaaa/` route.

It exists to harden three things that V25/V25.1 still left too fragile:

1. every visible action must actually work end to end;
2. multi-human consent and notifications must be testable with two distinct test wishers;
3. desktop and mobile navigation must preserve the world instead of covering it with bottom bars and overlapping panels.

The official route remains unchanged while V26 is under validation.

## Visual baseline

V26 keeps the approved V03 engine. It does not load the rejected V18/V19/V20/V21 renderer overrides.

The graph remains a consequence of semantic events. V26 changes product shell, workflow state and QA mechanics, not the validated visual language.

## Test personas

The preview contains two explicit local test personas:

- Person A
- Person B

They share the same local event log but own different lineages. Switching persona simulates another human opening the same shared world.

The sandbox seeds one coherent wish lineage for each persona so that connection, help, suggestion and notification workflows can be tested without a real backend yet.

This switcher is QA-only and must not become part of the public product UI.

## Consent model

### ENCOURAGE

One encouragement per actor and wish. No consent required. No public like counter.

### HELP

HELP is now a proposal first.

Flow:

`helper proposes -> wisher receives notification -> accept/decline -> accepted help becomes a durable visual contribution`

An unsolicited offer does not immediately grow the other person's lineage.

### SUGGEST A BRANCH

A helper may suggest one or more smaller steps.

Flow:

`helper proposes -> wisher receives notification -> accept/decline -> accepted suggestion creates the branch(es)`

The helper never edits another person's lineage directly.

### CONNECT

CONNECT is a consented cross-lineage relation.

A warp appears only after every required wisher has accepted.

If a wisher proposes a connection involving their own wish, their own side is considered consented by that action; the other wisher still needs to accept.

A third-party proposal between two other wishes would require both wishers to consent.

A refusal creates no public warp.

## Navigation model

V26 uses one narrow right-side rail instead of persistent bottom controls.

The rail opens one contextual side drawer for:

- entrusted wishes;
- notifications;
- My World;
- selected wish details.

Creating a wish remains a compact plus action.

On mobile the rail remains lateral. The drawer slides beside it and leaves a strip of the world visible instead of consuming a large bottom area.

The historical engine zoom buttons remain hidden because wheel, trackpad, pinch and pan already provide navigation.

## Lineage focus

`Focus lineage / Voir la lignée` is treated as a real mode, not just a camera nudge.

When activated:

- unrelated lineages are hidden by the semantic renderer;
- the selected lineage is fitted in view;
- relevant cross-lineage warps/endpoints remain visible;
- a persistent top mode chip names the focused lineage and provides an explicit exit action.

Browser QA checks that the visible canvas complexity drops materially when lineage focus is entered.

## Reset rule

V26 has its own storage key:

`raluvaaaManualMvpV26`

Reset clears only V26 test data, recreates the two V26 test wishers, and reloads the same V26 route.

It must never restore a V24/V25 UI or old local state.

The reset control lives in the QA persona strip, not in the intended public navigation.

## Automated browser QA

Dedicated GitHub Actions workflow:

`.github/workflows/check-raluvaaa-mvp-v26.yml`

It performs real Chromium interaction against a local static server and checks at least:

- V03 visual lock;
- desktop shell load without console errors;
- lineage focus changes the canvas materially and exits correctly;
- EVOLVE;
- first SPLIT;
- ADD BRANCH on an already split node;
- BLOOM becomes terminal;
- one ENCOURAGE per actor/wish;
- HELP proposal;
- branch suggestion proposal;
- CONNECT proposal creates no warp before consent;
- persona B receives pending notifications;
- persona B can accept HELP, SUGGEST and CONNECT;
- accepted CONNECT materializes a warp;
- accepted HELP materializes help;
- accepted suggestion materializes branch data;
- My World is actor-specific;
- reset stays on V26 and recreates only the V26 seed state;
- mobile layout has no horizontal overflow and keeps the side rail compact.

## Promotion rule

Do not promote V26 to `/raluvaaa/` merely because static checks pass.

Promotion requires:

1. dedicated V26 browser QA green;
2. manual review by Thomas on desktop;
3. manual review by Thomas on mobile;
4. no known broken core action;
5. no regression of the validated V03 visual direction.

LLM assistance and MCP remain out of scope for V26.