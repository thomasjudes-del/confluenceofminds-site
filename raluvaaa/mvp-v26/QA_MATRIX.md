# RALUVAAA Manual MVP V26 - Global QA Matrix

Status date: 2026-09-17

This file is the release gate for the V26 manual MVP sandbox. It is intentionally broader than a happy-path test: it covers the wisher lifecycle, other-human contributions, consent, recovery from mistakes, navigation, desktop/mobile behaviour and visual integrity.

## Release rule

Do not promote V26 to the main RALUVAAA route until:

1. the locked V03 visual reference remains the renderer baseline;
2. all critical workflows below pass without page/console errors;
3. reset returns to V26 state, never to an earlier product version;
4. two-person consent/notification flows work end-to-end;
5. desktop and mobile are manually reviewed for clarity, not only technical fit;
6. no action gives another human sovereign control over somebody else's wish.

## Current automated coverage

| Area | Workflow | Current status | Notes |
|---|---|---:|---|
| Visual baseline | Locked V03 renderer loads alone | PASS | Base diagnostic passes. |
| Discovery | Exactly 3 entrusted wishes shown | PASS | Functional check only. Expiry/replacement still to test. |
| Language | FR / EN switch updates navigation labels | PASS | Functional check. |
| Wisher | Create a wish | PASS | Local sandbox persistence. |
| Wisher | Evolve a wish | PASS | Prevents identical continuation. |
| Wisher | Split into sub-wishes | PASS | Creates at least two children. |
| Wisher | Add another branch later | PASS | Tested after initial split. |
| Wisher | Reattach a branch to another parent | PASS | Tested through the action menu. Drag UX still to test. |
| Wisher | Bloom a branch | PASS | Subsequent evolve/split controls disappear for that bloomed item. |
| Wisher | Abandon / let go while preserving trace | PASS | Local sandbox semantics. |
| Wisher | Remove an accidental wish from the local test | PASS | Distinct from abandon. |
| Wisher | Share a wish deep link | PASS | Clipboard link contains the wish anchor. |
| Navigation | See / focus the lineage | PASS technically | Automated test confirms the world is visually isolated to the lineage and can exit. Manual UX review still required because the effect may be too subtle/confusing. |
| Other human | Encourage once | PASS | Second encouragement by the same actor is blocked. |
| Other human | Offer HELP | PASS functionally | Proposal exists and waits for recipient acceptance. |
| Other human | Suggest a branch | PASS functionally | Proposal exists and waits for recipient acceptance. |
| Other human | Propose CONNECT | PASS functionally | No warp before required consent. |
| Two people | Persona A -> Persona B notifications | PASS functionally | B sees pending requests in inbox. |
| Two people | Recipient accepts HELP | PASS functionally | Accepted help materialises only after consent. |
| Two people | Recipient accepts branch suggestion | PASS functionally | Suggested branch materialises after consent. |
| Two people | Recipient accepts CONNECT | PASS functionally | Warp materialises only after required consents. |
| My World | Own roots appear in My World | PASS | Functional check. |
| Reset | Reset recreates V26 test state | PASS | Automated assertions confirm version 26 and the V26 seed event set after reset. |
| Desktop | 1440 x 900 basic navigation/layout | PASS technically | Does not mean the UX is good enough. |
| Mobile | 390 x 844 no horizontal overflow, compact rail, full-height drawer | PASS technically | Does not mean the UX is good enough. |
| Runtime safety | Full interaction sequence produces no browser errors | FAIL - BLOCKER | Current CI ends with a Canvas `createRadialGradient` non-finite-value error after the interaction sequence. The locked renderer alone passes, so the fault is in the integration/runtime state, not the archived V03 baseline. |

## Critical workflows still missing from automation

### Wisher recovery and change-of-mind

- Try to evolve a state that already has a continuation.
- Reattach a branch more than once.
- Reattach to an invalid descendant or abandoned parent and verify rejection.
- Bloom by mistake: decide whether correction is allowed and what it means in the event history.
- Abandon by mistake: decide whether revival is allowed and how it appears visually.
- Remove an accidental root that already has descendants or external relationships.
- Close / let go a whole wish versus one branch.
- Try actions on a bloomed or abandoned wish and confirm the allowed action set is coherent.

### Other-human sovereignty and consent

- Decline HELP, branch suggestion and CONNECT.
- Ensure decline creates no help branch, suggested branch or warp.
- Proposal sender cancels a still-pending proposal.
- Target wish is bloomed/abandoned before the recipient answers.
- One side of a CONNECT is deleted as a local mistake before consent.
- Multiple helpers propose help to the same wish.
- Same helper proposes help twice.
- Accepted help followed by later withdrawal/change of mind: define semantics.
- Accepted CONNECT followed by later unlinking: define whether the historical bridge remains as a fossil trace.

### Notifications

- Read/unread state.
- Notification ordering and duplicate suppression.
- Open a notification and land on the exact wish/relationship.
- Declined/accepted request moves from "to process" to history without disappearing incorrectly.
- Verify activity visibility for both proposer and recipient.
- Verify no private help text leaks into the public world.

### Entrusted wishes

- Each of the three slots has a distinct duration.
- Expired slot is replaced without deleting the wish from the world.
- No Save button in this mechanic.
- A real action creates a retrievable relationship after the entrusted slot expires.
- Refresh/reload does not reshuffle entrusted wishes unexpectedly before expiry.

### Navigation and orientation

- Deep-link directly to a wish and recenter correctly.
- Focus lineage from root, evolved state, sub-branch, bloom and abandoned node.
- Exit lineage returns to a sensible world view.
- Jump from notification -> wish -> lineage -> back to notification.
- Jump from My World -> branch -> parent/root.
- CONNECT mode can be cancelled at every step without leaving a stuck mode.
- Blank-world click closes only the intended panel.
- Pan/zoom while a drawer is open on desktop and mobile.
- Back button / browser history behaviour where appropriate.

### Desktop UX review

- Reduce permanent chrome and competing controls.
- Make the hierarchy between world, selected wish and actions immediately legible.
- Check whether "More" hides actions people need too often.
- Ensure "See lineage" has an obvious visible effect and a clear exit.
- Check panel width, copy density, action grouping and modal friction.
- Ensure World Pulse / stats support the world without becoming a dashboard.

### Mobile UX review

- One-handed reachability of core actions.
- Selected-wish drawer should not cover the world more than necessary.
- Keyboard behaviour for create/evolve/help forms.
- Safe areas, browser bars and short viewport heights.
- Touch pan/zoom versus tap-to-select conflict.
- CONNECT target selection without accidental map movement.
- Long wish text, long location text and translation expansion.

### Multi-person realism

The current A/B mode shares one browser-origin storage and is a deterministic functional sandbox. It verifies permissions, proposal state, notification logic and consent semantics, but it is not yet a real two-device/shared-backend test.

Before public testing, add a shared persistence layer and run the same scenarios in two independent browser contexts/devices.

## Known blocker from latest CI

The current full browser run reaches the end of the functional sequence but records:

`TypeError: Failed to execute 'createRadialGradient' on 'CanvasRenderingContext2D': The provided double value is non-finite.`

The standalone locked renderer diagnostic passes. This means the next technical task is to isolate which integration event leaves invalid geometry/camera state, fix that without modifying the locked V03 reference, then rerun the whole matrix.

## Promotion gate

V26 remains a QA sandbox until the runtime blocker is fixed and the critical missing paths above have been exercised. Passing a happy path is not sufficient.