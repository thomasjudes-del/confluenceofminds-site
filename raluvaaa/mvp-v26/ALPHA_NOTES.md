# RALUVAAA Manual MVP V26 - Alpha hardening

Status date: 2026-09-17

This sandbox is the pre-alpha validation surface. The official `/raluvaaa/` route remains untouched while this version is hardened.

## Entrusted wishes

Exactly three temporary wishes are entrusted to the user. Their durations are deliberately different and non-personalized:

- short: randomly about 3 to 8 hours;
- medium: randomly about 18 to 30 hours;
- long: randomly about 60 to 84 hours.

The short slot is visually urgent, the medium slot intermediate, and the long slot calm/green. Expiry replaces the slot without deleting the wish from the world.

## Alpha UX wording

The private navigation label `Mon monde / My world` is presented as `Mes wishes / My wishes` in the QA surface because this is clearer for first-time users. This does not change the underlying product model.

## Runtime hardening

The archived V03 renderer remains untouched. A V26 integration guard prevents transient non-finite camera/geometry values introduced by the semantic runtime from crashing Canvas rendering. Invalid transient geometry is skipped rather than altering the locked V03 source.

## Release posture

This is still a QA sandbox, not the public launch. Promotion requires the V26 workflow QA to pass and a short manual desktop/mobile review. True multi-device social testing still requires shared persistence/identity rather than the current deterministic A/B local sandbox.
