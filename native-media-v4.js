(() => {
  // Trailer sources and authentic poster frames live directly in both homepages.
  document.querySelectorAll('.world-card--wecan, .world-card--books').forEach((card) => card.remove());

  const videos = [...document.querySelectorAll('[data-viewport-video]')];
  if (!videos.length) return;

  const containerFor = (video) => video.closest('[data-media-container]') || video.parentElement;

  const prepare = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = false;
    video.preload = 'none';
    video.setAttribute('muted', '');
    video.removeAttribute('autoplay');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
  };

  const play = (video) => {
    prepare(video);
    video.preload = 'metadata';
    const result = video.play();
    if (result?.catch) result.catch((error) => {
      // Keep the poster, but expose why playback did not start for diagnosis.
      if (error?.name !== 'AbortError') {
        video.dataset.playbackError = ['NotAllowedError', 'NotSupportedError'].includes(error?.name)
          ? error.name : 'PlaybackError';
      }
    });
  };

  const pause = (video) => {
    video.pause();
    containerFor(video)?.classList.remove('is-media-playing');
  };

  videos.forEach((video) => {
    prepare(video);
    const container = containerFor(video);
    const useSameOriginFallback = () => {
      if (!video.dataset.mediaFallback || video.dataset.mediaFallbackUsed) return;
      video.dataset.mediaFallbackUsed = 'true';
      video.src = video.dataset.mediaFallback;
      video.load();
      const rect = container.getBoundingClientRect();
      if (!document.hidden && !document.documentElement.classList.contains('has-video-lightbox') &&
          rect.bottom > -320 && rect.top < window.innerHeight + 320) play(video);
    };
    // A rejected autoplay permission is not a network failure: keep the real poster.
    video.querySelector('source')?.addEventListener('error', useSameOriginFallback);
    video.addEventListener('error', useSameOriginFallback);
    video.addEventListener('playing', () => {
      delete video.dataset.playbackError;
      container?.classList.add('is-media-playing');
    });
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
    // Do not restart background previews while the full video is open.
    if (document.documentElement.classList.contains('has-video-lightbox')) return;
    videos.forEach((video) => {
      const rect = containerFor(video).getBoundingClientRect();
      if (rect.bottom > -320 && rect.top < window.innerHeight + 320) play(video);
    });
  };

  requestAnimationFrame(retryVisible);
  window.addEventListener('pageshow', retryVisible);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) retryVisible(); });
  window.addEventListener('pointerdown', retryVisible, { passive: true });
  window.addEventListener('touchstart', retryVisible, { passive: true });
  window.addEventListener('keydown', retryVisible);
})();
