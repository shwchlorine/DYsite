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
// Pendulum with damped-spring restoring force. Drag to swing.
(() => {
  const card = document.getElementById('pokeCard');
  const lanyard = document.getElementById('lanyard');
  const path = document.getElementById('lanyard-path');
  const clip = document.getElementById('lanyard-clip');
  if (!card || !lanyard || !path) return;

  // pivot is at top-center of lanyard container
  const pivot = { x: 0, y: 0 };
  function updatePivot() {
    const rect = lanyard.getBoundingClientRect();
    pivot.x = rect.left + rect.width / 2;
    pivot.y = rect.top;
  }
  updatePivot();
  window.addEventListener('resize', updatePivot);
  window.addEventListener('scroll', updatePivot, { passive: true });

  // pendulum state: angle from vertical, angular velocity
  let angle = 0;         // radians
  let angVel = 0;        // rad/s
  let ropeLen = 0;       // px from pivot to card center
  function recomputeRopeLen() {
    const cardRect = card.getBoundingClientRect();
    // baseline is: card top-center should sit 80px below pivot after transform-origin
    ropeLen = 80 + cardRect.height / 2;
  }
  recomputeRopeLen();
  window.addEventListener('resize', recomputeRopeLen);

  // dragging
  let dragging = false;
  let dragStart = { x: 0, y: 0, angle: 0 };
  let lastPointer = { x: 0, y: 0, t: 0 };
  window._dragged = false;
  let dragMoved = 0;

  function pointerAngle(clientX, clientY) {
    // angle from pivot down-vector to (clientX,clientY)
    const dx = clientX - pivot.x;
    const dy = clientY - pivot.y;
    return Math.atan2(dx, dy); // 0 straight down, +right, -left
  }

  card.addEventListener('pointerdown', (e) => {
    updatePivot();
    dragging = true;
    dragMoved = 0;
    window._dragged = false;
    card.setPointerCapture(e.pointerId);
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragStart.angle = pointerAngle(e.clientX, e.clientY) - angle;
    lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() };
    card.style.cursor = 'grabbing';
  });

  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.t);
    dragMoved += Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
    if (dragMoved > 5) window._dragged = true;
    const newAngle = pointerAngle(e.clientX, e.clientY) - dragStart.angle;
    // instantaneous ang velocity for release
    angVel = (newAngle - angle) / (dt / 1000);
    angle = newAngle;
    // clamp so it doesn't wrap crazy
    if (angle > Math.PI * 0.9) angle = Math.PI * 0.9;
    if (angle < -Math.PI * 0.9) angle = -Math.PI * 0.9;
    lastPointer = { x: e.clientX, y: e.clientY, t: now };
    apply();
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { card.releasePointerCapture(e.pointerId); } catch (_) {}
    card.style.cursor = 'grab';
    // reset drag flag on next tick so click handler sees false only if no drag
    setTimeout(() => { window._dragged = false; }, 50);
  };
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', endDrag);

  // physics loop
  const gravity = 32;    // rad/s^2 scaled
  const damping = 0.985; // per frame at ~60fps
  const springK = 0.0;   // pure pendulum
  let last = performance.now();

  function apply() {
    // update card transform
    const deg = angle * 180 / Math.PI;
    // rotate around top pivot; the CSS transform-origin is at 50% -80px
    card.style.transform = `translateX(-50%) rotate(${deg}deg)`;
    // update lanyard SVG path & clip
    if (path) {
      const rect = lanyard.getBoundingClientRect();
      // pivot in SVG viewBox = (200, 0)
      // rope end in SVG coords: rotate (0, 80) by angle around (200, 0)
      const scale = 400 / rect.width;
      const endX = 200 + Math.sin(angle) * 80;
      const endY = Math.cos(angle) * 80;
      // control point pulls slightly toward the trailing side for a subtle curve
      const cX = 200 + Math.sin(angle) * 40;
      const cY = Math.cos(angle) * 40 - Math.sin(angle) * 8;
      path.setAttribute('d', `M 200 0 Q ${cX.toFixed(1)} ${cY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`);
      if (clip) {
        clip.setAttribute('cx', endX.toFixed(1));
        clip.setAttribute('cy', endY.toFixed(1));
      }
    }
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) {
      // pendulum: angular acceleration = -(g/L) * sin(angle)
      const accel = -(gravity / (ropeLen / 100)) * Math.sin(angle);
      angVel += accel * dt;
      angVel *= damping;
      angle += angVel * dt;
      if (Math.abs(angVel) < 0.001 && Math.abs(angle) < 0.001) {
        angVel = 0; angle = 0;
      }
      apply();
    }
    requestAnimationFrame(tick);
  }
  apply();
  requestAnimationFrame((t) => { last = t; tick(t); });

  // Tiny "arrival" swing so users notice it's interactive
  setTimeout(() => {
    if (!dragging) angVel = 2.2;
  }, 600);
})();
