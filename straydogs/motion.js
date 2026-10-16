(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('.scene, .hero-pack')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  let observer;
  function sync() {
    scenes.forEach(scene => scene.classList.toggle('motion-paused', document.hidden || !visible.has(scene)));
  }
  function configure() {
    if (observer) observer.disconnect();
    visible.clear();
    scenes.forEach(scene => scene.classList.remove('playing', 'motion-paused'));
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= .2) {
          visible.add(entry.target);
          entry.target.classList.add('playing');
        } else visible.delete(entry.target);
      });
      sync();
    }, { threshold: [0, .2] });
    scenes.forEach(scene => observer.observe(scene));
  }
  reducedMotion.addEventListener('change', configure);
  document.addEventListener('visibilitychange', sync);
  configure();
})();
