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

let ticking = false;
function updateScrollScene() {
  const scrollY = window.scrollY;
  header?.classList.toggle('is-scrolled', scrollY > 28);

  if (hero && !reduceMotion) {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);

    hero.style.setProperty('--scene-scale', (1 + progress * 0.085).toFixed(4));
    hero.style.setProperty('--scene-brightness', (1 - progress * 0.26).toFixed(4));
    hero.style.setProperty('--copy-opacity', clamp(1 - progress * 1.55, 0, 1).toFixed(4));
    hero.style.setProperty('--copy-shift', `${Math.round(progress * -72)}px`);
    hero.style.setProperty('--scroll-opacity', clamp(1 - progress * 3.2, 0, 1).toFixed(4));
  }

  ticking = false;
}

function requestScrollUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollScene);
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
requestScrollUpdate();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 3, 2) * 75}ms`;
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

projectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('[data-portal]');
    const portal = card?.dataset.portal || 'This world';
    showToast(`${portal} will be connected to its project page next.`);
  });
});

if (!reduceMotion) {
  const scene = document.querySelector('.cinematic-scene');
  window.addEventListener('pointermove', (event) => {
    if (!scene || window.innerWidth < 900) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 8;
    const y = (event.clientY / window.innerHeight - 0.5) * 5;
    scene.style.transformOrigin = `${50 + x * 0.15}% ${47 + y * 0.12}%`;
  }, { passive: true });
}
