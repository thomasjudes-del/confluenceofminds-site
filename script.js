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
  header?.classList.toggle('is-scrolled', scrollY > 24);

  if (hero && !reduceMotion) {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    const mobile = window.innerWidth < 760;

    hero.style.setProperty('--art-scale', (1 + progress * (mobile ? 0.1 : 0.2)).toFixed(4));
    hero.style.setProperty('--art-x', `${Math.round(progress * (mobile ? -12 : -78))}px`);
    hero.style.setProperty('--art-y', `${Math.round(progress * (mobile ? -12 : -30))}px`);
    hero.style.setProperty('--river-y', `${Math.round(progress * (mobile ? -26 : -72))}px`);
    hero.style.setProperty('--copy-opacity', clamp(1 - progress * 1.3, 0, 1).toFixed(4));
    hero.style.setProperty('--copy-y', `${Math.round(progress * -52)}px`);
    hero.style.setProperty('--index-opacity', clamp(1 - progress * 3.3, 0, 1).toFixed(4));
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
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
}

projectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('[data-portal]');
    const portal = card?.dataset.portal || 'This world';
    showToast(`${portal} will open here when its project page is ready.`);
  });
});
