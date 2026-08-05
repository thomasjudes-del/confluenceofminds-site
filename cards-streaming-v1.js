(() => {
  if (window.matchMedia('(max-width: 760px)').matches) return;

  const R2_BASE = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.world-card__meta').forEach((meta) => meta.remove());

  const about = document.querySelector('.about.about--video');
  const aboutVideo = about?.querySelector('.about__background');
  if (about && aboutVideo) {
    about.style.backgroundImage = "url('assets/about-poster-mobile.jpg?v=20260805-stable-v1')";
    aboutVideo.poster = 'assets/about-poster-mobile.jpg?v=20260805-stable-v1';
    aboutVideo.src = `${R2_BASE}/confluence-portal-1080.mp4.mp4?v=20260805-stable-v1`;
    aboutVideo.muted = true;
    aboutVideo.defaultMuted = true;
    aboutVideo.loop = true;
    aboutVideo.playsInline = true;
    aboutVideo.preload = 'metadata';
    aboutVideo.setAttribute('muted', '');
    aboutVideo.setAttribute('playsinline', '');
    aboutVideo.setAttribute('webkit-playsinline', '');
    aboutVideo.addEventListener('playing', () => about.classList.add('is-video-playing'));
    aboutVideo.addEventListener('pause', () => about.classList.remove('is-video-playing'));
    aboutVideo.addEventListener('error', () => about.classList.remove('is-video-playing'));
    if (!reducedMotion) {
      const promise = aboutVideo.play();
      if (promise?.catch) promise.catch(() => {});
    }
  }

  const titan = document.querySelector('.world-card--titan');
  if (!titan) return;

  const cover = titan.querySelector('.world-cover');
  const body = titan.querySelector('.world-card__body');
  if (!cover || !body) return;

  titan.classList.add('world-card--streaming');
  cover.querySelectorAll('svg, video, img, .world-card__scrim').forEach((node) => node.remove());

  const poster = document.createElement('img');
  poster.className = 'world-card__poster';
  poster.src = 'assets/titan-poster-mobile.jpg?v=20260805-stable-v1';
  poster.alt = '';
  poster.setAttribute('aria-hidden', 'true');

  const video = document.createElement('video');
  video.className = 'world-card__preview';
  video.src = `${R2_BASE}/incident-on-titan-preview.mp4.mp4?v=20260805-stable-v1`;
  video.poster = poster.src;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-hidden', 'true');

  const scrim = document.createElement('span');
  scrim.className = 'world-card__scrim';
  scrim.setAttribute('aria-hidden', 'true');

  cover.append(poster, video, scrim, body);

  const play = () => {
    if (reducedMotion) return;
    const promise = video.play();
    if (promise?.catch) promise.catch(() => {});
  };

  const stop = () => {
    video.pause();
    titan.classList.remove('is-video-playing');
  };

  video.addEventListener('playing', () => titan.classList.add('is-video-playing'));
  video.addEventListener('pause', () => titan.classList.remove('is-video-playing'));
  video.addEventListener('error', () => titan.classList.remove('is-video-playing'));

  titan.addEventListener('pointerenter', play);
  titan.addEventListener('pointerleave', stop);
  titan.addEventListener('focusin', play);
  titan.addEventListener('focusout', stop);
})();