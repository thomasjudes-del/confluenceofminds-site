(() => {
  const header = document.querySelector('.topbar');
  const hero = document.querySelector('[data-hero]');
  const fragments = document.querySelector('[data-fragments]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Use the original high-quality hero asset hosted in the Confluence of Minds
  // Cloudflare R2 media bucket. The query string intentionally busts stale CDN/browser caches.
  const HERO_URL = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev/pour%20hero.png?v=20260807-av-hero2';
  const heroImage = hero?.querySelector('.hero__image');
  if (heroImage) {
    heroImage.src = HERO_URL;
    heroImage.removeAttribute('srcset');
  }

  const onScroll = () => {
    const y = window.scrollY || 0;
    header?.classList.toggle('is-scrolled', y > 35);
    if (reduced) return;
    if (hero) {
      const p = Math.max(0, Math.min(1, y / Math.max(1, hero.offsetHeight)));
      hero.style.setProperty('--hero-y', `${p * 8}px`);
    }
    if (fragments) {
      const r = fragments.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight));
      fragments.style.setProperty('--frag-bg-y', `${p * 14}px`);
      fragments.querySelectorAll('.fragment').forEach((el, i) => {
        el.style.setProperty('--sx', `${p * (((i % 4) - 1.5) * 7)}px`);
        el.style.setProperty('--sy', `${p * (((i % 3) - 1) * 11)}px`);
      });
    }
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) items.forEach(el => el.classList.add('is-visible'));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .08, rootMargin: '0px 0px -5% 0px' });
    items.forEach(el => observer.observe(el));
  }

  window.AV_BOTPRESS_TARGET = '#botpress-mount';
  window.AV_ROBOTIQUES = {
    mountId: 'botpress-mount',
    replacePlaceholder(){ document.querySelector('.botpress-placeholder')?.remove(); }
  };

  // Directly load the correct SILMEA Authentiques Victimes preamble video.
  // Avoid playlist scanning, which could resolve to an unrelated upload.
  const PREAMBLE_VIDEO_ID = 'orhk4WoPYfs';

  window.onYouTubeIframeAPIReady = () => {
    new YT.Player('youtube-preamble', {
      width: '100%',
      height: '100%',
      videoId: PREAMBLE_VIDEO_ID,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        controls: 1,
        rel: 0,
        playsinline: 1,
        hl: 'fr'
      }
    });
  };

  const ytApi = document.createElement('script');
  ytApi.src = 'https://www.youtube.com/iframe_api';
  ytApi.async = true;
  document.head.appendChild(ytApi);
})();