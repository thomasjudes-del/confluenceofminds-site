(() => {
  const v5 = document.createElement('link');
  v5.rel = 'stylesheet';
  v5.href = 'v5.css?v=20260807-av-v5';
  document.head.appendChild(v5);

  const header = document.querySelector('.topbar');
  const hero = document.querySelector('[data-hero]');
  const visual = document.querySelector('[data-parallax-visual]');
  const cloud = document.querySelector('[data-quote-cloud]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onScroll = () => {
    const y = window.scrollY || 0;
    header?.classList.toggle('is-scrolled', y > 35);
    if (reduced) return;
    if (hero) {
      const p = Math.max(0, Math.min(1, y / Math.max(1, hero.offsetHeight)));
      hero.style.setProperty('--hero-y', `${p * 14}px`);
      hero.style.setProperty('--hero-scale', `${1 + p * .012}`);
    }
    if (visual) {
      const r = visual.getBoundingClientRect();
      const offset = Math.max(-14, Math.min(14, -(r.top + r.height / 2 - innerHeight / 2) * .025));
      visual.style.setProperty('--visual-y', `${offset}px`);
    }
    if (cloud) {
      const r = cloud.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight));
      cloud.style.setProperty('--cloud-bg-y', `${p * 18}px`);
      cloud.style.setProperty('--pen-y', `${p * -23}px`);
      cloud.querySelectorAll('.quote-cloud__quote').forEach((el, i) => {
        const depth = Number(el.style.getPropertyValue('--depth')) || 1;
        const lane = (i % 5) - 2;
        el.style.setProperty('--scroll-x', `${p * lane * 8 * depth}px`);
        el.style.setProperty('--scroll-y', `${p * ((i % 3) - 1) * 15 * depth}px`);
      });
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  const items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) items.forEach(el => el.classList.add('is-visible'));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .1, rootMargin: '0px 0px -5% 0px' });
    items.forEach(el => observer.observe(el));
  }

  const reader = document.querySelector('[data-reader]');
  const openReader = () => {
    if (!reader) return;
    if (!reader.open) reader.showModal();
    document.documentElement.style.overflow = 'hidden';
  };
  const closeReader = () => { reader?.close(); document.documentElement.style.overflow = ''; };
  document.querySelectorAll('[data-open-reader]').forEach(el => el.addEventListener('click', openReader));
  document.querySelector('[data-close-reader]')?.addEventListener('click', closeReader);
  reader?.addEventListener('click', e => { if (e.target === reader) closeReader(); });
  reader?.addEventListener('close', () => { document.documentElement.style.overflow = ''; });

  window.AV_BOTPRESS_TARGET = '#botpress-mount';
  window.AV_ROBOTIQUES = { mountId: 'botpress-mount', replacePlaceholder() { document.querySelector('.botpress-placeholder')?.remove(); } };
})();
