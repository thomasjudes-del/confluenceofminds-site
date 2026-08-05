(() => {
  const R2_BASE = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev';
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const configureInlineVideo = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
  };

  const safePlay = (video, onSuccess) => {
    const promise = video.play();
    if (promise && typeof promise.then === 'function') {
      promise.then(() => onSuccess?.()).catch(() => {});
    } else {
      onSuccess?.();
    }
  };

  const revealARealFrame = (video, preferredTime = .7) => {
    if (!Number.isFinite(video.duration) || video.duration <= .2) return;
    if (video.currentTime > .08) return;
    try {
      video.currentTime = Math.min(preferredTime, Math.max(.1, video.duration * .18));
    } catch (_) {}
  };

  const aboutVideo = document.querySelector('.about__background');
  if (aboutVideo) {
    configureInlineVideo(aboutVideo);
    aboutVideo.autoplay = true;
    aboutVideo.setAttribute('autoplay', '');
    aboutVideo.src = `${R2_BASE}/confluence-portal-1080.mp4.mp4?v=20260805-mobile-v3`;

    const startAbout = () => {
      revealARealFrame(aboutVideo, .8);
      if (!reducedMotion) safePlay(aboutVideo);
    };

    aboutVideo.addEventListener('loadedmetadata', startAbout, { once: true });
    aboutVideo.addEventListener('loadeddata', startAbout, { once: true });
    aboutVideo.addEventListener('canplay', startAbout);
    window.addEventListener('pageshow', startAbout);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) startAbout();
    });
    aboutVideo.load();
  }

  document.querySelectorAll('.world-card__meta').forEach((meta) => meta.remove());

  const titanCard = document.querySelector('.world-card--titan');
  if (!titanCard) return;

  const cover = titanCard.querySelector('.world-cover');
  const body = titanCard.querySelector('.world-card__body');
  if (!cover || !body) return;

  titanCard.classList.add('world-card--streaming');
  cover.querySelectorAll('svg, .world-card__preview, .world-card__scrim').forEach((node) => node.remove());

  const video = document.createElement('video');
  video.className = 'world-card__preview';
  configureInlineVideo(video);
  video.setAttribute('aria-hidden', 'true');
  video.src = `${R2_BASE}/incident-on-titan-preview.mp4.mp4?v=20260805-mobile-v3`;

  const scrim = document.createElement('span');
  scrim.className = 'world-card__scrim';
  scrim.setAttribute('aria-hidden', 'true');

  cover.append(video, scrim, body);

  const startPreview = () => {
    revealARealFrame(video, .65);
    if (reducedMotion) return;
    safePlay(video, () => titanCard.classList.add('is-previewing'));
  };

  const stopPreview = (reset = true) => {
    video.pause();
    titanCard.classList.remove('is-previewing');
    if (reset) {
      try { video.currentTime = .65; } catch (_) {}
    }
  };

  video.addEventListener('loadedmetadata', () => revealARealFrame(video, .65), { once: true });
  video.addEventListener('loadeddata', () => {
    revealARealFrame(video, .65);
    titanCard.classList.add('has-video-frame');
  }, { once: true });
  video.load();

  if (coarsePointer.matches) {
    video.autoplay = true;
    video.setAttribute('autoplay', '');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= .01) startPreview();
        else stopPreview(false);
      });
    }, { threshold: [0, .01, .12, .35, .65, 1], rootMargin: '180px 0px 180px 0px' });

    observer.observe(titanCard);
    requestAnimationFrame(() => {
      const rect = titanCard.getBoundingClientRect();
      if (rect.top < window.innerHeight + 180 && rect.bottom > -180) startPreview();
    });
  } else {
    titanCard.addEventListener('pointerenter', startPreview);
    titanCard.addEventListener('pointerleave', () => stopPreview(true));
    titanCard.addEventListener('focusin', startPreview);
    titanCard.addEventListener('focusout', () => stopPreview(true));
  }
})();

/* Mobile v3 is loaded separately so its strict overrides always win over legacy mobile rules. */
if (window.matchMedia('(max-width: 760px)').matches) {
  const mobileStyles = document.createElement('link');
  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = 'mobile-media-v3.css?v=20260805-mobile-v3';
  document.head.appendChild(mobileStyles);

  const mobileScript = document.createElement('script');
  mobileScript.src = 'mobile-media-v3.js?v=20260805-mobile-v3';
  mobileScript.defer = true;
  document.body.appendChild(mobileScript);
}
