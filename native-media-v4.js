(() => {
  const videos = [...document.querySelectorAll('video[data-viewport-video]')];
  if (!videos.length) return;

  const containerFor = (video) => video.closest('[data-media-container]') || video.parentElement;
  const sourceFor = (video) => video.querySelector('source[data-src], source[src]');
  const shouldPlay = new WeakSet();
  const retryTimers = new WeakMap();
  const retryCounts = new WeakMap();

  const prepare = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
  };

  const ensureLoaded = (video) => {
    const source = sourceFor(video);
    const deferredSrc = source?.dataset.src;
    if (!source || !deferredSrc || source.src) return;

    source.src = deferredSrc;
    video.preload = 'metadata';
    video.load();
  };

  const markReady = (video) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      containerFor(video)?.classList.add('is-media-ready');
    }
  };

  const clearRetry = (video) => {
    const timer = retryTimers.get(video);
    if (timer) window.clearTimeout(timer);
    retryTimers.delete(video);
  };

  const scheduleRetry = (video) => {
    clearRetry(video);
    if (!shouldPlay.has(video) || document.hidden) return;
    const attempts = retryCounts.get(video) || 0;
    if (attempts >= 3) return;
    retryCounts.set(video, attempts + 1);
    retryTimers.set(video, window.setTimeout(() => play(video), 900));
  };

  const play = (video, restart = false) => {
    prepare(video);
    shouldPlay.add(video);
    ensureLoaded(video);

    if (restart || video.ended) {
      try {
        video.currentTime = 0;
      } catch (_) {
        // Some browsers reject seeking until metadata is available.
      }
    }

    const result = video.play();
    if (result?.catch) result.catch(() => scheduleRetry(video));
  };

  const pause = (video) => {
    shouldPlay.delete(video);
    clearRetry(video);
    retryCounts.delete(video);
    video.pause();
    containerFor(video)?.classList.remove('is-media-playing');
  };

  videos.forEach((video) => {
    prepare(video);
    const container = containerFor(video);

    video.addEventListener('loadeddata', () => {
      markReady(video);
      if (shouldPlay.has(video)) play(video);
    });
    video.addEventListener('canplay', () => {
      markReady(video);
      if (shouldPlay.has(video) && video.paused) play(video);
    });
    video.addEventListener('playing', () => {
      clearRetry(video);
      retryCounts.delete(video);
      markReady(video);
      container?.classList.add('is-media-playing');
    });
    video.addEventListener('pause', () => container?.classList.remove('is-media-playing'));
    video.addEventListener('ended', () => {
      container?.classList.remove('is-media-playing');
      if (shouldPlay.has(video)) play(video, true);
    });
    video.addEventListener('stalled', () => scheduleRetry(video));
    video.addEventListener('error', () => {
      clearRetry(video);
      container?.classList.remove('is-media-ready');
      container?.classList.remove('is-media-playing');
    });

    const playFromInteraction = () => {
      retryCounts.delete(video);
      play(video);
    };
    container?.addEventListener('pointerenter', playFromInteraction, { passive: true });
    container?.addEventListener('pointerdown', playFromInteraction, { passive: true });
    container?.addEventListener('touchstart', playFromInteraction, { passive: true });
    container?.addEventListener('focusin', playFromInteraction);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector?.('video[data-viewport-video]') || entry.target;
      if (!(video instanceof HTMLVideoElement)) return;

      if (entry.isIntersecting && entry.intersectionRatio >= .05) play(video);
      else pause(video);
    });
  }, { threshold: [0, .05, .25], rootMargin: '96px 0px 96px 0px' });

  videos.forEach((video) => observer.observe(containerFor(video)));

  const replayVisible = () => {
    if (document.hidden) return;
    videos.forEach((video) => {
      const rect = containerFor(video).getBoundingClientRect();
      if (rect.bottom > -96 && rect.top < window.innerHeight + 96) play(video);
    });
  };

  window.addEventListener('pageshow', replayVisible);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) replayVisible();
  });
  window.addEventListener('pointerdown', replayVisible, { once: true, passive: true });
  window.addEventListener('touchstart', replayVisible, { once: true, passive: true });
  window.addEventListener('keydown', replayVisible, { once: true });
})();
