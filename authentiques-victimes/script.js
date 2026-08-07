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
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    items.forEach(el => observer.observe(el));
  }

  // Stable mount point for the future Botpress embed.
  window.AV_BOTPRESS_TARGET = '#botpress-mount';
})();
