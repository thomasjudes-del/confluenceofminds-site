from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')

css = '  <link rel="stylesheet" href="video-lightbox-v1.css?v=20260806-video-lightbox-v1" />\n'
js = '  <script src="video-lightbox-v1.js?v=20260806-video-lightbox-v1"></script>\n'

if 'video-lightbox-v1.css?' not in html:
    html = html.replace('</head>', css + '</head>', 1)

if 'video-lightbox-v1.js?' not in html:
    anchor = '  <script src="i18n.js?v=20260806-bilingual-v1"></script>\n'
    if anchor not in html:
        raise RuntimeError('i18n script anchor not found')
    html = html.replace(anchor, anchor + js, 1)

path.write_text(html, encoding='utf-8')
