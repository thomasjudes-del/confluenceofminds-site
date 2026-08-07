(() => {
  const header = document.querySelector('.topbar');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 35);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => observer.observe(el));
  }

  // Keep the Botpress target stable: when the embed is supplied, replace only
  // the .botpress-placeholder content or mount the webchat inside #botpress-mount.
  window.AV_BOTPRESS_TARGET = '#botpress-mount';
})();
