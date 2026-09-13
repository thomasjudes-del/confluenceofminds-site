# RALUVAAA V21 — BRING BACK THE SUMPTUOUS WORLD

## Goal

Restore the visual majesty of the validated historical v03 world while preserving the product grammar and UX developed through V20.

The target is not a nostalgic rollback. It is:

**historical visual splendor + current wish product**

The world must again feel like a deep, colorful, living firework of lineages, with the map dominating the screen and the interface sitting on top of it lightly.

## Visual reference to restore

The historical v03 baseline is the reference for atmosphere and scale:

- very large initial dezoom / fit-world view;
- many thousands of fine organic routes visible at once;
- differentiated lineage colors, including cyan, violet, magenta, amber, green and warm coral accents;
- clusters that read like mycelium, roots, neurons and constellations at the same time;
- bright living tips and denser luminous regions without turning into neon UI;
- a visible top-right minimap that reads like a miniature firework / organism;
- strong sense of depth, density and world-scale;
- the organism is the hero, not the cards.

## Product elements that must remain

Do not regress the current product grammar:

- WISH as primary unit;
- Entrusted to you;
- World Pulse;
- My World;
- Create / Release a wish;
- ENCOURAGE;
- HELP;
- CONNECT;
- PIVOT;
- SPLIT;
- BLOOM;
- LET GO;
- SHARE;
- FR / EN switch;
- compact wish detail card;
- recentering and navigation;
- simulated / local truth distinction;
- action micro-animations introduced in V20.

## Technical strategy

1. Keep `engine-v03.html` as the geometry and rendering foundation.
2. Stop overriding its native edge/node palette with the muted V18 renderer. The native v03 drawing language is the visual source of truth.
3. Build a denser ambient world before the Wish runtime maps the 100 seed wishes to semantic nodes.
4. Treat the extra geometry as simulated visual history / branch structure, not as additional real humans or wishes.
5. Re-enable and preserve the native minimap on desktop/tablet.
6. Keep technical root/generation labels hidden: their old labels are rendering scaffolding, not product semantics.
7. Retain V20 action effects by layering them over the native renderer instead of replacing it.
8. Keep performance adaptive by viewport:
   - desktop: sumptuous high-density world;
   - tablet: medium-high density;
   - mobile: reduced density while retaining color and depth.
9. Fit the full world after enrichment so the first desktop impression is a broad, spectacular organism rather than a sparse close-up.
10. Reduce overlay opacity / visual weight so the world remains dominant.

## V21 acceptance criteria

V21 is done when:

1. Desktop load immediately shows a broad, colorful organism with multiple distinct lineage regions.
2. The visual density is dramatically closer to the old 17k-node screenshots than V20.
3. The native rich color palette is back; V18 muted edge/node overrides are not loaded.
4. The top-right minimap is visible on desktop/tablet and visually dense.
5. Root A/B/C and generation debug labels remain absent.
6. Clicking an entrusted wish still opens the current compact wish card and centers correctly.
7. FR/EN still works.
8. ENCOURAGE / HELP / CONNECT / PIVOT / SPLIT / BLOOM / LET GO still function and retain their V20 feedback.
9. Creating a wish and My World still work.
10. The automated build validation passes.

## Stop rule

After V21, only fix clear visual regressions, usability blockers or bugs. Do not resume indefinite cosmetic iteration before the Shared World / first-human test phase.
