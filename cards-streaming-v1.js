(() => {
  const titanCard = document.querySelector('.world-card--titan');
  if (!titanCard) return;

  document.querySelectorAll('.world-card__meta span').forEach((status) => {
    const value = status.textContent.trim().toLowerCase();
    if (['live', 'archive', 'instagram'].includes(value)) status.hidden = true;
  });

  const cover = titanCard.querySelector('.world-cover');
  const body = titanCard.querySelector('.world-card__body');
  if (!cover || !body || cover.querySelector('.world-card__preview')) return;

  titanCard.classList.add('world-card--streaming');

  const video = document.createElement('video');
  video.className = 'world-card__preview';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-hidden', 'true');
  video.innerHTML = '<source src="assets/incident-on-titan-preview.mp4?v=20260805-1625" type="video/mp4">';

  const scrim = document.createElement('span');
  scrim.className = 'world-card__scrim';
  scrim.setAttribute('aria-hidden', 'true');

  cover.append(video, scrim, body);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const startPreview = () => {
    const play = video.play();
    if (play && typeof play.then === 'function') {
      play.then(() => titanCard.classList.add('is-previewing')).catch(() => {});
    } else {
      titanCard.classList.add('is-previewing');
    }
  };

  const stopPreview = (reset = true) => {
    video.pause();
    titanCard.classList.remove('is-previewing');
    if (reset) {
      try { video.currentTime = 0; } catch (_) {}
    }
  };

  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (desktopPointer.matches) {
    titanCard.addEventListener('pointerenter', startPreview);
    titanCard.addEventListener('pointerleave', () => stopPreview(true));
    titanCard.addEventListener('focusin', startPreview);
    titanCard.addEventListener('focusout', () => stopPreview(true));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= .65) startPreview();
      else stopPreview(false);
    });
  }, { threshold: [0, .35, .65, 1] });

  observer.observe(titanCard);
})();
