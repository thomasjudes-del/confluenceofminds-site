from pathlib import Path
import re

R2 = "https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev"
path = Path("index.html")
html = path.read_text(encoding="utf-8")


def article_segment(marker: str) -> tuple[int, int, str]:
    start = html.find(marker)
    if start < 0:
        raise RuntimeError(f"Article marker not found: {marker}")
    end = html.find("</article>", start)
    if end < 0:
        raise RuntimeError(f"Article closing tag not found: {marker}")
    end += len("</article>")
    return start, end, html[start:end]


# 1. Incident on Titan: replace the previous preview with the final minimal cut.
old_titan = f'{R2}/incident-on-titan-preview.mp4'
new_titan = f'{R2}/Incident_on_Titan_Teaser_Minimal_Cut_HD_Final.mp4'
if old_titan in html:
    html = html.replace(old_titan, new_titan, 1)
elif new_titan not in html:
    raise RuntimeError("Neither the old nor the new Titan source was found")

# 2. Katephomi: replace the previous teaser with V4.
old_katephomi = f'{R2}/A_la_recherche_de_Katephomi_Kitembe_Teaser.mp4'
new_katephomi = f'{R2}/A_la_recherche_de_Katephomi_Kitembe_Teaser_V4_Carried_by_Hope.mp4'
if old_katephomi in html:
    html = html.replace(old_katephomi, new_katephomi, 1)
elif new_katephomi not in html:
    raise RuntimeError("Neither the old nor the new Katephomi source was found")

# 3. Authentiques Victimes: force the requested cinematic teaser source.
v_start, v_end, victims = article_segment('<article class="world-card world-card--victims')
victims_url = f'{R2}/Authentiques_Victimes_Cinematic_Teaser_V2_Nils_Frahm.mp4'
source_pattern = re.compile(rf'{re.escape(R2)}/[^"\s]+\.mp4')
source_match = source_pattern.search(victims)
if not source_match:
    raise RuntimeError("Authentiques Victimes video source not found")
victims = victims[:source_match.start()] + victims_url + victims[source_match.end():]
html = html[:v_start] + victims + html[v_end:]

# 4. Créations SILMEA: make the card native/playable and add its R2 teaser.
s_start, s_end, silmea = article_segment('<article class="world-card world-card--silmea')
silmea_url = f'{R2}/SILMEA_Films_Sonores_Teaser_V3_Court_Cinematique.mp4'

silmea = silmea.replace(
    'class="world-card world-card--silmea reveal" data-portal="Créations SILMEA"',
    'class="world-card world-card--silmea world-card--native reveal" data-portal="Créations SILMEA" data-media-container',
    1,
)

if 'world-card--native' not in silmea or 'data-media-container' not in silmea:
    raise RuntimeError("Could not convert SILMEA to a native media card")

if silmea_url not in silmea:
    media_markup = f'''</svg>
              <video class="world-card__preview" data-viewport-video autoplay muted loop playsinline preload="metadata" aria-hidden="true">
                <source src="{silmea_url}" type="video/mp4" />
              </video>
              <span class="world-card__scrim" aria-hidden="true"></span>'''
    if '</svg>' not in silmea:
        raise RuntimeError("SILMEA poster SVG closing tag not found")
    silmea = silmea.replace('</svg>', media_markup, 1)
else:
    silmea = source_pattern.sub(silmea_url, silmea, count=1)

html = html[:s_start] + silmea + html[s_end:]

expected = [
    new_titan,
    victims_url,
    new_katephomi,
    silmea_url,
]
for url in expected:
    if html.count(url) != 1:
        raise RuntimeError(f"Expected exactly one occurrence of {url}, found {html.count(url)}")

if old_titan in html or old_katephomi in html:
    raise RuntimeError("An obsolete card video source remains in index.html")

path.write_text(html, encoding="utf-8")
