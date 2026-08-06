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

  installCardVideo('.world-card--titan', 'Incident_on_Titan_Teaser_Minimal_Cut_HD_Final.mp4');
  installCardVideo('.world-card--katephomi', 'A_la_recherche_de_Katephomi_Kitembe_Teaser_V4_Carried_by_Hope.mp4');
  installCardVideo('.world-card--silmea', 'SILMEA_Films_Sonores_Teaser_V3_Court_Cinematique.mp4');

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
    video.addEventListener('playing', () => container?.classList.add('is-media-playing'));
    video.addEventListener('pause', () => container?.classList.remove('is-media-playing'));
    video.addEventListener('ended', () => container?.classList.remove('is-media-playing'));
    video.addEventListener('error', () => container?.classList.remove('is-media-playing'));
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
