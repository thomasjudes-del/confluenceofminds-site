(() => {
  const R2_ROOT = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev';

  const installCardVideo = (selector, filename) => {
    const card = document.querySelector(selector);
    if (!card) return;

    const cover = card.querySelector('.world-cover');
    if (!cover) return;

    card.classList.add('world-card--native');
    card.setAttribute('data-media-container', '');

    let video = cover.querySelector('video[data-viewport-video]');
    if (!video) {
      video = document.createElement('video');
      video.className = 'world-card__preview';
      video.setAttribute('data-viewport-video', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'metadata');
      video.setAttribute('aria-hidden', 'true');

      const source = document.createElement('source');
      source.type = 'video/mp4';
      video.appendChild(source);

      const artwork = cover.querySelector('svg, img');
      if (artwork) artwork.insertAdjacentElement('afterend', video);
      else cover.prepend(video);
    }

    let source = video.querySelector('source');
    if (!source) {
      source = document.createElement('source');
      source.type = 'video/mp4';
      video.appendChild(source);
    }

    source.setAttribute('src', `${R2_ROOT}/${filename}`);
    source.setAttribute('type', 'video/mp4');
    video.load();

    if (!cover.querySelector('.world-card__scrim')) {
      const scrim = document.createElement('span');
      scrim.className = 'world-card__scrim';
      scrim.setAttribute('aria-hidden', 'true');
      video.insertAdjacentElement('afterend', scrim);
    }
  };

  const installSnowWhiteCard = () => {
    if (document.querySelector('.world-card--snowwhite')) return;

    const anchor = document.querySelector('.world-card--katephomi');
    const grid = anchor?.parentElement || document.querySelector('.world-grid');
    if (!grid) return;

    const card = document.createElement('article');
    card.className = 'world-card world-card--snowwhite world-card--native is-visible';
    card.setAttribute('data-portal', 'Snow White and the Queen of Ashes');
    card.setAttribute('data-media-container', '');
    card.innerHTML = `
      <div class="world-cover">
        <svg viewBox="0 0 640 360" aria-hidden="true">
          <defs>
            <linearGradient id="snowAshSky" x1="0" y1="0" x2="1" y2="1">
              <stop stop-color="#eef0e8"/>
              <stop offset=".45" stop-color="#738174"/>
              <stop offset="1" stop-color="#171a18"/>
            </linearGradient>
            <radialGradient id="snowAshGlow" cx="72%" cy="28%" r="42%">
              <stop stop-color="#dfe9d9" stop-opacity=".82"/>
              <stop offset="1" stop-color="#dfe9d9" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="640" height="360" fill="url(#snowAshSky)"/>
          <rect width="640" height="360" fill="url(#snowAshGlow)"/>
          <path d="M0 298c75-67 141-91 213-75 61 14 98 45 146 73 73-57 157-72 281-31v95H0Z" fill="#151b17"/>
          <g fill="#202922" opacity=".92">
            <path d="M68 270l31-128 28 128Z"/><path d="M118 286l38-166 35 166Z"/>
            <path d="M458 284l33-153 34 153Z"/><path d="M515 290l27-126 31 126Z"/>
          </g>
          <circle cx="390" cy="143" r="39" fill="#791d24"/>
          <path d="M388 103c-2-20 9-37 29-51" fill="none" stroke="#334a34" stroke-width="9" stroke-linecap="round"/>
          <g fill="#d8d9d2" opacity=".38">
            <circle cx="89" cy="82" r="3"/><circle cx="146" cy="62" r="4"/><circle cx="207" cy="91" r="2.5"/>
            <circle cx="279" cy="56" r="3"/><circle cx="337" cy="84" r="4"/><circle cx="441" cy="69" r="3"/>
            <circle cx="511" cy="92" r="3.5"/><circle cx="570" cy="57" r="2.5"/>
          </g>
          <text x="34" y="71" fill="#f3f1e8" font-family="Cinzel, serif" font-size="18" letter-spacing="4">AN ECOLOGICAL FAIRY TALE</text>
          <text x="32" y="135" fill="#fff" font-family="Cinzel, serif" font-size="46">SNOW WHITE</text>
          <text x="33" y="188" fill="#fff" font-family="Cinzel, serif" font-size="28" letter-spacing="3">AND THE QUEEN OF ASHES</text>
        </svg>
      </div>
      <div class="world-card__body">
        <div class="world-card__meta"><span>Ecological fairy tale</span><span>Reimagining</span></div>
        <h3>Snow White and the Queen of Ashes</h3>
        <p>A contemporary ecological retelling of the Grimm tale, still deeply enchanted.</p>
      </div>
    `;

    if (anchor) anchor.insertAdjacentElement('beforebegin', card);
    else grid.append(card);
  };

  document.querySelectorAll('.world-card--wecan, .world-card--books').forEach((card) => card.remove());
  installSnowWhiteCard();

  installCardVideo('.world-card--titan', 'Incident_on_Titan_Teaser_Minimal_Cut_HD_Final.mp4');
  installCardVideo('.world-card--anjin', 'Good%20Anjin_of_the_Shogun_Teaser_Cinematic_V4_1080p.mp4');
  installCardVideo('.world-card--katephomi', 'A_la_recherche_de_Katephomi_Kitembe_Teaser_V4_Carried_by_Hope.mp4');
  installCardVideo('.world-card--victims', 'Authentiques_Victimes_Cinematic_Teaser_V2_Nils_Frahm.mp4');
  installCardVideo('.world-card--aitalent', 'AI_Talent_Mini_Teaser_V2_Show.mp4');
  installCardVideo('.world-card--silmea', 'SILMEA_Films_Sonores_Teaser_V3_Court_Cinematique.mp4');
  installCardVideo('.world-card--snowwhite', 'Snow_White_Queen_of_Ashes_Cinematic_Teaser_compressed.mp4');

  const videos = [...document.querySelectorAll('[data-viewport-video]')];
  if (!videos.length) return;

  const containerFor = (video) => video.closest('[data-media-container]') || video.parentElement;

  const prepare = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
  };

  const play = (video) => {
    prepare(video);
    const result = video.play();
    if (result?.catch) result.catch(() => {});
  };

  const pause = (video) => {
    video.pause();
    containerFor(video)?.classList.remove('is-media-playing');
  };

  videos.forEach((video) => {
    prepare(video);
    const container = containerFor(video);
    const markReady = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        container?.classList.add('is-media-ready');
      }
    };

    video.addEventListener('loadeddata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('playing', () => {
      markReady();
      container?.classList.add('is-media-playing');
    });
    video.addEventListener('pause', () => container?.classList.remove('is-media-playing'));
    video.addEventListener('ended', () => container?.classList.remove('is-media-playing'));
    video.addEventListener('error', () => {
      container?.classList.remove('is-media-ready');
      container?.classList.remove('is-media-playing');
    });

    container?.addEventListener('pointerenter', () => play(video), { passive: true });
    container?.addEventListener('touchstart', () => play(video), { passive: true });
    container?.addEventListener('focusin', () => play(video));

    markReady();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector?.('[data-viewport-video]') || entry.target;
      if (!(video instanceof HTMLVideoElement)) return;
      if (entry.isIntersecting && entry.intersectionRatio > .01) play(video);
      else pause(video);
    });
  }, { threshold: [0, .01, .1, .25], rootMargin: '320px 0px 320px 0px' });

  videos.forEach((video) => observer.observe(containerFor(video)));

  const retryVisible = () => {
    videos.forEach((video) => {
      const rect = containerFor(video).getBoundingClientRect();
      if (rect.bottom > -320 && rect.top < window.innerHeight + 320) play(video);
    });
  };

  requestAnimationFrame(retryVisible);
  window.addEventListener('pageshow', retryVisible);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) retryVisible(); });
  window.addEventListener('pointerdown', retryVisible, { once: true, passive: true });
  window.addEventListener('touchstart', retryVisible, { once: true, passive: true });
  window.addEventListener('keydown', retryVisible, { once: true });
})();
