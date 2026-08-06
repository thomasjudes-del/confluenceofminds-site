from pathlib import Path
import re

BASE = "https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev/"
VIDEO_BY_PORTAL = {
    "Anjin of the Shogun": BASE + "Anjin_of_the_Shogun_Teaser_27s_HD.mp4",
    "Chronicles of Kashgar": BASE + "0%20Kashgar_Teaser_V3.mp4",
    "Shattered Dragons": BASE + "Shattered_Dragons_Recap_Teaser_16x9.mp4",
    "À la recherche de Katephomi Kitembe": BASE + "A_la_recherche_de_Katephomi_Kitembe_Teaser.mp4",
}
ORDER = [
    "Incident on Titan",
    "Anjin of the Shogun",
    "Chronicles of Kashgar",
    "Shattered Dragons",
    "À la recherche de Katephomi Kitembe",
    "Authentiques Victimes",
]

path = Path("index.html")
html = path.read_text(encoding="utf-8")

grid_marker = '<div class="world-grid">'
grid_start = html.index(grid_marker)
first_article = html.index('<article class="world-card', grid_start)

blocks = []
pos = first_article
while True:
    start = html.find('<article class="world-card', pos)
    if start == -1:
        break
    section_end = html.find('</section>', start)
    close = html.find('</article>', start)
    if close == -1 or close > section_end:
        break
    close += len('</article>')
    block = html[start:close]
    portal_match = re.search(r'data-portal="([^"]+)"', block)
    if not portal_match:
        raise RuntimeError("A world card has no data-portal attribute")
    blocks.append((portal_match.group(1), block))
    pos = close

if len(blocks) < 6:
    raise RuntimeError(f"Expected at least 6 cards, found {len(blocks)}")

by_portal = dict(blocks)
missing = [name for name in ORDER if name not in by_portal]
if missing:
    raise RuntimeError(f"Missing cards: {missing}")


def add_video(block: str, url: str) -> str:
    # Make the card use the native video-card styling and viewport controller.
    article_match = re.search(r'<article class="([^"]+)"([^>]*)>', block)
    if not article_match:
        raise RuntimeError("Could not parse article tag")
    classes = article_match.group(1).split()
    if "world-card--native" not in classes:
        insert_at = classes.index("reveal") if "reveal" in classes else len(classes)
        classes.insert(insert_at, "world-card--native")
    attrs = article_match.group(2)
    if "data-media-container" not in attrs:
        attrs += " data-media-container"
    new_article = f'<article class="{" ".join(classes)}"{attrs}>'
    block = block[:article_match.start()] + new_article + block[article_match.end():]

    video_markup = (
        '\n              <video class="world-card__preview" data-viewport-video autoplay muted loop playsinline preload="metadata" aria-hidden="true">\n'
        f'                <source src="{url}" type="video/mp4" />\n'
        '              </video>\n'
        '              <span class="world-card__scrim" aria-hidden="true"></span>'
    )

    if 'class="world-card__preview"' in block:
        block = re.sub(
            r'\n\s*<video class="world-card__preview".*?</video>\n\s*<span class="world-card__scrim"[^>]*></span>',
            video_markup,
            block,
            count=1,
            flags=re.S,
        )
    else:
        svg_end = block.find('</svg>')
        if svg_end == -1:
            raise RuntimeError("Could not find SVG fallback in card")
        svg_end += len('</svg>')
        block = block[:svg_end] + video_markup + block[svg_end:]
    return block

for portal, url in VIDEO_BY_PORTAL.items():
    by_portal[portal] = add_video(by_portal[portal], url)

original_order = [portal for portal, _ in blocks]
new_order = ORDER + [portal for portal in original_order if portal not in ORDER]
new_cards = "\n\n        ".join(by_portal[portal].strip() for portal in new_order)

last_article_end = first_article
for _, block in blocks:
    start = html.find('<article class="world-card', last_article_end)
    end = html.find('</article>', start) + len('</article>')
    last_article_end = end

html = html[:first_article] + new_cards + html[last_article_end:]

# Bump the media controller cache key so every browser initializes the newly added videos.
html = html.replace(
    'native-media-v4.js?v=20260806-native-v2',
    'native-media-v4.js?v=20260806-world-order-v1',
)

path.write_text(html, encoding="utf-8")
