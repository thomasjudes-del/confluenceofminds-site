(() => {
  const R2_BASE = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev';

  /* Replace the degraded local About asset with the real HD video hosted on R2. */
  const aboutVideo = document.querySelector('.about__background');
  if (aboutVideo) {
    aboutVideo.muted = true;
    aboutVideo.loop = true;
    aboutVideo.playsInline = true;
    aboutVideo.preload = 'auto';
    aboutVideo.src = `${R2_BASE}/confluence-portal-1080.mp4.mp4?v=20260805-r2`;
    aboutVideo.load();
    const aboutPlay = aboutVideo.play();
    if (aboutPlay && typeof aboutPlay.catch === 'function') aboutPlay.catch(() => {});
  }

  document.querySelectorAll('.world-card__meta').forEach((meta) => meta.remove());

  const titanCard = document.querySelector('.world-card--titan');
  if (!titanCard) return;

  const cover = titanCard.querySelector('.world-cover');
  const body = titanCard.querySelector('.world-card__body');
  if (!cover || !body) return;

  titanCard.classList.add('world-card--streaming');

  /* Remove the old illustrated cover so its TITAN lettering cannot overlap. */
  cover.querySelectorAll('svg, .world-card__preview, .world-card__scrim').forEach((node) => node.remove());

  const video = document.createElement('video');
  video.className = 'world-card__preview';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.src = `${R2_BASE}/incident-on-titan-preview.mp4.mp4?v=20260805-r2`;

  const scrim = document.createElement('span');
  scrim.className = 'world-card__scrim';
  scrim.setAttribute('aria-hidden', 'true');

  cover.append(video, scrim, body);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const startPreview = () => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => titanCard.classList.add('is-previewing')).catch(() => {});
    } else {
      titanCard.classList.add('is-previewing');
    }
  };

  const stopPreview = (reset = true) => {
    video.pause();
    titanCard.classList.remove('is-previewing');
    if (reset) {
      try { video.currentTime = 0; } catch (_) {}
    }
  };

  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (desktopPointer.matches) {
    titanCard.addEventListener('pointerenter', startPreview);
    titanCard.addEventListener('pointerleave', () => stopPreview(true));
    titanCard.addEventListener('focusin', startPreview);
    titanCard.addEventListener('focusout', () => stopPreview(true));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= .65) startPreview();
        else stopPreview(false);
      });
    }, { threshold: [0, .35, .65, 1] });
    observer.observe(titanCard);
  }
})();
