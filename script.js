const header = document.querySelector('[data-header]');
const hero = document.querySelector('[data-hero]');
const heroArt = hero?.querySelector('.hero-art');
const revealItems = document.querySelectorAll('.reveal');
const toast = document.querySelector('[data-toast]');
const toastMessage = document.querySelector('[data-toast-message]');
const projectButtons = document.querySelectorAll('[data-project-link]');
const year = document.querySelector('[data-year]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (year) year.textContent = new Date().getFullYear();

if (heroArt) {
  heroArt.classList.add('hero-art--immersive');
  heroArt.innerHTML = `
    <div class="hero-cosmos" aria-hidden="true"></div>
    <div class="hero-orbit hero-orbit--one" aria-hidden="true"></div>
    <div class="hero-orbit hero-orbit--two" aria-hidden="true"></div>
    <div class="hero-orbit hero-orbit--three" aria-hidden="true"></div>

    <img class="hero-art__image hero-art__image--echo hero-art__image--echo-one"
      src="assets/confluence-hero-organic.png?v=20260805-hero-v7" alt="" decoding="async" />
    <img class="hero-art__image hero-art__image--echo hero-art__image--echo-two"
      src="assets/confluence-hero-organic.png?v=20260805-hero-v7" alt="" decoding="async" />
    <img class="hero-art__image hero-art__image--main"
      src="assets/confluence-hero-organic.png?v=20260805-hero-v7" alt="" fetchpriority="high" decoding="async" />

    <div class="hero-paper hero-paper--one" aria-hidden="true">
      <b>STORIES</b><span>Fragments become worlds.</span>
    </div>
    <div class="hero-paper hero-paper--two" aria-hidden="true">
      <b>MEMORY</b><span>Every door changes the map.</span>
    </div>
    <div class="hero-paper hero-paper--three" aria-hidden="true">
      <b>WORLDS</b><span>Enter anywhere.</span>
    </div>

    <div class="hero-starfield" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
  `;
}

const immersiveStyle = document.createElement('style');
immersiveStyle.id = 'immersive-hero-v7';
immersiveStyle.textContent = `
  .hero-sequence {
    --immersive-scale: .9;
    --immersive-x: 0vw;
    --immersive-y: 0vh;
    --immersive-rotate: -1deg;
    --art-opacity: 1;
    --echo-opacity: 0;
    --echo-one-x: 0vw;
    --echo-one-y: 0vh;
    --echo-one-r: 0deg;
    --echo-one-s: 1;
    --echo-two-x: 0vw;
    --echo-two-y: 0vh;
    --echo-two-r: 0deg;
    --echo-two-s: 1;
    --cosmos-opacity: .12;
    --orbit-opacity: .22;
    --paper-opacity: 0;
    --paper-one-x: 0vw;
    --paper-one-y: 0vh;
    --paper-one-r: -8deg;
    --paper-two-x: 0vw;
    --paper-two-y: 0vh;
    --paper-two-r: 7deg;
    --paper-three-x: 0vw;
    --paper-three-y: 0vh;
    --paper-three-r: -3deg;
    --star-opacity: .18;
    height: 365vh !important;
    min-height: 2380px !important;
  }

  .hero-sticky {
    grid-template-columns: minmax(0, .96fr) minmax(0, 1.04fr) !important;
    gap: clamp(18px, 3vw, 58px) !important;
  }

  .hero-void {
    z-index: 8 !important;
    inset: -8% !important;
    background:
      radial-gradient(circle at 52% 48%, rgba(248,243,234,.12) 0 18%, rgba(238,232,220,.54) 52%, #eee8dc 78%) !important;
    backdrop-filter: blur(calc(var(--void-opacity) * 9px));
  }

  .hero-copy {
    max-width: 700px !important;
  }

  .hero-art.hero-art--immersive {
    position: relative;
    z-index: 4;
    width: min(46vw, 760px) !important;
    aspect-ratio: 3 / 2;
    justify-self: end;
    transform:
      translate3d(var(--immersive-x), var(--immersive-y), 0)
      rotate(var(--immersive-rotate))
      scale(var(--immersive-scale)) !important;
    transform-origin: 51% 52% !important;
    opacity: var(--art-opacity);
    isolation: isolate;
    will-change: transform, opacity;
  }

  .hero-art--immersive::before {
    content: "";
    position: absolute;
    inset: 8% 3% 3% 6%;
    z-index: -3;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(50,58,53,.2), rgba(50,58,53,0) 67%);
    filter: blur(30px);
    transform: translateY(10%);
  }

  .hero-art__image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    user-select: none;
    transform-origin: 51% 53%;
    will-change: transform, opacity, filter;
  }

  .hero-art__image--main {
    z-index: 3;
    filter: drop-shadow(0 28px 34px rgba(23,32,31,.18));
    animation: immersiveBreath 7.8s ease-in-out infinite alternate;
  }

  .hero-art__image--echo {
    z-index: 1;
    opacity: var(--echo-opacity);
    mix-blend-mode: multiply;
    filter: blur(1.2px) saturate(.9) contrast(.96);
  }

  .hero-art__image--echo-one {
    transform:
      translate3d(var(--echo-one-x), var(--echo-one-y), 0)
      rotate(var(--echo-one-r))
      scale(var(--echo-one-s));
  }

  .hero-art__image--echo-two {
    transform:
      translate3d(var(--echo-two-x), var(--echo-two-y), 0)
      rotate(var(--echo-two-r))
      scale(var(--echo-two-s));
    filter: blur(2.5px) saturate(.72) contrast(.9);
  }

  .hero-cosmos {
    position: absolute;
    z-index: -2;
    inset: -46%;
    border-radius: 50%;
    opacity: var(--cosmos-opacity);
    background:
      radial-gradient(circle at 25% 37%, rgba(182,107,73,.48) 0 .7%, transparent .9%),
      radial-gradient(circle at 72% 28%, rgba(23,32,31,.52) 0 .8%, transparent 1%),
      radial-gradient(circle at 80% 68%, rgba(180,142,78,.4) 0 .65%, transparent .9%),
      radial-gradient(circle at 38% 78%, rgba(23,32,31,.42) 0 .55%, transparent .8%),
      radial-gradient(ellipse at center, rgba(248,243,234,.05), rgba(182,107,73,.08) 42%, transparent 68%);
    filter: drop-shadow(0 0 22px rgba(184,137,65,.18));
    animation: cosmosTurn 24s linear infinite;
  }

  .hero-orbit {
    position: absolute;
    z-index: 0;
    left: 50%;
    top: 50%;
    border: 1px solid rgba(123,104,74,.34);
    border-radius: 50%;
    opacity: var(--orbit-opacity);
    transform-origin: center;
    pointer-events: none;
  }
  .hero-orbit::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #b66b49;
    box-shadow: 0 0 20px rgba(182,107,73,.8);
  }
  .hero-orbit--one { width: 112%; height: 84%; transform: translate(-50%,-50%) rotate(-16deg); animation: orbitOne 18s linear infinite; }
  .hero-orbit--one::after { right: 9%; top: 19%; }
  .hero-orbit--two { width: 86%; height: 126%; transform: translate(-50%,-50%) rotate(27deg); animation: orbitTwo 25s linear infinite reverse; }
  .hero-orbit--two::after { left: 12%; bottom: 20%; width: 5px; height: 5px; background: #25302d; }
  .hero-orbit--three { width: 146%; height: 112%; transform: translate(-50%,-50%) rotate(8deg); animation: orbitOne 34s linear infinite reverse; opacity: calc(var(--orbit-opacity) * .62); }
  .hero-orbit--three::after { right: 27%; bottom: 6%; width: 4px; height: 4px; background: #9c835d; }

  .hero-paper {
    position: absolute;
    z-index: 5;
    width: clamp(120px, 13vw, 210px);
    min-height: 78px;
    padding: 14px 16px;
    border: 1px solid rgba(23,32,31,.15);
    color: rgba(23,32,31,.8);
    background: rgba(248,243,234,.72);
    box-shadow: 0 16px 38px rgba(23,32,31,.14);
    backdrop-filter: blur(5px);
    opacity: var(--paper-opacity);
    will-change: transform, opacity;
  }
  .hero-paper b {
    display: block;
    margin-bottom: 8px;
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: .2em;
    color: #b66b49;
  }
  .hero-paper span {
    display: block;
    font-family: var(--serif);
    font-size: 13px;
    line-height: 1.3;
  }
  .hero-paper--one {
    left: 5%; top: 18%;
    transform: translate3d(var(--paper-one-x),var(--paper-one-y),0) rotate(var(--paper-one-r));
  }
  .hero-paper--two {
    right: -2%; top: 34%;
    transform: translate3d(var(--paper-two-x),var(--paper-two-y),0) rotate(var(--paper-two-r));
  }
  .hero-paper--three {
    left: 29%; bottom: 4%;
    transform: translate3d(var(--paper-three-x),var(--paper-three-y),0) rotate(var(--paper-three-r));
  }

  .hero-starfield {
    position: absolute;
    z-index: 6;
    inset: -38%;
    opacity: var(--star-opacity);
    pointer-events: none;
  }
  .hero-starfield i {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #f7d88e;
    box-shadow: 0 0 10px 2px rgba(244,198,93,.75);
    animation: starPulse 2.8s ease-in-out infinite alternate;
  }
  .hero-starfield i:nth-child(1){left:10%;top:22%}.hero-starfield i:nth-child(2){left:19%;top:57%;animation-delay:.7s}
  .hero-starfield i:nth-child(3){left:31%;top:11%;animation-delay:1.4s}.hero-starfield i:nth-child(4){left:42%;top:68%;animation-delay:.2s}
  .hero-starfield i:nth-child(5){left:52%;top:19%;animation-delay:1.8s}.hero-starfield i:nth-child(6){left:62%;top:49%;animation-delay:.9s}
  .hero-starfield i:nth-child(7){left:72%;top:15%;animation-delay:1.2s}.hero-starfield i:nth-child(8){left:79%;top:63%;animation-delay:.4s}
  .hero-starfield i:nth-child(9){left:89%;top:31%;animation-delay:2s}.hero-starfield i:nth-child(10){left:94%;top:76%;animation-delay:1.1s}
  .hero-starfield i:nth-child(11){left:15%;top:82%;animation-delay:.3s}.hero-starfield i:nth-child(12){left:27%;top:39%;animation-delay:1.6s}
  .hero-starfield i:nth-child(13){left:37%;top:91%;animation-delay:.6s}.hero-starfield i:nth-child(14){left:48%;top:46%;animation-delay:2.2s}
  .hero-starfield i:nth-child(15){left:58%;top:84%;animation-delay:1.3s}.hero-starfield i:nth-child(16){left:68%;top:35%;animation-delay:.5s}
  .hero-starfield i:nth-child(17){left:82%;top:89%;animation-delay:1.9s}.hero-starfield i:nth-child(18){left:92%;top:51%;animation-delay:.8s}

  .worlds {
    background: var(--paper);
    margin-top: -1px;
  }

  @keyframes immersiveBreath {
    from { transform: translate3d(-5px, 3px, 0) rotate(-.3deg) scale(.995); }
    to { transform: translate3d(8px, -7px, 0) rotate(.55deg) scale(1.018); }
  }
  @keyframes cosmosTurn { to { transform: rotate(360deg) scale(1.04); } }
  @keyframes orbitOne { to { transform: translate(-50%,-50%) rotate(344deg); } }
  @keyframes orbitTwo { to { transform: translate(-50%,-50%) rotate(387deg); } }
  @keyframes starPulse { from { opacity: .18; transform: scale(.55); } to { opacity: 1; transform: scale(1.45); } }

  @media (max-width: 1180px) {
    .hero-art.hero-art--immersive { width: min(50vw, 700px) !important; }
  }

  @media (max-width: 820px) {
    .hero-sequence { height: 285vh !important; min-height: 1800px !important; }
    .hero-sticky { grid-template-columns: 1fr !important; grid-template-rows: auto 1fr !important; }
    .hero-art.hero-art--immersive {
      width: min(94vw, 680px) !important;
      justify-self: center;
      margin-top: -26px;
    }
    .hero-paper { width: 132px; padding: 10px 11px; }
    .hero-paper span { font-size: 10px; }
  }

  @media (max-width: 520px) {
    .hero-sequence { height: 265vh !important; min-height: 1580px !important; }
    .hero-art.hero-art--immersive { width: 102vw !important; margin-left: -1vw; }
    .hero-paper { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-sequence { height: auto !important; min-height: 100vh !important; }
    .hero-art.hero-art--immersive { transform: scale(.9) !important; opacity: 1 !important; }
    .hero-art__image--echo, .hero-paper { display: none !important; }
  }
`;
document.head.appendChild(immersiveStyle);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};
const smootherstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
let ticking = false;

function updateHero() {
  const scrollY = window.scrollY;
  header?.classList.toggle('is-scrolled', scrollY > 26);

  if (hero && !reduceMotion) {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    const mobile = window.innerWidth <= 820;

    const absorb = smootherstep(.12, .78, progress);
    const burst = smootherstep(.38, .88, progress);
    const exit = smoothstep(.88, 1, progress);
    const copyFade = 1 - smoothstep(.14, .39, progress);
    const echo = smoothstep(.26, .55, progress) * (1 - smoothstep(.88, .985, progress));
    const paper = smoothstep(.31, .56, progress) * (1 - smoothstep(.84, .97, progress));

    const scale = mobile
      ? .9 + absorb * 3.25 + burst * 1.05
      : .9 + absorb * 5.2 + burst * 1.35;
    const x = mobile
      ? (-5 * absorb + 2 * burst)
      : (-11.5 * absorb + 4.5 * burst);
    const y = mobile
      ? (8 * absorb - 2 * burst)
      : (3.5 * absorb + 2 * burst);
    const rotate = -1 - absorb * 8.8 + burst * 3.2;

    hero.style.setProperty('--immersive-scale', scale.toFixed(3));
    hero.style.setProperty('--immersive-x', `${x.toFixed(2)}vw`);
    hero.style.setProperty('--immersive-y', `${y.toFixed(2)}vh`);
    hero.style.setProperty('--immersive-rotate', `${rotate.toFixed(2)}deg`);
    hero.style.setProperty('--art-opacity', (1 - smoothstep(.93, 1, progress)).toFixed(3));
    hero.style.setProperty('--copy-opacity', copyFade.toFixed(3));
    hero.style.setProperty('--copy-y', `${(-progress * 82).toFixed(1)}px`);
    hero.style.setProperty('--scroll-opacity', (1 - smoothstep(.02, .16, progress)).toFixed(3));
    hero.style.setProperty('--void-opacity', smoothstep(.91, .995, progress).toFixed(3));

    hero.style.setProperty('--echo-opacity', (echo * .38).toFixed(3));
    hero.style.setProperty('--echo-one-x', `${(-burst * 15).toFixed(2)}vw`);
    hero.style.setProperty('--echo-one-y', `${(-burst * 10).toFixed(2)}vh`);
    hero.style.setProperty('--echo-one-r', `${(-burst * 13).toFixed(2)}deg`);
    hero.style.setProperty('--echo-one-s', (1 + burst * .23).toFixed(3));
    hero.style.setProperty('--echo-two-x', `${(burst * 17).toFixed(2)}vw`);
    hero.style.setProperty('--echo-two-y', `${(burst * 12).toFixed(2)}vh`);
    hero.style.setProperty('--echo-two-r', `${(burst * 16).toFixed(2)}deg`);
    hero.style.setProperty('--echo-two-s', (1 + burst * .31).toFixed(3));

    hero.style.setProperty('--cosmos-opacity', (.12 + absorb * .68).toFixed(3));
    hero.style.setProperty('--orbit-opacity', (.2 + burst * .58).toFixed(3));
    hero.style.setProperty('--star-opacity', (.16 + burst * .84).toFixed(3));
    hero.style.setProperty('--paper-opacity', (paper * .88).toFixed(3));
    hero.style.setProperty('--paper-one-x', `${(-burst * 29).toFixed(2)}vw`);
    hero.style.setProperty('--paper-one-y', `${(-burst * 25).toFixed(2)}vh`);
    hero.style.setProperty('--paper-one-r', `${(-8 - burst * 31).toFixed(2)}deg`);
    hero.style.setProperty('--paper-two-x', `${(burst * 30).toFixed(2)}vw`);
    hero.style.setProperty('--paper-two-y', `${(-burst * 18).toFixed(2)}vh`);
    hero.style.setProperty('--paper-two-r', `${(7 + burst * 36).toFixed(2)}deg`);
    hero.style.setProperty('--paper-three-x', `${(burst * 9).toFixed(2)}vw`);
    hero.style.setProperty('--paper-three-y', `${(burst * 31).toFixed(2)}vh`);
    hero.style.setProperty('--paper-three-r', `${(-3 - burst * 23).toFixed(2)}deg`);
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
  'À la recherche de Katephomi Kitembe': 'https://books.apple.com/fr/book/a-la-recherche-de-katephomi-kitembe/id6442944248?l=fr',
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
