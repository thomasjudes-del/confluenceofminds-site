(() => {
  const R2_BASE = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev';
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  if (!isMobile) return;

  const configureVideo = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
  };

  const tryPlay = (video) => {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };

  const about = document.querySelector('.about.about--video');
  const aboutVideo = about?.querySelector('.about__background');
  if (about && aboutVideo) {
    about.style.backgroundImage = "url('assets/about-poster-mobile.jpg?v=20260805-mobile-v3')";
    configureVideo(aboutVideo);
    aboutVideo.poster = 'assets/about-poster-mobile.jpg?v=20260805-mobile-v3';
    aboutVideo.src = `${R2_BASE}/confluence-portal-1080.mp4.mp4?v=20260805-mobile-v3`;
    aboutVideo.load();

    const startAbout = () => tryPlay(aboutVideo);
    aboutVideo.addEventListener('canplay', startAbout);
    aboutVideo.addEventListener('loadeddata', startAbout, { once: true });
    window.addEventListener('pageshow', startAbout);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) startAbout();
    });
    requestAnimationFrame(startAbout);
  }

  const titan = document.querySelector('.world-card--titan');
  if (!titan) return;

  titan.classList.add('world-card--streaming');
  const cover = titan.querySelector('.world-cover');
  const body = titan.querySelector('.world-card__body');
  if (!cover || !body) return;

  cover.querySelectorAll('svg, video, .world-card__scrim').forEach((node) => node.remove());
  cover.style.background = "#111917 url('assets/titan-poster-mobile.jpg?v=20260805-mobile-v3') center / cover no-repeat";

  const video = document.createElement('video');
  video.className = 'world-card__preview';
  video.setAttribute('aria-hidden', 'true');
  configureVideo(video);
  video.poster = 'assets/titan-poster-mobile.jpg?v=20260805-mobile-v3';
  video.src = `${R2_BASE}/incident-on-titan-preview.mp4.mp4?v=20260805-mobile-v3`;

  const scrim = document.createElement('span');
  scrim.className = 'world-card__scrim';
  scrim.setAttribute('aria-hidden', 'true');

  cover.append(video, scrim, body);
  video.load();

  const startTitan = () => {
    try {
      if (video.readyState >= 1 && video.currentTime < .15) video.currentTime = .7;
    } catch (_) {}
    tryPlay(video);
  };

  video.addEventListener('loadedmetadata', startTitan, { once: true });
  video.addEventListener('loadeddata', startTitan, { once: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) startTitan();
      else video.pause();
    });
  }, { threshold: .01, rootMargin: '180px 0px 180px 0px' });

  observer.observe(titan);
  requestAnimationFrame(startTitan);
})();
