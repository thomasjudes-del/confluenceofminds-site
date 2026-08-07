(() => {
  const header = document.querySelector('.topbar');
  const hero = document.querySelector('[data-hero]');
  const fragments = document.querySelector('[data-fragments]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  window.AV_ROBOTIQUES = { mountId: 'botpress-mount', replacePlaceholder(){ document.querySelector('.botpress-placeholder')?.remove(); } };

  const CHANNEL_ID = 'UCTn7Cckyd00h62YeXrGd4Sg';
  let ytPlayer;
  let scanIndex = 0;
  const scanLimit = 80;
  let scanning = false;

  const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isTarget = title => {
    const t = normalize(title);
    return t.includes('authentiques victimes') && (t.includes('preambule') || t.includes('episode pilote'));
  };
  const cueIndex = index => {
    scanIndex = index;
    scanning = true;
    ytPlayer.cuePlaylist({ listType: 'user_uploads', list: CHANNEL_ID, index, startSeconds: 0 });
  };
  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('youtube-preamble', {
      width: '100%', height: '100%',
      host: 'https://www.youtube-nocookie.com',
      playerVars: { controls: 1, rel: 0, playsinline: 1, hl: 'fr' },
      events: {
        onReady: () => cueIndex(0),
        onStateChange: ev => {
          if (!scanning || ev.data !== YT.PlayerState.CUED) return;
          const title = ytPlayer.getVideoData()?.title || '';
          if (isTarget(title)) { scanning = false; return; }
          const list = ytPlayer.getPlaylist?.() || [];
          const max = list.length ? Math.min(list.length, scanLimit) : scanLimit;
          if (scanIndex + 1 < max) cueIndex(scanIndex + 1);
          else scanning = false;
        },
        onError: () => { scanning = false; }
      }
    });
  };

  const ytApi = document.createElement('script');
  ytApi.src = 'https://www.youtube.com/iframe_api';
  ytApi.async = true;
  document.head.appendChild(ytApi);
})();