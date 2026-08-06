from pathlib import Path
import re

path = Path("index.html")
html = path.read_text(encoding="utf-8")

pattern = re.compile(
    r'(<article class="world-card world-card--victims)( reveal" data-portal="Authentiques Victimes")([^>]*>)(.*?</article>)',
    re.DOTALL,
)
match = pattern.search(html)
if not match:
    raise RuntimeError("Authentiques Victimes card not found")

block = match.group(0)
if "Authentiques_Victimes_Cinematic_Teaser_V2_Nils_Frahm.mp4" in block:
    raise RuntimeError("Authentiques Victimes video is already installed")

updated = block.replace(
    '<article class="world-card world-card--victims reveal" data-portal="Authentiques Victimes">',
    '<article class="world-card world-card--victims world-card--native reveal" data-portal="Authentiques Victimes" data-media-container>',
    1,
)

video_markup = '''
              <video class="world-card__preview" data-viewport-video autoplay muted loop playsinline preload="metadata" aria-hidden="true">
                <source src="https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev/Authentiques_Victimes_Cinematic_Teaser_V2_Nils_Frahm.mp4" type="video/mp4" />
              </video>
              <span class="world-card__scrim" aria-hidden="true"></span>'''

updated = updated.replace("            </svg>\n          </div>", "            </svg>" + video_markup + "\n          </div>", 1)

html = html[:match.start()] + updated + html[match.end():]
path.write_text(html, encoding="utf-8")
