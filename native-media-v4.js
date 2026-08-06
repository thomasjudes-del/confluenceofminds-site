(() => {
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
