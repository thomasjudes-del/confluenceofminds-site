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
    const explosion = easeInCubic(clamp((progress - 0.15) / 0.85, 0, 1));
    const copyFade = clamp(1 - progress * 2.15, 0, 1);

    hero.style.setProperty('--hero-scale', (1 + explosion * 7.2).toFixed(3));
    hero.style.setProperty('--hero-rotate', `${(-1.5 - explosion * 12.5).toFixed(2)}deg`);
    hero.style.setProperty('--hero-x', `${(explosion * 28).toFixed(1)}vw`);
    hero.style.setProperty('--hero-y', `${(explosion * 5).toFixed(1)}vh`);
    hero.style.setProperty('--copy-opacity', copyFade.toFixed(3));
    hero.style.setProperty('--copy-y', `${(-progress * 68).toFixed(1)}px`);
    hero.style.setProperty('--scroll-opacity', clamp(1 - progress * 4, 0, 1).toFixed(3));
    hero.style.setProperty('--void-opacity', clamp((progress - 0.79) * 5, 0, 1).toFixed(3));
    hero.style.setProperty('--shard-1-x', `${(-explosion * 45).toFixed(1)}vw`);
    hero.style.setProperty('--shard-1-y', `${(-explosion * 28).toFixed(1)}vh`);
    hero.style.setProperty('--shard-2-x', `${(explosion * 46).toFixed(1)}vw`);
    hero.style.setProperty('--shard-2-y', `${(-explosion * 34).toFixed(1)}vh`);
    hero.style.setProperty('--shard-3-x', `${(-explosion * 50).toFixed(1)}vw`);
    hero.style.setProperty('--shard-3-y', `${(explosion * 38).toFixed(1)}vh`);
    hero.style.setProperty('--shard-4-x', `${(explosion * 48).toFixed(1)}vw`);
    hero.style.setProperty('--shard-4-y', `${(explosion * 42).toFixed(1)}vh`);
  }

  ticking = false;
}

function requestScrollUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateHero);
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
requestScrollUpdate();

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

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
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

const destinations = {
  'Incident on Titan': './titan/',
  'AI’s Got Talent': 'https://aitalent.show/',
  'Créations SILMEA': 'https://smartlink.ausha.co/creations-silmea',
  'Guess the Book': 'https://www.instagram.com/confluenceofminds/'
};

projectButtons.forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('[data-portal]');
    const portal = card?.dataset.portal || 'This world';
    const destination = destinations[portal];

    if (destination) {
      if (destination.startsWith('http')) window.open(destination, '_blank', 'noopener,noreferrer');
      else window.location.assign(destination);
      return;
    }

    showToast(`${portal} will be connected to its own portal next.`);
  });
});
