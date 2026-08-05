(() => {
  if (!window.matchMedia('(max-width: 760px)').matches) return;

  const R2_BASE = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const configureVideo = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
  };

  const playSafely = (video) => {
    if (reducedMotion) return;
    const result = video.play();
    if (result?.catch) result.catch(() => {});
  };

  document.querySelectorAll('.world-card__meta').forEach((meta) => meta.remove());

  const about = document.querySelector('.about.about--video');
  const aboutVideo = about?.querySelector('.about__background');
  if (about && aboutVideo) {
    const aboutPoster = 'assets/about-poster-mobile.jpg?v=20260805-stable-v2';
    about.style.backgroundImage = `url('${aboutPoster}')`;
    about.style.backgroundPosition = 'center';
    about.style.backgroundSize = 'cover';

    configureVideo(aboutVideo);
    aboutVideo.poster = aboutPoster;
    aboutVideo.src = `${R2_BASE}/confluence-portal-1080.mp4.mp4?v=20260805-stable-v2`;
    aboutVideo.autoplay = true;
    aboutVideo.setAttribute('autoplay', '');

    aboutVideo.addEventListener('playing', () => about.classList.add('is-video-playing'));
    aboutVideo.addEventListener('pause', () => about.classList.remove('is-video-playing'));
    aboutVideo.addEventListener('error', () => about.classList.remove('is-video-playing'));

    const startAbout = () => playSafely(aboutVideo);
    aboutVideo.load();
    requestAnimationFrame(startAbout);
    window.addEventListener('pageshow', startAbout);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) startAbout();
    });
    about.addEventListener('touchstart', startAbout, { passive: true });
    about.addEventListener('pointerdown', startAbout, { passive: true });
  }

  const titan = document.querySelector('.world-card--titan');
  if (!titan) return;

  const cover = titan.querySelector('.world-cover');
  const body = titan.querySelector('.world-card__body');
  if (!cover || !body) return;

  titan.classList.add('world-card--streaming');
  cover.querySelectorAll('svg, video, img, .world-card__scrim').forEach((node) => node.remove());

  const titanPoster = 'assets/titan-poster-mobile.jpg?v=20260805-stable-v2';

  const poster = document.createElement('img');
  poster.className = 'world-card__poster';
  poster.src = titanPoster;
  poster.alt = '';
  poster.setAttribute('aria-hidden', 'true');

  const video = document.createElement('video');
  video.className = 'world-card__preview';
  video.src = `${R2_BASE}/incident-on-titan-preview.mp4.mp4?v=20260805-stable-v2`;
  video.poster = titanPoster;
  configureVideo(video);
  video.autoplay = true;
  video.setAttribute('autoplay', '');
  video.setAttribute('aria-hidden', 'true');

  const scrim = document.createElement('span');
  scrim.className = 'world-card__scrim';
  scrim.setAttribute('aria-hidden', 'true');

  cover.append(poster, video, scrim, body);

  video.addEventListener('playing', () => titan.classList.add('is-video-playing'));
  video.addEventListener('pause', () => titan.classList.remove('is-video-playing'));
  video.addEventListener('error', () => titan.classList.remove('is-video-playing'));

  const startTitan = () => playSafely(video);
  video.load();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) startTitan();
      else {
        video.pause();
        titan.classList.remove('is-video-playing');
      }
    });
  }, { threshold: 0.01, rootMargin: '160px 0px 160px 0px' });

  observer.observe(titan);
  titan.addEventListener('touchstart', startTitan, { passive: true });
  titan.addEventListener('pointerdown', startTitan, { passive: true });
  requestAnimationFrame(startTitan);
})();