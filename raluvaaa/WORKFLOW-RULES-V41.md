# RALUVAAA workflow rules - V41

V41 audits the interaction between CREATE, EVOLVE, BRANCH, BLOOM, LET GO/CLOSE, REVIVE and manual reconfiguration.

## Core state model

A semantic node is currently one of:
- `alive`
- `bloom`
- `abandoned`

A confirmed BLOOM is final in V41. LET GO/CLOSE creates the reversible `abandoned` state.

## EVOLVE

EVOLVE is a new state of the same intention, not a correction of the previous text.

Each node can have only one direct EVOLVE successor.

Once a node has an EVOLVE successor, that node becomes historical:
- do not add new branches to the old state;
- continue from the newer state;
- the old trace remains visible.

If active direct branches already exist when EVOLVE is created, V41 asks whether to move those branches under the new state. The default is to leave them where they are. This preserves history while allowing explicit LEGO-style reconfiguration.

## BRANCH / SPLIT

Branches are concrete parallel or subordinate paths.

A branch may be manually moved only when:
- it is a `split` branch;
- it is alive;
- the target is alive;
- the target is in the same lineage;
- the target is not inside the branch's own subtree;
- the target is not a superseded historical state.

Moving a branch moves its full subtree.

The original `split` node remains the structural branch anchor even after that branch has EVOLVED. It may therefore still be moved as one LEGO piece together with its evolved subtree. EVOLVE nodes themselves are state transitions, not movable branch anchors.

## BLOOM

A branch can bloom only when it has no active descendants.

The whole root wish can always be explicitly confirmed as fulfilled by its wisher. If unresolved active descendants remain, the existing explicit override confirmation is retained.

V41 also detects the natural completion case:
- determine the current leaf/end-point nodes under the root;
- when every current leaf is bloomed, offer to bloom the whole wish;
- accepting this quietly blooms any remaining alive internal states, then blooms the root;
- this flowers the full lineage without adding extra intermediate sounds;
- the root event triggers the existing whole-wish bloom sound.

Branch bloom and whole-wish bloom remain separate semantic events and separate sounds.

## LET GO / CLOSE

LET GO on a branch is reversible and keeps its trace. If the branch has active descendants, LET GO closes the whole active branch subtree in one action and records exactly which nodes were put to sleep. Sibling branches are untouched.

CLOSE on a whole wish records exactly which nodes were alive at the moment of closing and puts those nodes into the abandoned state.

These snapshots matter for later REVIVE.

## REVIVE

Reviving a branch:
- if that branch was explicitly closed as a subtree, restores only the nodes recorded in that branch-close snapshot;
- otherwise revives the selected trace and any abandoned ancestors needed to reconnect its path;
- does not revive unrelated sibling branches;
- does not cross a confirmed BLOOM ancestor.

Reviving a whole closed wish:
- revives only the nodes that were put to sleep by the most recent CLOSE snapshot;
- does not accidentally revive branches the wisher had already abandoned before closing the whole wish.

REVIVE uses a watering/growing visual metaphor and its own sound.

## CORRECT / REMOVE MISTAKE

CORRECT changes text/location without changing the semantic direction.

REMOVE MISTAKE is only for a fresh trace with no descendants or human relationships. V41 also removes nested branch children correctly from their parent event during local replay.

## Suggestions from other humans

Suggest a branch is a proposal only. It becomes `branch_add` only after acceptance by the wisher.

Other humans never get sovereign BLOOM, EVOLVE, BRANCH, CONNECT or HELP authority over someone else's wish.

## Deliberately not automated in V41

There is no automatic inactivity-based dormancy rule yet. V41 only handles explicit LET GO/CLOSE and REVIVE. A future dormancy policy needs its own product decision before implementation.
