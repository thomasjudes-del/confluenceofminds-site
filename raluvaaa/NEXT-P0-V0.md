# RALUVAAA V0 - next P0 after workflow QC

This note captures product decisions validated on 24 Sep 2026. It is not a request to add broad V1 scope.

## 1. Saved wishes is P0

Working label: **Saved wishes**. Avoid "wishlist" in the product copy for now because RALUVAAA already uses Wish as its core object and "wishlist" can sound like the user's own wishes.

### Why it exists
A visitor may find a wish or branch that they want to:
- come back to later;
- follow because its evolution is interesting;
- help later;
- use later as a possible GRAFT / CONNECT target;
- keep as inspiration.

This is a private retrieval mechanism, not a public like/follower count.

### V0 behavior
- A heart/bookmark-like affordance can save any foreign wish or branch.
- Saving does not modify the wish and does not create a public counter.
- Saved items remain retrievable after the temporary entrusted-wish slot expires.
- If a saved wish EVOLVES, the saved relationship belongs to the lineage and should open the current state while preserving access to history.
- If it BLOOMS, LETS GO, CLOSES or becomes dormant, it stays saved and shows its current state.
- The same wish cannot be saved twice.

### Placement
Do not add another permanent rail icon unless tests show it is necessary.

Preferred V0 placement:
- existing **Entrusted wishes** drawer;
- two internal views: **Entrusted (3)** and **Saved**.

This keeps discovery and retrieval together without turning the product into a conventional social profile.

### CONNECT / GRAFT
Saved wishes should later be offered as a direct source list when the user starts GRAFT / CONNECT, before forcing blind spatial exploration.

## 2. Copy / inspiration is useful but not P0

Simulated and real public wishes may inspire another human.

A future action can explicitly create **my own new wish inspired by this one**, but it must create a new semantic wish with its own author and history. It must never pretend to be a branch of the original unless a CONNECT/GRAFT relationship is deliberately created.

## 3. Share is P0

Sharing must work for:
- one's own wish;
- another person's wish;
- a branch / current state, not only a root.

The canonical locator remains the semantic wish link, not visual coordinates.

### Share artifact
V0 target: a short animated visual asset generated from a fixed RALUVAAA share system.

It should contain:
- the wish text;
- optional simple place/date metadata;
- a clear RALUVAAA identity;
- a CTA to open the actual wish;
- optionally a snapshot of world X/Y coordinates as atmosphere, never as the canonical identifier.

### Variety without falsifying the wish
The share animation does not need to replay the real history of that wish.

Use a small family of predesigned templates, for example 5 or 6:
- pulse / growing point;
- branch appearing;
- bridge / graft passing nearby;
- restrained bloom;
- drifting constellation;
- fossil-to-light revival.

Templates can vary palette, motion and micro-structure. They are a preview of the RALUVAAA world, not a claim that those exact events happened to the shared wish.

### Delivery
- Prefer Web Share API when available.
- Always preserve a normal shareable URL fallback.
- Media format choice still needs implementation validation across WhatsApp, Instagram, LinkedIn, iMessage etc. Do not assume GIF is the best final format before testing.

## 4. Workflow and simulation QC remains the gate

Before adding the two P0 features above, keep the current workflow regression suite green.

The simulated world must deliberately contain several examples of:
- alive untouched wishes;
- evolved wishes;
- branched and nested wishes;
- partial blooms;
- fully bloomed wishes;
- partial LET GO / abandoned branches;
- fully abandoned wishes;
- help / encouragement / suggestion activity;
- cross-wish grafts.

Simulation histories must obey the same structural rules as human workflows. In particular:
- never entrust an already BLOOMED, abandoned, dormant or superseded state;
- never show a BLOOM above an active descendant;
- never abandon a parent while leaving an active descendant underneath it.

## Explicitly deferred

Not P0 now:
- decorative automatic growth of the user's own tree purely because time passed;
- automatic thematic clustering;
- search;
- personalized recommendation;
- cloning a wish;
- public save/follower counters.
