const header = document.querySelector('.topbar');

const updateHeader = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
};

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

// BOTPress integration point
// ---------------------------------------------
// The live Botpress webchat/embed code can be injected later without
// changing the page architecture. Replace the `.botpress-placeholder`
// inside `#botpress-mount`, or mount Botpress directly into that element.
// Keep all provider credentials/configuration out of this public file.
window.AV_ROBOTIQUES = {
  mountId: 'botpress-mount',
  placeholderSelector: '.botpress-placeholder'
};
