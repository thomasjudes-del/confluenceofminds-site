# RALUVAAA vitality and dormancy grammar - V42

## Product distinction

### LET GO / CLOSE
This is an explicit human decision. The wish or branch is intentionally put aside and its trace remains in the world.
Returning from this state is called Resume / Reprendre.

### Passive inactivity
This is not a decision and does not rewrite history.
An alive wish gradually loses visual vitality when its owner has not made a meaningful action for some time. The visual state is derived from wall-clock time, so it continues to change while the user is away.
Returning from passive dormancy is called Wake / Réveiller.
This uses the watering / regrowth visual metaphor.

## V42 timing values
These are product-test values, not permanent business rules:
- day 0-3: vigorous
- day 4-13: subtle daily fading
- day 14: first in-app warning
- day 25: stronger warning
- day 30: dormant

The visual vigor is recalculated from the current date on every load. No background process is required for the visual state to age while the user is away.
External push/email notifications are not implemented in this solo prototype. V42 backfills in-app notifications when the user returns.

## What counts as meaningful owner activity
V42 resets vitality on structural or intentional progress events: create, evolve, split / add branch, bloom, correct, move branch / reparent, resume, wake.
An encouragement from another human does not silently keep the owner's wish alive forever.

## Dormant behavior
Dormancy is derived, not stored as a sovereign semantic state.
The underlying wish remains alive, but its world rendering fades, growth actions pause until Wake, and the trace stays visible.
Confirmed BLOOM and explicit LET GO/CLOSE are not affected by passive fading.

## Entrusted wishes
The three temporarily entrusted wishes must be actionable.
V42 excludes bloomed wishes, abandoned/closed wishes, superseded historical EVOLVE states, passive dormant wishes, and the current user's own wishes.
If a root wish has evolved, the entrusted slot points to its current evolved state rather than the historical root.

## Visual evolution over time
V42 implements the priority behavior first: wall-clock vitality patina that changes day by day even if the app is not opened.
A later pass can add non-semantic organic growth over time, such as richer tendrils, buds and maturation of existing blooms. That future layer must remain deterministic and visual only unless a human explicitly performs a semantic action.
