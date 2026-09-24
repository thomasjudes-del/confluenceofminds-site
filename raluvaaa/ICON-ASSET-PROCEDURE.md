# RALUVAAA icon asset procedure

This is the required procedure for production UI icons.

## Source of truth

1. If an icon or icon board has been visually approved, that artwork is the source of truth.
2. Export or crop the approved artwork directly. Do not redraw it in JavaScript, CSS, Canvas, or an improvised SVG.
3. If no approved artwork exists, use a coherent high-quality icon library with a verified compatible licence. Import the exact source vector, then adapt only the surrounding RALUVAAA tile treatment when needed.
4. Do not mix several graphical engines or icon families inside one action deck without an explicit design decision.

## Pipeline

Approved board or verified library source -> exact crop/vector source -> versioned asset -> R2 -> semantic action mapping -> browser QA.

Assets must be versioned under:
`raluvaaa/vNN/icons/`

The online UI must point to the versioned R2 asset. GitHub code must not procedurally reconstruct the pictogram.

## QA

For each important icon, automated QA should verify:
- the semantic action maps to the expected asset;
- the rendered `src` is the current versioned asset;
- the asset has loaded successfully;
- dimensions are coherent with the rest of the deck;
- no fallback from an older icon version is leaking through.

For visual review, compare the online rendering against the approved board/source, not against a code-generated approximation.

## V41 revive precedent

The V41 Revive and Move branch icons follow this procedure:
- exact open-source source vectors were taken from the Pinhead icon library;
- the watering can + plant/droplets source geometry is used for Revive;
- the four-direction move source geometry is used for Move branch;
- each is composed into a RALUVAAA tile without redrawing the source pictogram;
- the resulting tiles are stored as versioned R2 assets;
- the UI maps `resume` / `resume_lineage` to Revive and manual reattachment to Move branch.

The important rule is not the specific library. It is that the pictogram geometry comes from an approved or verified visual source rather than being improvised in code.
