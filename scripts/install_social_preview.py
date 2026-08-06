from pathlib import Path

path = Path("index.html")
html = path.read_text(encoding="utf-8")

start = "  <!-- Social sharing metadata -->"
end = "  <!-- End social sharing metadata -->"
block = """  <!-- Social sharing metadata -->
  <link rel="canonical" href="https://confluenceofminds.com/" />
  <meta property="og:site_name" content="Confluence of Minds" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://confluenceofminds.com/" />
  <meta property="og:title" content="Confluence of Minds" />
  <meta property="og:description" content="Stories, games, audio fiction and impossible worlds." />
  <meta property="og:image" content="https://confluenceofminds.com/assets/confluence-of-minds-social-preview-v1.jpg" />
  <meta property="og:image:secure_url" content="https://confluenceofminds.com/assets/confluence-of-minds-social-preview-v1.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Confluence of Minds — Too many ideas for one world." />
  <meta property="og:locale" content="en_US" />
  <meta property="og:locale:alternate" content="fr_FR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Confluence of Minds" />
  <meta name="twitter:description" content="Stories, games, audio fiction and impossible worlds." />
  <meta name="twitter:image" content="https://confluenceofminds.com/assets/confluence-of-minds-social-preview-v1.jpg" />
  <meta name="twitter:image:alt" content="Confluence of Minds — Too many ideas for one world." />
  <!-- End social sharing metadata -->"""

if start in html and end in html:
    before, rest = html.split(start, 1)
    _, after = rest.split(end, 1)
    html = before + block + after
else:
    needle = '  <meta name="theme-color" content="#eee8dc" />'
    if needle not in html:
        raise RuntimeError("Theme color anchor not found")
    html = html.replace(needle, needle + "\n" + block, 1)

path.write_text(html, encoding="utf-8")
