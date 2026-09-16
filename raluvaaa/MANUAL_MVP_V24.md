# RALUVAAA MANUAL MVP V24

## Purpose

Build the first semantically coherent manual MVP without AI or MCP while preserving the locked V03 visual language.

The graph must be the visual consequence of human-confirmed wish events. It must not invent product meaning from arbitrary geometry.

## Core model

- One root wish = one independent lineage.
- A person may own multiple unrelated lineages.
- A visible interactive node = one meaningful state or event in a lineage.
- Pure rendering control points are never product objects.
- The event log is the source of truth. The graph is a view of that history.

## Wisher workflow

### CREATE
User action: release a new wish.
Data: root wish + lineage id + owner id + text + metadata.
Semantic effect: new independent lineage.
Graphic effect: new seed/origin node.

### EVOLVE
User action: record a meaningful change, refinement or next state of the same wish.
Data: new state node with parent state and new text.
Semantic effect: continuation of the same lineage.
Graphic effect: continuation of the branch. The user never chooses angle or bend.

PIVOT is not a mandatory top-level action in V24. A strong change of direction is represented as an EVOLVE event and may later be classified as a pivot subtype.

### SPLIT
User action: break a wish or sub-wish into two or more sub-wishes.
Data: child wishes linked to one parent node.
Semantic effect: recursive decomposition.
Graphic effect: branching from the selected node.

### BLOOM
User action: confirm that the selected wish/sub-wish has been accomplished.
Data: bloom event on the selected semantic node.
Semantic effect: completed state. Only the wisher may confirm it.
Graphic effect: flowering around that node, preserved as a trace.

### ABANDON
User action: voluntarily stop one branch, sub-wish or entire lineage.
Data: abandon event on the selected node.
Semantic effect: branch no longer active. It is never deleted.
Graphic effect: fading/patina/fossilisation.

### REATTACH
User action: correct the structure of their own lineage by changing the semantic parent of one node.
Data: reparent event.
Semantic effect: branch belongs under another node in the same lineage.
Graphic effect: branch is reattached and its local subtree is moved with it. No global free positioning of wishes.

## Helper workflow

### ENCOURAGE
User action: one lightweight positive signal.
Data: encourage event.
Semantic effect: no structural change.
Graphic effect: temporary energy/light impulse. No public like count.

### HELP
User action: offer a concrete contribution to the selected wish/sub-wish.
Data: help event with short optional note.
Semantic effect: contribution attached to a specific state/branch.
Graphic effect: bud/leaf/small nourishing growth. HELP never declares BLOOM.

### CONNECT
User action: propose/connect two independent lineages.
Data: connection event between two semantic nodes from different lineages.
Semantic effect: relation between two stories, not parent/child.
Graphic effect: a distinct warp/filament. It remains visually separate from biological branching.

## Selection behaviour

When a semantic node is selected:

- selected node is obvious;
- lineage path back to the origin is subtly iridescent;
- descendants remain readable;
- related warps become more visible;
- no explanatory essay is displayed in the interface.

## Manual V24 UI

For an owned wish:

- Evolve
- Split
- Bloom
- Abandon
- Reattach
- Share

For another person's simulated wish:

- Encourage
- Help
- Connect
- Share

The product must never expose renderer vocabulary such as Root A, generation, bend angle or Bezier control points.

## Simulation contract

The test world contains about 100 independent simulated root wishes.

Their histories are generated from coherent semantic events:

- some remain new;
- some evolve;
- some split;
- some contain nested splits;
- some sub-wishes bloom;
- some branches are abandoned;
- some receive help;
- a small number are connected by warps.

No node may be labelled PIVOT/EVOLVE while repeating the exact same semantic text as its parent.

## Technology

V24 remains entirely manual and local:

- locked V03 Canvas renderer;
- HTML/JS product shell;
- localStorage event persistence for prototype testing;
- no LLM call;
- no MCP;
- no React;
- no backend required for this validation build.

Later, the same event schema must be portable to Worker + D1 and usable by manual UI, optional LLM assistance or MCP without changing the semantic model.

## Stop rule

V24 validates the manual grammar and end-to-end Wisher/Helper flows. Do not add AI, coaching, task-management features, recommendations or a new visual direction before testing this manual model with humans.
