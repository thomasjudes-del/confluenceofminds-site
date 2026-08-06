from pathlib import Path
import re

VERSION = "20260806-native-v1"
R2_BASE = "https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev"

html_path = Path("index.html")
html = html_path.read_text(encoding="utf-8")

titan = f'''        <article class="world-card world-card--titan world-card--native reveal" data-portal="Incident on Titan" data-media-container>
          <a class="world-card__link" href="/titan/" aria-label="Enter Incident on Titan">
            <div class="world-cover">
              <img class="world-card__poster" src="assets/titan-poster-mobile.jpg?v={VERSION}" alt="" aria-hidden="true" />
              <video class="world-card__preview" data-viewport-video autoplay muted loop playsinline preload="auto" poster="assets/titan-poster-mobile.jpg?v={VERSION}" aria-hidden="true">
                <source src="{R2_BASE}/incident-on-titan-preview.mp4.mp4" type="video/mp4" />
              </video>
              <span class="world-card__scrim" aria-hidden="true"></span>
              <div class="world-card__body">
                <h3>Incident on Titan</h3>
                <p>A weekly collaborative science-fiction game. Choose a role, face a shared incident, and protect the colony while Sybille keeps part of the score hidden.</p>
                <span class="world-card__cta">Enter Titan <span aria-hidden="true">↗</span></span>
              </div>
            </div>
          </a>
        </article>'''

html, count = re.subn(
    r'\s*<article class="world-card world-card--titan\b.*?</article>',
    "\n" + titan,
    html,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError(f"Titan card replacement count: {count}")

about = f'''    <section id="about" class="about about--video about--native" aria-labelledby="about-title" data-media-container>
      <img class="about__poster" src="assets/about-poster-mobile.jpg?v={VERSION}" alt="" aria-hidden="true" />
      <video class="about__background" data-viewport-video autoplay muted loop playsinline preload="auto" poster="assets/about-poster-mobile.jpg?v={VERSION}" aria-hidden="true">
        <source src="{R2_BASE}/confluence-portal-1080.mp4.mp4" type="video/mp4" />
      </video>
      <div class="about__veil" aria-hidden="true"></div>
      <div class="about-copy reveal">
        <p class="section-label">Different doors. One universe.</p>
        <h2 id="about-title">Come for one world.<br />Get lost in a universe.</h2>
        <p>Confluence of Minds brings together stories, games, visual series and sound worlds that were never meant to look alike. Each one opens its own door; together, they form a territory still expanding.</p>
      </div>
    </section>'''

html, count = re.subn(
    r'\s*<section id="about" class="about about--video(?: about--native)?".*?</section>',
    "\n" + about,
    html,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError(f"About replacement count: {count}")

html = re.sub(r'\n\s*<link rel="stylesheet" href="cards-streaming-v1\.css[^"]*"\s*/>', "", html)
html = re.sub(r'\n\s*<link rel="stylesheet" href="mobile-media-v3\.css[^"]*"\s*/>', "", html)
html = re.sub(r'\n\s*<link rel="stylesheet" href="native-media-v4\.css[^"]*"\s*/>', "", html)
html = re.sub(
    r'(<link rel="stylesheet" href="styles\.css[^"]*"\s*/>)',
    rf'\1\n  <link rel="stylesheet" href="native-media-v4.css?v={VERSION}" />',
    html,
    count=1,
)

html = re.sub(r'\n\s*<script src="cards-streaming-v1\.js[^"]*"></script>', "", html)
html = re.sub(r'\n\s*<script src="mobile-media-v3\.js[^"]*"></script>', "", html)
html = re.sub(r'\n\s*<script src="native-media-v4\.js[^"]*"></script>', "", html)
html = html.replace("</body>", f'  <script src="native-media-v4.js?v={VERSION}"></script>\n</body>')

html_path.write_text(html, encoding="utf-8")
