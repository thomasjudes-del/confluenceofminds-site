(() => {
  const header = document.querySelector('.topbar');
  const hero = document.querySelector('[data-hero]');
  const fragments = document.querySelector('[data-fragments]');
  const doubt = document.querySelector('.doubt');
  const doubtImage = document.querySelector('.doubt__image');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  const heroImage = hero?.querySelector('.hero__image');
  if (heroImage) {
    heroImage.src = 'assets/photos/hero.webp?v=20260807-final';
    heroImage.removeAttribute('srcset');
  }
  if (doubtImage) {
    doubtImage.src = 'assets/photos/plagiarism.webp?v=20260807-final';
    doubtImage.removeAttribute('srcset');
    doubtImage.dataset.userArtwork = 'true';
    doubt?.classList.add('has-user-artwork');
  }

  // Defensive cleanup of the former fountain-pen cursor. It produced a fallback '?' on some mobile browsers.
  document.documentElement.classList.remove('av-pen-active');
  document.querySelectorAll('.av-pen-cursor').forEach(el => el.remove());

  const interactionStyles = document.createElement('style');
  interactionStyles.id = 'av-interactions-v8';
  interactionStyles.textContent = `
    .hero__image{transform:translate3d(0,var(--hero-y,0),0) scale(1.07)}
    .hero__origin{max-width:820px;margin:19px 0 0;padding-left:16px;border-left:1px solid rgba(216,182,125,.78);font:500 clamp(16px,1.25vw,20px)/1.42 var(--serif);color:#f0e8dc;text-shadow:0 3px 14px rgba(0,0,0,.48)}
    .hero__origin strong{color:#fff;font-weight:600}.hero__origin em{color:#f7eddd}
    .doubt__image[data-user-artwork="true"]{filter:saturate(1.02) contrast(1.01) brightness(1.06);object-position:center center}
    @media(min-width:821px){.kiosk{width:min(980px,94vw)}}
    @media(max-width:640px){.hero__origin{font-size:15px;line-height:1.4;margin-top:13px;padding-left:13px}.hero__actions{margin-top:22px}}
    @media(hover:hover) and (pointer:fine){
      .fragments__field{transform:translate3d(var(--field-x,0),var(--field-y,0),0);transition:transform .16s ease-out}
      .fragment{cursor:default;transition:opacity .22s ease,color .22s ease,text-shadow .22s ease,filter .22s ease,letter-spacing .22s ease;transform-origin:center}
      .fragments__field.is-hovering .fragment:not(.is-active){opacity:.34;filter:blur(.2px)}
      .fragment.is-active{opacity:1;color:#fffdf6;font-weight:600;letter-spacing:.006em;animation-play-state:paused;z-index:8;text-shadow:0 0 18px rgba(216,182,125,.35),0 6px 24px rgba(0,0,0,.7)}
      .fragment::after{content:"";display:block;width:0;height:1px;margin-top:10px;background:linear-gradient(90deg,#d8b67d,transparent);transition:width .22s ease}
      .fragment.is-active::after{width:48%}
    }
  `;
  document.head.appendChild(interactionStyles);

  const onScroll = () => {
    const y = window.scrollY || 0;
    header?.classList.toggle('is-scrolled', y > 35);
    if (reduced) return;
    if (hero) hero.style.setProperty('--hero-y', `${Math.min(42, y * .11)}px`);
    if (fragments) {
      const r = fragments.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight));
      fragments.style.setProperty('--frag-bg-y', `${p * 10}px`);
      fragments.querySelectorAll('.fragment').forEach((el, i) => {
        el.style.setProperty('--sx', `${p * (((i % 4) - 1.5) * 5)}px`);
        el.style.setProperty('--sy', `${p * (((i % 3) - 1) * 8)}px`);
      });
    }
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const fragmentField = fragments?.querySelector('.fragments__field');
  if (fragmentField && finePointer) {
    fragments.querySelectorAll('.fragment').forEach(quote => {
      quote.addEventListener('pointerenter', () => { fragmentField.classList.add('is-hovering'); quote.classList.add('is-active'); });
      quote.addEventListener('pointerleave', () => { quote.classList.remove('is-active'); if (!fragmentField.querySelector('.fragment.is-active')) fragmentField.classList.remove('is-hovering'); });
    });
    if (!reduced) {
      fragments.addEventListener('pointermove', e => {
        const r = fragments.getBoundingClientRect();
        fragmentField.style.setProperty('--field-x', `${((e.clientX-r.left)/r.width-.5)*-10}px`);
        fragmentField.style.setProperty('--field-y', `${((e.clientY-r.top)/r.height-.5)*-7}px`);
      });
      fragments.addEventListener('pointerleave', () => { fragmentField.style.setProperty('--field-x','0px'); fragmentField.style.setProperty('--field-y','0px'); });
    }
  }

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

  const PREAMBLE_VIDEO_ID = 'orhk4WoPYfs';
  window.onYouTubeIframeAPIReady = () => {
    if (!window.YT?.Player || !document.getElementById('youtube-preamble')) return;
    new YT.Player('youtube-preamble', { width:'100%', height:'100%', videoId:PREAMBLE_VIDEO_ID, host:'https://www.youtube-nocookie.com', playerVars:{controls:1,rel:0,playsinline:1,hl:'fr'} });
  };
  if (document.getElementById('youtube-preamble')) {
    const ytApi = document.createElement('script');
    ytApi.src = 'https://www.youtube.com/iframe_api';
    ytApi.async = true;
    document.head.appendChild(ytApi);
  }
})();