# RALUVAAA MANUAL MVP V25

## Purpose

Harden the manual Wisher and Helper workflows before adding any LLM or MCP layer.

The locked V03 visual language remains the graphical reference. V25 changes product mechanics and semantic rendering only.

## Core model

- One root wish = one independent lineage.
- A person may own several unrelated lineages.
- The event log remains the source of truth.
- The graph is a visual consequence of semantic events.
- A visible interactive node represents a meaningful wish state or branch, never a raw rendering control point.

## Wisher workflow

### CREATE
Creates a new independent wish lineage.

### EVOLVE
Creates the next meaningful state of the same intention.

V25 enforces one direct EVOLVE continuation per state. If an older state already has a continuation, the user should continue from the newer state or create a branch from the older one.

### SPLIT
The first decomposition of a point creates at least two child sub-wishes.

### ADD BRANCH
If a point already has split children, revisiting that point must allow adding one or more additional branches without forcing a new two-branch split and without replacing previous children.

This is a contextual UX distinction. Both SPLIT and ADD BRANCH create child sub-wishes under the same semantic parent.

### BLOOM
The wisher confirms that a wish or sub-wish has been accomplished.

BLOOM is terminal for that semantic node in V25. It must create flowering only. It must never create a new semantic branch or continuation.

### ABANDON
The wisher deliberately stops a path while preserving its trace.

ABANDON is not the same as correcting a mistaken input.

### REMOVE MISTAKE
V25 adds a local-prototype correction mechanism for accidental creation or wrong structure.

In the local sandbox, removing a mistake rewrites local test events so that the mistaken node/subtree no longer appears. This is intentionally different from ABANDON, which preserves history.

For a future shared public backend, hard removal must be more restrictive once external humans have interacted with that branch. The exact shared-world deletion policy is not decided in V25.

### REATTACH
A wisher may change the semantic parent of one node inside the same lineage.

Two interfaces coexist in V25:

- a fallback Reattach action with a parent selector;
- direct drag from an owned non-root node onto another valid living node in the same lineage, followed by confirmation.

This is structural editing, not global free positioning of wishes.

### LINEAGE FOCUS
Any wish may be opened in a focused lineage view that hides unrelated branches while keeping relevant cross-lineage connections visible.

The purpose is to understand one intention as an object in itself without the visual noise of the whole world.

## Helper workflow

### ENCOURAGE
A lightweight positive signal with no structural effect and no public like counter.

In a world with very few real users, one real encouragement must be visibly noticeable. Later the visual strength can normalize with real world activity.

### HELP
A concrete offer of human assistance attached to a wish state.

In the V25 local sandbox the visual contribution appears immediately for testability. In the shared product, durable help traces should eventually reflect accepted/useful help rather than every unsolicited offer.

### SUGGEST A BRANCH
A helper may suggest one or more smaller branches or first steps.

This is distinct from HELP and from AI assistance. It is a human proposal. It never changes the wisher's lineage until accepted by the wisher in the future shared workflow.

V25 records the suggestion and shows a small non-structural marker, but does not create child nodes.

### CONNECT
Creates a cross-lineage warp between two independent wishes in the sandbox.

In the future shared world this should be treated as a proposal/consented relation rather than sovereign structural power over another person's wish.

## State rules

- Alive nodes may EVOLVE, SPLIT/ADD BRANCH, BLOOM or ABANDON according to context.
- Bloomed nodes do not continue growing in V25.
- Abandoned nodes do not continue growing in V25.
- Structural correction can still move or remove a locally owned node in the prototype.
- A node may have several split children over time.
- A state may have at most one direct EVOLVE child.

## Visual contract

- CREATE: seed/origin.
- EVOLVE: branch continuation generated automatically by the renderer.
- SPLIT / ADD BRANCH: biological branching from the selected node.
- BLOOM: petals/flowering around the same semantic endpoint, with no new branch.
- ABANDON: patina/dormancy/fossil trace.
- ENCOURAGE: visible light impulse/halo, stronger for a real local encouragement in the low-user prototype.
- HELP: small nourishing shoot/bud.
- SUGGEST A BRANCH: subtle non-structural marker.
- CONNECT: dotted/filament warp between independent lineages.
- Selection: origin path is subtly reinforced.
- Focus lineage: unrelated lineages are hidden while connected endpoints/warps remain visible.

## Technology

V25 is still intentionally simple:

- locked V03 Canvas renderer;
- HTML/JavaScript product shell;
- localStorage event persistence;
- no AI call;
- no MCP;
- no React;
- no shared backend yet.

The event model is designed to remain portable to Worker + D1 and later to optional LLM assistance and MCP access.

## Validation target

Test whether a human can naturally:

1. create a real wish;
2. evolve it;
3. split it;
4. return to an existing split and add another branch;
5. correct a mistake without pretending it was an abandonment;
6. reattach a wrongly placed branch, including by drag;
7. bloom an accomplished branch without creating fake descendants;
8. abandon a genuine path while retaining its trace;
9. focus on one complete lineage;
10. help another wish by encourage, help, branch suggestion or connection.

Do not add LLM or MCP functionality before this manual interaction model is sufficiently coherent for initial human testing.
