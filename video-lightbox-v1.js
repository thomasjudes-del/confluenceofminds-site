(() => {
  const destinations = {
    'Authentiques Victimes': 'https://confluenceofminds.com/authentiques-victimes/',
    'Chronicles of Kashgar': 'https://www.amazon.com/Chroniques-Kashgar-Novices-Papillon-French/dp/1790850193',
    'À la recherche de Katephomi Kitembe': 'https://books.apple.com/fr/book/a-la-recherche-de-katephomi-kitembe/id6442944248?l=fr',
    'Créations SILMEA': 'https://smartlink.ausha.co/creations-silmea',
    'AI’s Got Talent': 'https://aitalent.show/'
  };

  const destinationFor = (card) => destinations[card?.dataset.portal] || '';

  document.querySelectorAll('.world-card button[data-project-link]').forEach((button) => {
    const card = button.closest('.world-card[data-portal]');
    if (!destinationFor(card)) button.remove();
  });

  document.querySelectorAll('.world-card[data-portal]').forEach((card) => {
    const destination = destinationFor(card);
    if (!destination) return;

    card.addEventListener('click', (event) => {
      const action = event.target.closest('[data-project-link]');
      if (!action || !card.contains(action)) return;
      event.preventDefault();
      event.stopPropagation();
      window.open(destination, '_blank', 'noopener,noreferrer');
    }, true);
  });

  const cards = [...document.querySelectorAll('.world-card[data-media-container]')]
    .filter((card) => card.querySelector('.world-card__preview source'));

  if (!cards.length) return;

  const lightbox = document.createElement('div');
  lightbox.className = 'video-lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-labelledby', 'video-lightbox-title');
  lightbox.innerHTML = `
    <button class="video-lightbox__backdrop" type="button" data-video-close tabindex="-1" aria-label="Close video"></button>
    <div class="video-lightbox__panel" role="document">
      <div class="video-lightbox__header">
        <strong id="video-lightbox-title"></strong>
        <button class="video-lightbox__close" type="button" data-video-close aria-label="Close video">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="video-lightbox__frame">
        <video class="video-lightbox__video" controls playsinline preload="metadata"></video>
      </div>
    </div>
  `;
  document.body.append(lightbox);

  const modalVideo = lightbox.querySelector('.video-lightbox__video');
  const modalTitle = lightbox.querySelector('#video-lightbox-title');
  const closeButton = lightbox.querySelector('.video-lightbox__close');
  let activeCard = null;
  let returnFocus = null;
  let pausedPreviews = [];

  const isFrench = () => document.documentElement.lang === 'fr';
  const labels = () => isFrench()
    ? { play: 'Lire la vidéo de', close: 'Fermer la vidéo' }
    : { play: 'Play video for', close: 'Close video' };

  const cardTitle = (card) => card.querySelector('h3')?.textContent?.trim() || 'Confluence of Minds';
  const cardSource = (card) => card.querySelector('.world-card__preview source')?.getAttribute('src') || '';

  const refreshLabels = () => {
    const copy = labels();
    lightbox.querySelectorAll('[data-video-close]').forEach((button) => button.setAttribute('aria-label', copy.close));
    cards.forEach((card) => {
      const playButton = card.querySelector('.world-card__play');
      if (playButton) playButton.setAttribute('aria-label', `${copy.play} ${cardTitle(card)}`);
    });
    if (activeCard) modalTitle.textContent = cardTitle(activeCard);
  };

  const resumeVisiblePreviews = () => {
    pausedPreviews.forEach((video) => {
      const container = video.closest('[data-media-container]') || video.parentElement;
      const rect = container?.getBoundingClientRect();
      if (!rect || rect.bottom < -240 || rect.top > window.innerHeight + 240) return;
      video.muted = true;
      video.defaultMuted = true;
      const result = video.play();
      if (result?.catch) result.catch(() => {});
    });
    pausedPreviews = [];
  };

  const closeLightbox = () => {
    if (lightbox.hidden) return;
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    lightbox.classList.remove('is-open');
    lightbox.hidden = true;
    document.documentElement.classList.remove('has-video-lightbox');
    activeCard = null;
    resumeVisiblePreviews();
    returnFocus?.focus?.({ preventScroll: true });
    returnFocus = null;
  };

  const openLightbox = (card, trigger) => {
    const source = cardSource(card);
    if (!source) return;

    activeCard = card;
    returnFocus = trigger instanceof HTMLElement ? trigger : card.querySelector('.world-card__play');
    modalTitle.textContent = cardTitle(card);

    pausedPreviews = [...document.querySelectorAll('video[data-viewport-video]')]
      .filter((video) => !video.paused);
    pausedPreviews.forEach((video) => video.pause());

    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    document.documentElement.classList.add('has-video-lightbox');

    modalVideo.src = source;
    modalVideo.muted = false;
    modalVideo.defaultMuted = false;
    modalVideo.volume = 1;
    modalVideo.currentTime = 0;
    modalVideo.load();

    const playResult = modalVideo.play();
    if (playResult?.catch) playResult.catch(() => {});
    closeButton.focus({ preventScroll: true });
  };

  cards.forEach((card) => {
    card.classList.add('world-card--playable');

    const playButton = document.createElement('button');
    playButton.className = 'world-card__play';
    playButton.type = 'button';
    playButton.innerHTML = '<span aria-hidden="true"></span>';
    card.querySelector('.world-cover')?.append(playButton);

    playButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openLightbox(card, playButton);
    });

    card.addEventListener('click', (event) => {
      const titanDestination = event.target.closest('.world-card--titan .world-card__cta');
      if (titanDestination) return;
      if (event.target.closest('[data-project-link]')) return;
      if (event.target.closest('.world-card__play')) return;
      event.preventDefault();
      event.stopPropagation();
      openLightbox(card, playButton);
    });
  });

  lightbox.querySelectorAll('[data-video-close]').forEach((button) => {
    button.addEventListener('click', closeLightbox);
  });

  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
    if (event.key !== 'Tab') return;

    const focusable = [...lightbox.querySelectorAll('button, video[controls]')]
      .filter((element) => !element.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  window.addEventListener('confluence:languagechange', refreshLabels);
  refreshLabels();
})();
