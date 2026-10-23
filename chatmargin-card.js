(() => {
  const frames = [...document.querySelectorAll('.chatmargin-landing-animation')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || navigator.connection?.saveData) return;
  const resize = frame => { frame.style.transform = `scale(${frame.parentElement.clientWidth / 1200})`; };
  const sizeObserver = new ResizeObserver(entries => entries.forEach(entry => {
    const frame = entry.target.querySelector('.chatmargin-landing-animation');
    if (frame) resize(frame);
  }));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const frame = entry.target;
    if (entry.isIntersecting) {
      if (!frame.hasAttribute('src')) frame.src = frame.dataset.animationSrc;
      resize(frame);
    } else {
      frame.removeAttribute('src');
      frame.classList.remove('is-loaded');
    }
  }), { rootMargin: '200px 0px' });
  frames.forEach(frame => {
    frame.addEventListener('load', () => {
      if (frame.hasAttribute('src')) frame.classList.add('is-loaded');
    });
    sizeObserver.observe(frame.parentElement);
    observer.observe(frame);
  });
})();
