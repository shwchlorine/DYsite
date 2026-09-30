// Custom cursor
(() => {
  const cursor = document.getElementById('cursor');
  if (!cursor || matchMedia('(hover: none)').matches) return;
  let x = 0, y = 0, tx = 0, ty = 0;
  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; document.body.classList.add('cursor-ready'); });
  function tick() {
    x += (tx - x) * 0.25;
    y += (ty - y) * 0.25;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    requestAnimationFrame(tick);
  }
  tick();
  const hoverSel = 'a, button, .project, .tenets li, .more';
  document.querySelectorAll(hoverSel).forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
})();

// Rotating intro tagline
(() => {
  const words = document.querySelectorAll('.rot-word');
  if (words.length < 2) return;
  let i = 0;
  setInterval(() => {
    words[i].removeAttribute('data-active');
    i = (i + 1) % words.length;
    words[i].setAttribute('data-active', '');
  }, 3200);
})();

// Count-up metric on card hover / scroll into view
(() => {
  const counters = document.querySelectorAll('.metric-value');
  const animate = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target || '0');
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = target >= 10 ? Math.floor(val) : val.toFixed(1);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target >= 10 ? String(target) : (Number.isInteger(target) ? String(target) : target.toFixed(1));
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) animate(e.target); });
    }, { threshold: 0.4 });
    counters.forEach(el => io.observe(el));
  } else {
    counters.forEach(animate);
  }

  // re-trigger on card hover
  document.querySelectorAll('.project').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const el = card.querySelector('.metric-value');
      if (!el) return;
      delete el.dataset.done;
      el.textContent = '0';
      animate(el);
    });
  });
})();

// ESC to close dialog
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const d = document.getElementById('about');
    if (d && d.open) d.close();
  }
});

// ─────────── LANYARD PHYSICS ───────────
// Position-based (Verlet) rigid body on two rope straps.
//   J      – where both straps meet (the fold above the metal clip)
//   T      – the hook point in the sleeve's slot; J–T is the rigid clip
//   BL, BR – the badge's bottom corners; T/BL/BR form a rigid triangle
// Straps are ropes: they only pull when taut, and sag when slack.
// Everything is in stage-local CSS pixels.
(() => {
  const stage = document.getElementById('stage');
  const badge = document.getElementById('badge');
  const sleeve = document.getElementById('sleeve');
  const tcg = document.getElementById('tcg');
  const front = document.getElementById('strapFront');
  const shadow = document.getElementById('strapShadow');
  if (!stage || !badge || !sleeve || !front || !shadow) return;

  const stL = front.querySelector('.st-l'), stL2 = front.querySelector('.st-l2');
  const stR = front.querySelector('.st-r'), stR2 = front.querySelector('.st-r2');
  const shL = shadow.querySelector('.sh-l'), shR = shadow.querySelector('.sh-r');
  const clip = document.getElementById('clip');
  const hook = document.getElementById('clipHook');
  const hookEdge = document.getElementById('clipHookEdge');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GRAVITY = 2300;       // px/s²
  const AIR = 1.1;            // velocity decay per second (card)
  const AIR_J = 3.0;          // the strap joint is light and settles faster
  const STEP = 1 / 120;       // fixed physics step
  const ITER = 8;             // constraint iterations per step
  let HOOK = 40;              // J → T clip length (scales with the viewport)
  const SHADOW_DX = 22, SHADOW_DY = 18;

  const pt = (w) => ({ x: 0, y: 0, px: 0, py: 0, w });
  const J = pt(2.5), T = pt(1), BL = pt(1), BR = pt(1);
  const P = [J, T, BL, BR];

  let bw = 0, bh = 0, holeY = 16, dTL = 0, dBB = 0;
  let AL = { x: 0, y: 0 }, AR = { x: 0, y: 0 }, ropeLen = 0;

  function place(jx, jy) {
    J.x = jx; J.y = jy;
    T.x = jx; T.y = jy + HOOK;
    BL.x = jx - bw / 2; BL.y = T.y - holeY + bh;
    BR.x = jx + bw / 2; BR.y = BL.y;
    P.forEach(p => { p.px = p.x; p.py = p.y; });
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    bw = badge.offsetWidth;
    bh = badge.offsetHeight;
    const slot = sleeve.querySelector('.slot');
    holeY = slot ? slot.offsetTop + slot.parentElement.offsetTop + slot.offsetHeight / 2 : 16;
    dTL = Math.hypot(bw / 2, bh - holeY);
    dBB = bw;
    badge.style.transformOrigin = `${bw / 2}px ${holeY}px`;

    // Proportions follow samfcheng.com: straps meet ~25% down the viewport,
    // clip ~9% long, sleeve spans ~33%–81%, so it overlaps the name behind.
    const rect = stage.getBoundingClientRect();
    const stageTop = rect.top + window.scrollY;      // stage offset in the page
    const vh = window.innerHeight;
    const cx = W / 2;
    HOOK = Math.max(36, Math.min(90, vh * 0.085));
    let jy = vh * 0.25 - stageTop;
    jy = Math.max(40, Math.min(jy, vh - stageTop - bh - HOOK - 20));
    // straps cross the top edge of the page ~6% either side of centre,
    // and the anchors sit further up the same lines, off-screen
    const ay = -stageTop - 80;
    const topSpread = Math.max(W * 0.06, bw * 0.3);
    const spread = topSpread * (jy - ay) / (jy + stageTop);
    AL = { x: cx - spread, y: ay };
    AR = { x: cx + spread, y: ay };
    ropeLen = Math.hypot(spread, jy - ay);
    place(cx, jy);

    // line the giant name up with the middle of the card at rest
    // (Fraunces capitals: top ≈ line top + 0.05em, height ≈ 0.7em → centre ≈ +0.4em)
    const name = stage.querySelector('.name-behind');
    if (name) {
      const fs = parseFloat(getComputedStyle(name).fontSize);
      const cardMid = jy + HOOK - holeY + bh / 2;
      name.style.top = `${Math.round(cardMid - fs * 0.4)}px`;
      name.style.bottom = 'auto';
    }

    // end the hero a little below the card instead of at the bottom of the
    // screen, so the ticker moves up but the next section stays below the fold
    const cardBottom = jy + HOOK - holeY + bh;
    stage.style.height = `${Math.round(cardBottom + vh * 0.14)}px`;
  }

  // ── constraints ──
  function distance(a, b, len, stiff = 1) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    const wsum = a.w + b.w;
    const k = ((d - len) / d / wsum) * stiff;
    a.x += dx * k * a.w; a.y += dy * k * a.w;
    b.x -= dx * k * b.w; b.y -= dy * k * b.w;
  }
  function rope(anchor, p, len) {
    const dx = p.x - anchor.x, dy = p.y - anchor.y;
    const d = Math.hypot(dx, dy);
    if (d <= len) return; // slack
    const k = (d - len) / d * 0.9; // a touch of stretch, like a fabric strap
    p.x -= dx * k; p.y -= dy * k;
  }

  // ── dragging ──
  let drag = null; // { a, b, c, x, y } barycentric grab + target
  let dragMoved = 0;
  let lastDown = { x: 0, y: 0 };

  function local(e) {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function barycentric(q) {
    const v0x = BL.x - T.x, v0y = BL.y - T.y;
    const v1x = BR.x - T.x, v1y = BR.y - T.y;
    const v2x = q.x - T.x, v2y = q.y - T.y;
    const den = v0x * v1y - v1x * v0y || 1e-6;
    const b = (v2x * v1y - v1x * v2y) / den;
    const c = (v0x * v2y - v2x * v0y) / den;
    return { a: 1 - b - c, b, c };
  }
  function dragConstraint() {
    if (!drag) return;
    const { a, b, c } = drag;
    const gx = a * T.x + b * BL.x + c * BR.x;
    const gy = a * T.y + b * BL.y + c * BR.y;
    const cx = drag.x - gx, cy = drag.y - gy;
    const den = a * a * T.w + b * b * BL.w + c * c * BR.w || 1e-6;
    const k = 0.25 / den; // soft grip: the badge lags the hand a little
    T.x += cx * k * a * T.w;   T.y += cy * k * a * T.w;
    BL.x += cx * k * b * BL.w; BL.y += cy * k * b * BL.w;
    BR.x += cx * k * c * BR.w; BR.y += cy * k * c * BR.w;
  }

  badge.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const q = local(e);
    drag = { ...barycentric(q), x: q.x, y: q.y };
    dragMoved = 0;
    lastDown = { x: e.clientX, y: e.clientY };
    window._dragged = false;
    badge.setPointerCapture(e.pointerId);
  });
  badge.addEventListener('pointermove', (e) => {
    const q = local(e);
    if (drag) {
      drag.x = q.x; drag.y = q.y;
      dragMoved = Math.max(dragMoved, Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y));
      if (dragMoved > 5) window._dragged = true;
    } else {
      // hover: light follows the pointer across the card
      const r = tcg.getBoundingClientRect();
      hover.x = (e.clientX - r.left) / r.width;
      hover.y = (e.clientY - r.top) / r.height;
      hover.on = true;
    }
  });
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    try { badge.releasePointerCapture(e.pointerId); } catch (_) {}
    // cap the throw so a flick can't wrap the badge round the strap
    const MAX = 45;
    P.forEach(p => {
      const vx = p.x - p.px, vy = p.y - p.py;
      const v = Math.hypot(vx, vy);
      if (v > MAX) { p.px = p.x - vx / v * MAX; p.py = p.y - vy / v * MAX; }
    });
    setTimeout(() => { window._dragged = false; }, 0);
  };
  badge.addEventListener('pointerup', endDrag);
  badge.addEventListener('pointercancel', endDrag);
  badge.addEventListener('pointerleave', () => { hover.on = false; });
  badge.addEventListener('click', () => {
    if (!window._dragged) document.getElementById('about').showModal();
  });

  // ── simulation ──
  function step(dt) {
    const g = GRAVITY * dt * dt;
    const dAir = Math.exp(-AIR * dt), dJ = Math.exp(-AIR_J * dt);
    for (const p of P) {
      const damp = p === J ? dJ : dAir;
      const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + g;
    }
    for (let i = 0; i < ITER; i++) {
      dragConstraint();
      rope(AL, J, ropeLen);
      rope(AR, J, ropeLen);
      distance(J, T, HOOK);
      distance(T, BL, dTL);
      distance(T, BR, dTL);
      distance(BL, BR, dBB);
    }
  }

  // ── rendering ──
  const hover = { x: 0.5, y: 0.5, on: false };
  let ry = 0, rx = 0, lx = 50, ly = 30;
  const f1 = (n) => n.toFixed(1);

  function strapPath(a, end, len) {
    const d = Math.hypot(end.x - a.x, end.y - a.y);
    // slack straps hang in a curve; taut ones are straight
    const sag = Math.sqrt(Math.max(0, len * len - d * d)) * 0.45;
    const mx = (a.x + end.x) / 2, my = (a.y + end.y) / 2 + sag;
    return `M ${f1(a.x)} ${f1(a.y)} Q ${f1(mx)} ${f1(my)} ${f1(end.x)} ${f1(end.y)}`;
  }
  function shifted(a, end, len, ox, oy) {
    return strapPath({ x: a.x + ox, y: a.y + oy }, { x: end.x + ox, y: end.y + oy }, len);
  }

  function render() {
    const mx = (BL.x + BR.x) / 2, my = (BL.y + BR.y) / 2;
    const theta = Math.atan2(-(mx - T.x), my - T.y);
    badge.style.transform =
      `translate(${f1(T.x - bw / 2)}px, ${f1(T.y - holeY)}px) rotate(${(theta * 180 / Math.PI).toFixed(2)}deg)`;

    // the badge twists on its clip as it swings, and tips toward a hovering pointer
    const vx = (mx - (BL.px + BR.px) / 2) / STEP;
    let tRy = Math.max(-28, Math.min(28, -vx * 0.018));
    let tRx = 0;
    if (hover.on && !drag) {
      tRy += (hover.x - 0.5) * 14;
      tRx += (0.5 - hover.y) * 10;
    }
    ry += (tRy - ry) * 0.12;
    rx += (tRx - rx) * 0.12;
    sleeve.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    sleeve.style.setProperty('--rx', `${rx.toFixed(2)}deg`);

    const tlx = hover.on ? hover.x * 100 : 50 + ry * 2.2 - theta * 60;
    const tly = hover.on ? hover.y * 100 : 28 - rx * 2;
    lx += (tlx - lx) * 0.15; ly += (tly - ly) * 0.15;
    tcg.style.setProperty('--lx', `${f1(lx)}%`);
    tcg.style.setProperty('--ly', `${f1(ly)}%`);
    tcg.style.setProperty('--hx', `${f1(lx)}%`);
    tcg.style.setProperty('--hy', `${f1(ly)}%`);
    sleeve.style.setProperty('--gx', `${f1(100 - lx)}%`);

    // clip hangs from J along J→T
    const phi = Math.atan2(-(T.x - J.x), T.y - J.y) * 180 / Math.PI;
    clip.setAttribute('transform', `translate(${f1(J.x)} ${f1(J.y)}) rotate(${phi.toFixed(2)})`);
    const hookLen = Math.hypot(T.x - J.x, T.y - J.y);
    hook.setAttribute('d', `M 0 17 L 0 ${f1(hookLen)}`);
    hookEdge.setAttribute('d', `M 1.2 17 L 1.2 ${f1(hookLen)}`);

    // strap ends tuck into the fold either side of the joint
    const rad = phi * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const at = (ox, oy) => ({ x: J.x + ox * cos - oy * sin, y: J.y + ox * sin + oy * cos });
    const eL = at(-5, -4), eR = at(5, -4);
    stL.setAttribute('d', strapPath(AL, eL, ropeLen));
    stR.setAttribute('d', strapPath(AR, eR, ropeLen));
    stL2.setAttribute('d', shifted(AL, eL, ropeLen, -3.5, 0));
    stR2.setAttribute('d', shifted(AR, eR, ropeLen, -3.5, 0));
    shL.setAttribute('d', shifted(AL, eL, ropeLen, SHADOW_DX, SHADOW_DY));
    shR.setAttribute('d', shifted(AR, eR, ropeLen, SHADOW_DX, SHADOW_DY));
  }

  let acc = 0, last = 0;
  function frame(now) {
    if (!last) last = now;
    acc += Math.min(0.05, (now - last) / 1000);
    last = now;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }

  function start() {
    layout();
    if (!reduceMotion) {
      // drop in from above; the straps catch it and it swings to rest
      const lift = stage.clientHeight * 0.45;
      P.forEach(p => { p.y -= lift; p.py = p.y; p.x += 60; p.px = p.x; });
    }
    render();
    badge.classList.add('ready');
    requestAnimationFrame(frame);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  const img = badge.querySelector('img');
  if (document.fonts && document.fonts.ready) {
    Promise.all([document.fonts.ready, img && !img.complete ? new Promise(r => { img.onload = img.onerror = r; }) : null]).then(start);
  } else {
    window.addEventListener('load', start);
  }
})();
