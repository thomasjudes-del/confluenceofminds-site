const header = document.querySelector('[data-header]');
const revealItems = document.querySelectorAll('.reveal');
const toast = document.querySelector('[data-toast]');
const toastMessage = document.querySelector('[data-toast-message]');
const projectButtons = document.querySelectorAll('[data-project-link]');
const randomPortal = document.querySelector('[data-random-portal]');
const year = document.querySelector('[data-year]');

if (year) year.textContent = new Date().getFullYear();

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
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
    showToast(`${portal} is not connected yet — this card is ready for its future project URL.`);
  });
});

randomPortal?.addEventListener('click', () => {
  const cards = [...document.querySelectorAll('.world-card:not(.world-card--incoming)')];
  const chosen = cards[Math.floor(Math.random() * cards.length)];
  chosen?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  chosen?.animate([
    { transform: 'translateY(-7px) scale(1)' },
    { transform: 'translateY(-7px) scale(1.015)' },
    { transform: 'translateY(-7px) scale(1)' }
  ], { duration: 850, easing: 'ease-out' });
});

const canvas = document.getElementById('confluence-canvas');
const context = canvas?.getContext('2d');
let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let pointer = { x: 0.5, y: 0.5 };

function resizeCanvas() {
  if (!canvas || !context) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.max(38, Math.min(90, Math.floor(width / 18)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    r: Math.random() * 1.6 + 0.35,
    phase: Math.random() * Math.PI * 2
  }));
}

function draw(time = 0) {
  if (!context) return;
  context.clearRect(0, 0, width, height);

  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (particle.x < -10) particle.x = width + 10;
    if (particle.x > width + 10) particle.x = -10;
    if (particle.y < -10) particle.y = height + 10;
    if (particle.y > height + 10) particle.y = -10;

    const pulse = 0.55 + Math.sin(time * 0.0007 + particle.phase) * 0.2;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    context.fillStyle = `rgba(226, 222, 235, ${pulse})`;
    context.fill();
  });

  const maxDistance = width < 700 ? 105 : 135;
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.hypot(dx, dy);
      if (distance < maxDistance) {
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = `rgba(143, 126, 255, ${(1 - distance / maxDistance) * 0.16})`;
        context.lineWidth = 0.7;
        context.stroke();
      }
    }
  }

  const gx = pointer.x * width;
  const gy = pointer.y * height;
  const glow = context.createRadialGradient(gx, gy, 0, gx, gy, 210);
  glow.addColorStop(0, 'rgba(214,255,63,.055)');
  glow.addColorStop(1, 'rgba(214,255,63,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  requestAnimationFrame(draw);
}

window.addEventListener('pointermove', (event) => {
  pointer.x = event.clientX / window.innerWidth;
  pointer.y = event.clientY / window.innerHeight;
});
window.addEventListener('resize', resizeCanvas);

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  resizeCanvas();
  requestAnimationFrame(draw);
} else if (canvas) {
  canvas.remove();
}
