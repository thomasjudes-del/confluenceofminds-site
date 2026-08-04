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
const easeInCubic = value => value * value * value;
let ticking = false;

function updateHero() {
  const scrollY = window.scrollY;
  header?.classList.toggle('is-scrolled', scrollY > 26);

  if (hero && !reduceMotion) {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    const explosion = easeInCubic(clamp((progress - 0.16) / 0.84, 0, 1));
    const copyFade = clamp(1 - progress * 2.25, 0, 1);

    hero.style.setProperty('--hero-scale', (1 + explosion * 6.8).toFixed(3));
    hero.style.setProperty('--hero-rotate', `${(-2 - explosion * 12).toFixed(2)}deg`);
    hero.style.setProperty('--hero-x', `${(explosion * 34).toFixed(1)}vw`);
    hero.style.setProperty('--hero-y', `${(explosion * 4).toFixed(1)}vh`);
    hero.style.setProperty('--copy-opacity', copyFade.toFixed(3));
    hero.style.setProperty('--copy-y', `${(-progress * 74).toFixed(1)}px`);
    hero.style.setProperty('--scroll-opacity', clamp(1 - progress * 4, 0, 1).toFixed(3));
    hero.style.setProperty('--void-opacity', clamp((progress - 0.78) * 4.7, 0, 1).toFixed(3));
    hero.style.setProperty('--shard-1-x', `${(-explosion * 44).toFixed(1)}vw`);
    hero.style.setProperty('--shard-1-y', `${(-explosion * 36).toFixed(1)}vh`);
    hero.style.setProperty('--shard-2-x', `${(explosion * 50).toFixed(1)}vw`);
    hero.style.setProperty('--shard-2-y', `${(-explosion * 32).toFixed(1)}vh`);
    hero.style.setProperty('--shard-3-x', `${(explosion * 48).toFixed(1)}vw`);
    hero.style.setProperty('--shard-3-y', `${(explosion * 40).toFixed(1)}vh`);
    hero.style.setProperty('--shard-4-x', `${(-explosion * 40).toFixed(1)}vw`);
    hero.style.setProperty('--shard-4-y', `${(explosion * 44).toFixed(1)}vh`);
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

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
  observer.observe(item);
});

let toastTimer;
function showToast(message) {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

projectButtons.forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('[data-portal]');
    const portal = card?.dataset.portal || 'This world';
    const url = card?.dataset.url;

    if (portal === 'Incident on Titan') {
      window.location.assign('./titan/');
      return;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    showToast(`${portal} will be connected to its project page next.`);
  });
});
