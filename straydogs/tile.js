(() => {
  'use strict';
  const video = document.querySelector('[data-straydogs-video]');
  if (!video) return;
  const card = video.closest('[data-media-container]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  function sync() {
    if (!visible || document.hidden || reducedMotion.matches) {
      video.pause();
      card.classList.remove('is-media-playing');
      return;
    }
    if (!video.getAttribute('src')) video.src = video.canPlayType('video/mp4') ? video.dataset.src : video.dataset.fallback;
    video.muted = true;
    const play = video.play();
    if (play && play.catch) play.catch(() => card.classList.remove('is-media-playing'));
  }
  video.addEventListener('playing', () => card.classList.add('is-media-playing'));
  video.addEventListener('error', () => {
    card.classList.remove('is-media-playing');
    if (video.getAttribute('src') === video.dataset.src) {
      video.src = video.dataset.fallback;
      sync();
    }
  });
  video.addEventListener('pause', () => card.classList.remove('is-media-playing'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
      sync();
    }, { threshold: [0, .15] });
    observer.observe(card);
  }
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
})();
