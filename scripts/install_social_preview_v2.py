from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')

old = 'https://confluenceofminds.com/assets/confluence-of-minds-social-preview-v1.jpg'
new = 'https://confluenceofminds.com/assets/confluence-of-minds-social-preview-v2.jpg'

if old not in html:
    raise RuntimeError('Existing social preview URL not found')

html = html.replace(old, new)
html = html.replace(
    'Confluence of Minds — Too many ideas for one world.',
    'Confluence of Minds — stories, games, audio fiction and impossible worlds.'
)

path.write_text(html, encoding='utf-8')
