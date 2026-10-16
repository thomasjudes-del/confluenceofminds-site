(() => {
  'use strict';
  const demo = document.querySelector('.demo');
  if (!demo) return;
  const buttons = [...demo.querySelectorAll('[data-step]')];
  const caption = demo.querySelector('.step-caption');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const captions = ['Your work catches another creator’s eye.', 'They share it with their people.', 'You make something neither would make alone.'];
  let phase = 0;
  let paused = preference.matches;
  let timer = null;
  function paint() {
    demo.dataset.phase = String(phase);
    caption.textContent = captions[phase];
    buttons.forEach((button, i) => {
      button.classList.toggle('active', phase === i);
      button.setAttribute('aria-pressed', String(phase === i));
    });
  }
  function schedule() {
    if (timer) window.clearInterval(timer);
    timer = null;
    const stopped = paused || document.hidden;
    demo.classList.toggle('paused', stopped);
    if (!stopped) timer = window.setInterval(() => { phase = (phase + 1) % 3; paint(); }, 5200);
  }
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    phase = index;
    paused = true;
    demo.classList.add('manual');
    paint();
    schedule();
  }));
  preference.addEventListener('change', event => { paused = event.matches; demo.classList.toggle('manual', paused); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  demo.classList.toggle('manual', paused);
  paint();
  schedule();
})();
