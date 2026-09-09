(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d', { alpha: false });
  const start = document.getElementById('start');
  const made = document.getElementById('made');
  const nodeLabel = document.getElementById('nodeLabel');
  const timerEl = document.getElementById('timer');
  const worldCountEl = document.getElementById('worldCount');
  const shareBtn = document.getElementById('shareBtn');
  const copyBtn = document.getElementById('copyBtn');
  const aboutBtn = document.getElementById('aboutBtn');
  const about = document.getElementById('about');
  const closeAbout = document.getElementById('closeAbout');
  const toast = document.getElementById('toast');

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR_CAP = 2;
  let dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  let W = innerWidth;
  let H = innerHeight;
  let raf = 0;
  let last = performance.now();
  let growthAnimation = null;
  let chosenGrowth = null;

  const palette = {
    bg: '#050b0a',
    dormant: 'rgba(104, 139, 120, .16)',
    dormantSoft: 'rgba(116, 153, 131, .08)',
    alive: 'rgba(196, 255, 214, .72)',
    aliveBright: 'rgba(224, 255, 233, .98)',
    bloom: 'rgba(198, 255, 218, .9)'
  };

  const state = {
    baseCount: 18420,
    nodeId: Number(localStorage.getItem('raluvaNodeId')) || 18421,
    created: Boolean(localStorage.getItem('raluvaCreated')),
    createdAt: Number(localStorage.getItem('raluvaCreatedAt')) || 0,
    growth: localStorage.getItem('raluvaGrowth') || null
  };

  const world = {
    branches: [],
    motes: []
  };

  function resize() {
    W = innerWidth;
    H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildWorld();
  }

  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildWorld() {
    const rand = mulberry32(941731);
    world.branches = [];
    world.motes = [];

    const cx = W * 0.5;
    const cy = H * (W < 760 ? 0.33 : 0.47);
    const trunkLen = Math.min(W, H) * 0.17;

    const roots = 22;
    for (let i = 0; i < roots; i++) {
      const angle = (Math.PI * 2 * i / roots) + rand() * .3;
      const inner = 35 + rand() * 80;
      const outer = inner + trunkLen * (.38 + rand() * .68);
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner * .72;
      const x2 = cx + Math.cos(angle + (rand() - .5) * .35) * outer;
      const y2 = cy + Math.sin(angle + (rand() - .5) * .35) * outer * .72;
      const mx = (x1 + x2) / 2 + (rand() - .5) * 48;
      const my = (y1 + y2) / 2 + (rand() - .5) * 48;
      world.branches.push({ x1, y1, mx, my, x2, y2, alpha: .4 + rand() * .6, width: .65 + rand() * 1.2 });

      if (rand() > .35) {
        const childA = angle + (rand() > .5 ? 1 : -1) * (.28 + rand() * .45);
        const childLen = trunkLen * (.18 + rand() * .3);
        world.branches.push({
          x1: x2,
          y1: y2,
          mx: x2 + Math.cos(childA) * childLen * .5 + (rand() - .5) * 18,
          my: y2 + Math.sin(childA) * childLen * .45 + (rand() - .5) * 18,
          x2: x2 + Math.cos(childA) * childLen,
          y2: y2 + Math.sin(childA) * childLen * .72,
          alpha: .25 + rand() * .45,
          width: .55 + rand() * .8
        });
      }
    }

    for (let i = 0; i < 58; i++) {
      const a = rand() * Math.PI * 2;
      const r = 40 + rand() * Math.min(W, H) * .38;
      world.motes.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * .72,
        r: .45 + rand() * 1.15,
        a: .08 + rand() * .28,
        phase: rand() * Math.PI * 2,
        speed: .15 + rand() * .4
      });
    }
  }

  function bezierPoint(b, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * b.x1 + 2 * mt * t * b.mx + t * t * b.x2,
      y: mt * mt * b.y1 + 2 * mt * t * b.my + t * t * b.y2
    };
  }

  function drawBranch(b, alphaScale = 1) {
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.quadraticCurveTo(b.mx, b.my, b.x2, b.y2);
    ctx.lineWidth = b.width;
    ctx.strokeStyle = `rgba(127, 169, 143, ${0.12 * b.alpha * alphaScale})`;
    ctx.stroke();
  }

  function drawBackground(now) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W * .5;
    const cy = H * (W < 760 ? .33 : .47);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * .5);
    g.addColorStop(0, 'rgba(59, 111, 79, .10)');
    g.addColorStop(.35, 'rgba(28, 66, 45, .055)');
    g.addColorStop(1, 'rgba(5, 11, 10, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of world.branches) drawBranch(b);
    for (const m of world.motes) {
      const pulse = .65 + Math.sin(now * .001 * m.speed + m.phase) * .35;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160, 222, 181, ${m.a * pulse})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function activeGeometry(type = 'bend') {
    const cx = W * .5;
    const cy = H * (W < 760 ? .33 : .47);
    const length = Math.min(W, H) * .16;
    const base = {
      x1: cx - length * .33,
      y1: cy + length * .18,
      mx: cx - length * .08,
      my: cy - length * .02,
      x2: cx,
      y2: cy - length * .18,
      width: 2.1,
      alpha: 1
    };

    if (!type) return [base];
    if (type === 'bend') {
      return [base, { x1: base.x2, y1: base.y2, mx: cx + length * .22, my: cy - length * .42, x2: cx + length * .26, y2: cy - length * .62, width: 2.25, alpha: 1 }];
    }
    if (type === 'fork') {
      return [
        base,
        { x1: base.x2, y1: base.y2, mx: cx - length * .10, my: cy - length * .42, x2: cx - length * .22, y2: cy - length * .58, width: 1.85, alpha: 1 },
        { x1: base.x2, y1: base.y2, mx: cx + length * .13, my: cy - length * .39, x2: cx + length * .25, y2: cy - length * .57, width: 1.85, alpha: 1 }
      ];
    }
    return [
      base,
      { x1: base.x2, y1: base.y2, mx: cx + length * .02, my: cy - length * .4, x2: cx + length * .02, y2: cy - length * .54, width: 1.8, alpha: 1 }
    ];
  }

  function strokePartial(b, progress, glowStrength) {
    const steps = 40;
    ctx.beginPath();
    const first = bezierPoint(b, 0);
    ctx.moveTo(first.x, first.y);
    const max = Math.max(1, Math.floor(steps * progress));
    for (let i = 1; i <= max; i++) {
      const p = bezierPoint(b, i / steps);
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = b.width;
    ctx.strokeStyle = palette.alive;
    ctx.shadowColor = `rgba(174, 255, 200, ${glowStrength})`;
    ctx.shadowBlur = 13 + glowStrength * 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawActive(now) {
    const type = chosenGrowth || state.growth;
    const parts = activeGeometry(type);
    const breathe = .55 + Math.sin(now * .0021) * .18;
    let globalProgress = 1;

    if (growthAnimation) {
      const elapsed = now - growthAnimation.start;
      globalProgress = Math.min(1, elapsed / growthAnimation.duration);
      globalProgress = 1 - Math.pow(1 - globalProgress, 3);
      if (globalProgress >= 1) growthAnimation = null;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    parts.forEach((b, i) => {
      let p = 1;
      if (i > 0 && chosenGrowth) {
        const local = Math.max(0, (globalProgress - .34) / .66);
        p = Math.min(1, local * parts.length / Math.max(1, parts.length - 1));
      }
      strokePartial(b, p, .32 + breathe * .4);
    });

    const tip = bezierPoint(parts[parts.length - 1], 1);
    const coreR = 2.6 + breathe * 1.5;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = palette.aliveBright;
    ctx.shadowColor = 'rgba(184,255,207,.95)';
    ctx.shadowBlur = 24;
    ctx.fill();

    if (type === 'bloom' && (!growthAnimation || globalProgress > .78)) {
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const a = Math.PI * 2 * i / petals + now * .00008;
        ctx.beginPath();
        ctx.arc(tip.x + Math.cos(a) * 10, tip.y + Math.sin(a) * 10, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201,255,219,.72)';
        ctx.shadowBlur = 13;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(32, now - last);
    last = now;
    drawBackground(now);
    drawActive(now);
    if (!prefersReduced) raf = requestAnimationFrame(frame);
  }

  function switchToMade(type) {
    chosenGrowth = type;
    state.growth = type;
    state.created = true;
    state.createdAt = Date.now();
    localStorage.setItem('raluvaCreated', '1');
    localStorage.setItem('raluvaGrowth', type);
    localStorage.setItem('raluvaCreatedAt', String(state.createdAt));
    localStorage.setItem('raluvaNodeId', String(state.nodeId));

    nodeLabel.textContent = `Node #${state.nodeId.toLocaleString('en-US')}`;
    worldCountEl.textContent = state.nodeId.toLocaleString('en-US');
    growthAnimation = { start: performance.now(), duration: prefersReduced ? 1 : 1250 };

    start.classList.remove('active');
    setTimeout(() => made.classList.add('active'), prefersReduced ? 0 : 260);
    updateTimer();
  }

  function updateTimer() {
    if (!state.createdAt) return;
    const ttl = 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, ttl - (Date.now() - state.createdAt));
    const s = Math.floor(remaining / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    timerEl.textContent = `${hh}:${mm}:${ss}`;
  }

  function branchUrl() {
    const u = new URL(location.href);
    u.searchParams.set('from', String(state.nodeId));
    u.searchParams.set('g', state.growth || 'bend');
    return u.toString();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(branchUrl());
      showToast('Branch link copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = branchUrl();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('Branch link copied');
    }
  }

  async function shareBranch() {
    const payload = {
      title: 'A living branch reached you',
      text: 'I added something to a living artwork. One more human keeps this branch growing.',
      url: branchUrl()
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch (e) {
        if (e && e.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  }

  document.querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => switchToMade(btn.dataset.growth));
  });

  shareBtn.addEventListener('click', shareBranch);
  copyBtn.addEventListener('click', copyLink);

  aboutBtn.addEventListener('click', () => {
    about.classList.add('open');
    about.setAttribute('aria-hidden', 'false');
  });
  closeAbout.addEventListener('click', () => {
    about.classList.remove('open');
    about.setAttribute('aria-hidden', 'true');
  });

  addEventListener('resize', resize, { passive: true });
  resize();

  if (state.created && state.growth) {
    chosenGrowth = state.growth;
    nodeLabel.textContent = `Node #${state.nodeId.toLocaleString('en-US')}`;
    worldCountEl.textContent = state.nodeId.toLocaleString('en-US');
    start.classList.remove('active');
    made.classList.add('active');
  }

  updateTimer();
  setInterval(updateTimer, 1000);

  if (prefersReduced) {
    drawBackground(performance.now());
    drawActive(performance.now());
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
