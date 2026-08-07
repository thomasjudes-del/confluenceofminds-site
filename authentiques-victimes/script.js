(() => {
  const header = document.querySelector('.topbar');
  const hero = document.querySelector('[data-hero]');
  const fragments = document.querySelector('[data-fragments]');
  const doubt = document.querySelector('.doubt');
  const doubtImage = document.querySelector('.doubt__image');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Keep the original high-quality hero hosted in Cloudflare R2.
  const HERO_URL = 'https://pub-4af364e5f0b8401cade14d4e21fb0e19.r2.dev/pour%20hero.png?v=20260807-av-hero2';
  const heroImage = hero?.querySelector('.hero__image');
  if (heroImage) {
    heroImage.src = HERO_URL;
    heroImage.removeAttribute('srcset');
  }

  // The supplied plagiarism artwork is stored with the site in small text chunks.
  // Reassemble it client-side as a WebP so GitHub Pages can serve it without another media host.
  const DOUBT_IMAGE_PARTS = Array.from(
    { length: 15 },
    (_, i) => `assets/av-plagiarism-user-${i}.txt?v=20260807-av-plagiarism-1`
  );
  let doubtImageObjectUrl = '';

  const loadDoubtImage = async () => {
    if (!doubtImage) return;
    try {
      const parts = await Promise.all(DOUBT_IMAGE_PARTS.map(async url => {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`asset ${res.status}: ${url}`);
        return (await res.text()).trim();
      }));
      const binary = atob(parts.join(''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      doubtImageObjectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      doubtImage.src = doubtImageObjectUrl;
      doubtImage.removeAttribute('srcset');
      doubtImage.dataset.userArtwork = 'true';
      doubt?.classList.add('has-user-artwork');
    } catch (err) {
      console.warn('AV: plagiarism artwork failed to load; keeping fallback image.', err);
    }
  };
  loadDoubtImage();
  addEventListener('pagehide', () => {
    if (doubtImageObjectUrl) URL.revokeObjectURL(doubtImageObjectUrl);
  }, { once: true });

  // Visual interaction layer: attached artwork, richer quote focus and the fountain-pen pointer.
  const interactionStyles = document.createElement('style');
  interactionStyles.id = 'av-interactions-v7';
  interactionStyles.textContent = `
    .doubt__image[data-user-artwork="true"]{
      filter:saturate(.96) contrast(1.04) brightness(.88);
      object-position:center center;
    }
    .doubt.has-user-artwork .doubt__veil{
      background:
        linear-gradient(90deg,rgba(3,7,10,.91) 0%,rgba(3,7,10,.62) 34%,rgba(3,7,10,.12) 67%,rgba(3,7,10,.18) 100%),
        linear-gradient(0deg,rgba(3,7,10,.47),transparent 52%,rgba(3,7,10,.12));
    }

    @media (hover:hover) and (pointer:fine){
      .fragments__field{
        transform:translate3d(var(--field-x,0),var(--field-y,0),0);
        transition:transform .16s ease-out;
      }
      .fragment{
        cursor:none;
        transition:opacity .22s ease,color .22s ease,text-shadow .22s ease,filter .22s ease,letter-spacing .22s ease;
        transform-origin:center;
      }
      .fragments__field.is-hovering .fragment:not(.is-active){
        opacity:.18;
        filter:blur(.45px);
      }
      .fragment.is-active{
        opacity:1;
        color:#fff7e8;
        font-weight:600;
        letter-spacing:.006em;
        animation-play-state:paused;
        z-index:8;
        text-shadow:0 0 20px rgba(216,182,125,.48),0 8px 34px rgba(0,0,0,.98);
      }
      .fragment::after{
        content:"";
        display:block;
        width:0;
        height:1px;
        margin-top:10px;
        background:linear-gradient(90deg,#d8b67d,transparent);
        transition:width .22s ease;
      }
      .fragment.is-active::after{width:48%;}

      html.av-pen-active,
      html.av-pen-active body,
      html.av-pen-active a,
      html.av-pen-active button,
      html.av-pen-active .fragment,
      html.av-pen-active [role="button"]{cursor:none!important;}

      .av-pen-cursor{
        position:fixed;
        left:0;
        top:0;
        width:31px;
        height:48px;
        z-index:2147483646;
        pointer-events:none;
        opacity:0;
        transform:translate3d(-100px,-100px,0) rotate(-24deg);
        transform-origin:50% 92%;
        filter:drop-shadow(0 5px 6px rgba(0,0,0,.58));
        transition:opacity .12s ease,filter .14s ease;
        will-change:transform;
      }
      .av-pen-cursor svg{display:block;width:100%;height:100%;overflow:visible;}
      .av-pen-cursor.is-visible{opacity:.96;}
      .av-pen-cursor.is-interactive{
        filter:drop-shadow(0 0 9px rgba(216,182,125,.82)) drop-shadow(0 5px 6px rgba(0,0,0,.58));
      }
    }
  `;
  document.head.appendChild(interactionStyles);

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

  // Quotes drift with scroll, then snap into focus when the pen hovers over them.
  const fragmentField = fragments?.querySelector('.fragments__field');
  if (fragmentField && finePointer) {
    fragments.querySelectorAll('.fragment').forEach(quote => {
      quote.addEventListener('pointerenter', () => {
        fragmentField.classList.add('is-hovering');
        quote.classList.add('is-active');
      });
      quote.addEventListener('pointerleave', () => {
        quote.classList.remove('is-active');
        if (!fragmentField.querySelector('.fragment.is-active')) fragmentField.classList.remove('is-hovering');
      });
    });

    if (!reduced) {
      fragments.addEventListener('pointermove', e => {
        const r = fragments.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5;
        const ny = (e.clientY - r.top) / r.height - .5;
        fragmentField.style.setProperty('--field-x', `${nx * -14}px`);
        fragmentField.style.setProperty('--field-y', `${ny * -9}px`);
      });
      fragments.addEventListener('pointerleave', () => {
        fragmentField.style.setProperty('--field-x', '0px');
        fragmentField.style.setProperty('--field-y', '0px');
      });
    }
  }

  // Restore the fountain-pen mouse pointer on desktop/fine-pointer devices.
  if (finePointer) {
    const pen = document.createElement('div');
    pen.className = 'av-pen-cursor';
    pen.setAttribute('aria-hidden', 'true');
    pen.innerHTML = `
      <svg viewBox="0 0 42 64" aria-hidden="true">
        <defs>
          <linearGradient id="avPenGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f1dfb7"/>
            <stop offset=".48" stop-color="#d8b67d"/>
            <stop offset="1" stop-color="#88673d"/>
          </linearGradient>
        </defs>
        <path d="M21 2 36 22 28 48 21 61 14 48 6 22Z" fill="url(#avPenGold)" stroke="#f6ead5" stroke-width="1.15"/>
        <path d="M21 3v34" stroke="#302217" stroke-width="1.45"/>
        <circle cx="21" cy="30" r="3.35" fill="#090d0f" stroke="#f2e6cf" stroke-width=".8"/>
        <path d="M21 36 14 48M21 36l7 12" fill="none" stroke="#302217" stroke-width="1.15"/>
        <path d="M14 48 21 61 28 48" fill="#15100c" opacity=".88"/>
      </svg>`;
    document.body.appendChild(pen);
    document.documentElement.classList.add('av-pen-active');

    let px = -100;
    let py = -100;
    let raf = 0;
    const renderPen = () => {
      raf = 0;
      // The nib tip sits almost exactly on the native pointer position.
      pen.style.transform = `translate3d(${px - 8}px,${py - 43}px,0) rotate(-24deg)`;
    };
    addEventListener('pointermove', e => {
      px = e.clientX;
      py = e.clientY;
      pen.classList.add('is-visible');
      pen.classList.toggle('is-interactive', !!e.target.closest?.('a,button,.fragment,[role="button"],input,textarea'));
      if (!raf) raf = requestAnimationFrame(renderPen);
    }, { passive: true });
    addEventListener('pointerout', e => {
      if (!e.relatedTarget) pen.classList.remove('is-visible');
    });
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

  window.AV_BOTPRESS_TARGET = '#botpress-mount';
  window.AV_ROBOTIQUES = {
    mountId: 'botpress-mount',
    replacePlaceholder(){ document.querySelector('.botpress-placeholder')?.remove(); }
  };

  // Correct SILMEA Authentiques Victimes preamble video, loaded directly.
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