from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')

old_article = '<article class="world-card world-card--victims reveal" data-portal="Authentiques Victimes">'
new_article = '<article class="world-card world-card--victims world-card--native reveal" data-portal="Authentiques Victimes" data-media-container>'
if old_article not in html:
    raise RuntimeError('Authentiques Victimes card opening not found')
html = html.replace(old_article, new_article, 1)

marker = '''              <rect x="30" y="230" width="247" height="8" fill="#7d2720"/>
            </svg>
          </div>'''
replacement = '''              <rect x="30" y="230" width="247" height="8" fill="#7d2720"/>
            </svg>
            <video class="world-card__preview" data-viewport-video autoplay muted loop playsinline preload="metadata" aria-hidden="true">
              <source src="https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev/Authentiques_Victimes_Cinematic_Teaser_V2_Nils_Frahm.mp4" type="video/mp4" />
            </video>
            <span class="world-card__scrim" aria-hidden="true"></span>
          </div>'''
if marker not in html:
    raise RuntimeError('Authentiques Victimes SVG closing marker not found')
html = html.replace(marker, replacement, 1)

html = html.replace(
    'native-media-v4.js?v=20260806-world-order-v1',
    'native-media-v4.js?v=20260806-victims-video-v1',
    1,
)
html = html.replace(
    'video-lightbox-v1.js?v=20260806-video-lightbox-v1',
    'video-lightbox-v1.js?v=20260806-victims-video-v1',
    1,
)

path.write_text(html, encoding='utf-8')
