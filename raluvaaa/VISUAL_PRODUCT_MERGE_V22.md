# RALUVAAA V22 - V03 visual lock + V20 product layer

## Intent

Evolve the official `/raluvaaa/` site by keeping the approved v03 graphical world intact while importing only the product mechanics and product UI developed in the V20 wish prototype.

## Graphical baseline - LOCKED

The graphical source of truth is the exact deployed v03 engine captured at commit:

`17714b78996183fdb3aa8080cf76df9ccf72d140`

Blob:

`a961308b1811015afad015641ecadfeafea1ee69`

Reference URLs:

- `https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/preview/v03/index.html`
- `https://shattered-dragons-enigma.thomas-judes.workers.dev/assets/raluvaaa/preview/v03/index.html?test=1`

The official product build must not override the v03 renderer functions, palette, density, lineages, halos, minimap rendering, camera model or base simulation.

## Product source

Product behavior is taken from V20 commit:

`63f17937942efec7670d310893a5b317ccf7cb2a`

Included product elements:

- WISH as the semantic unit;
- 100 simulated seed wishes mapped onto existing v03 nodes;
- Entrusted to you with 3 temporary slots;
- World Pulse;
- My World;
- Release a wish;
- compact wish detail UI;
- ENCOURAGE;
- HELP;
- CONNECT;
- PIVOT;
- SPLIT;
- SHARE;
- BLOOM;
- LET GO;
- report / safety flow;
- local prototype persistence;
- FR / EN switch;
- quick navigation and recentering improvements through V20.

## Explicit exclusions

Do NOT import these V20 graphical renderer changes:

- `renderer-v18.js`
- `renderer-v19.js`
- `renderer-v20.js`
- any V21 high-density / firework renderer

These alter the appearance of the world and are outside the requested product merge.

## Integration principle

The V20 product layer may:

- place HTML controls above the v03 world;
- map semantic wishes to existing nodes;
- call the native v03 growth primitives when a product action genuinely creates a branch, split, connection, bloom or trace;
- store prototype events locally.

It must not replace or restyle the underlying world renderer.

## Versioning rule

Visual baseline and product layer are separate version axes.

Current target:

`VISUAL-V03-LOCKED + PRODUCT-V20`

Any future renderer experiment must live on a separate route or branch until explicitly visually validated.
