const header = document.querySelector('[data-header]');
const hero = document.querySelector('[data-hero]');
const revealItems = document.querySelectorAll('.reveal');
const toast = document.querySelector('[data-toast]');
const toastMessage = document.querySelector('[data-toast-message]');
const projectButtons = document.querySelectorAll('[data-project-link]');
const year = document.querySelector('[data-year]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (year) year.textContent = new Date().getFullYear();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeIn = (value) => value * value;
const easeInCubic = (value) => value * value * value;

let ticking = false;

function updateHero() {
  const scrollY = window.scrollY;
  header?.classList.toggle('is-scrolled', scrollY > 28);

  if (hero && !reduceMotion) {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    const surge = easeInCubic(progress);
    const burst = clamp((progress - 0.46) / 0.54, 0, 1);
    const burstEase = easeIn(burst);

    hero.style.setProperty('--art-scale', (1 + progress * 0.6 + surge * 5.2).toFixed(4));
    hero.style.setProperty('--art-rotate', `${(-1.5 + surge * 8.5).toFixed(2)}deg`);
    hero.style.setProperty('--art-x', `${Math.round(surge * window.innerWidth * -0.035)}px`);
    hero.style.setProperty('--art-y', `${Math.round(surge * window.innerHeight * 0.035)}px`);

    hero.style.setProperty('--copy-opacity', clamp(1 - progress * 2.25, 0, 1).toFixed(4));
    hero.style.setProperty('--copy-y', `${Math.round(progress * -125)}px`);
    hero.style.setProperty('--signature-opacity', clamp(1 - progress * 3.1, 0, 1).toFixed(4));
    hero.style.setProperty('--void-opacity', (clamp((progress - 0.63) / 0.37, 0, 1) * 1.04).toFixed(4));

    hero.style.setProperty('--shard-one-x', `${Math.round(burstEase * window.innerWidth * -0.48)}px`);
    hero.style.setProperty('--shard-one-y', `${Math.round(burstEase * window.innerHeight * -0.38)}px`);
    hero.style.setProperty('--shard-one-r', `${Math.round(burstEase * -46)}deg`);

    hero.style.setProperty('--shard-two-x', `${Math.round(burstEase * window.innerWidth * 0.46)}px`);
    hero.style.setProperty('--shard-two-y', `${Math.round(burstEase * window.innerHeight * -0.22)}px`);
    hero.style.setProperty('--shard-two-r', `${Math.round(burstEase * 58)}deg`);

    hero.style.setProperty('--shard-three-x', `${Math.round(burstEase * window.innerWidth * -0.36)}px`);
    hero.style.setProperty('--shard-three-y', `${Math.round(burstEase * window.innerHeight * 0.42)}px`);
    hero.style.setProperty('--shard-three-r', `${Math.round(burstEase * 34)}deg`);

    hero.style.setProperty('--shard-four-x', `${Math.round(burstEase * window.innerWidth * 0.4)}px`);
    hero.style.setProperty('--shard-four-y', `${Math.round(burstEase * window.innerHeight * 0.36)}px`);
    hero.style.setProperty('--shard-four-r', `${Math.round(burstEase * -52)}deg`);
  }

  ticking = false;
}

function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateHero);
}

window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);
requestUpdate();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 3, 2) * 65}ms`;
  observer.observe(item);
});

let toastTimer;
function showToast(message) {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

projectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('[data-portal]');
    const portal = card?.dataset.portal || 'This world';
    showToast(`${portal} has its own identity. Its dedicated portal will be connected here.`);
  });
});

if (!reduceMotion) {
  document.querySelectorAll('.world-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (window.innerWidth < 900) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-7px) perspective(900px) rotateX(${(-y * 1.7).toFixed(2)}deg) rotateY(${(x * 1.7).toFixed(2)}deg)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}
