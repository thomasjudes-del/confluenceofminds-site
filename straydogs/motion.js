(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('.scene')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  function configure() {
    if (observer) observer.disconnect();
    scenes.forEach(scene => scene.classList.remove('playing'));
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('playing');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.45 });
    scenes.forEach(scene => observer.observe(scene));
  }
  reducedMotion.addEventListener('change', configure);
  configure();
})();
