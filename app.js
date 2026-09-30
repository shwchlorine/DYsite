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
  const strapL = document.getElementById('strap-left');
  const strapR = document.getElementById('strap-right');
  const clipGroup = document.getElementById('clip-group');
  if (!card || !lanyard || !strapL || !strapR) return;

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

  // pendulum state
  let angle = 0;
  let angVel = 0;
  let ropeLen = 0;
  function recomputeRopeLen() {
    const cardRect = card.getBoundingClientRect();
    ropeLen = 170 + cardRect.height / 2;
  }
  recomputeRopeLen();
  window.addEventListener('resize', recomputeRopeLen);

  // dragging
  let dragging = false;
  let dragStart = { angle: 0 };
  let lastPointer = { x: 0, y: 0, t: 0 };
  window._dragged = false;
  let dragMoved = 0;

  function pointerAngle(clientX, clientY) {
    const dx = clientX - pivot.x;
    const dy = clientY - pivot.y;
    return Math.atan2(dx, dy);
  }

  card.addEventListener('pointerdown', (e) => {
    updatePivot();
    dragging = true;
    dragMoved = 0;
    window._dragged = false;
    card.setPointerCapture(e.pointerId);
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
    angVel = (newAngle - angle) / (dt / 1000);
    angle = newAngle;
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
    setTimeout(() => { window._dragged = false; }, 50);
  };
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', endDrag);

  // physics
  const gravity = 42;
  const damping = 0.98;
  let last = performance.now();

  function apply() {
    const deg = angle * 180 / Math.PI;
    card.style.transform = `translateX(-50%) rotate(${deg}deg)`;
    // Move the Y-strap ends & clip so they follow the swing.
    // Anchor points at top: left(140,0) right(260,0). Join at (200,140) at rest.
    // When swinging, only the JOIN moves — the top anchors stay fixed.
    const joinRestX = 200, joinRestY = 140;
    const clipRestY = 170;
    const dx = Math.sin(angle) * joinRestY;
    const dy = (Math.cos(angle) - 1) * joinRestY;
    const joinX = joinRestX + dx;
    const joinY = joinRestY + dy;
    // control points bend toward the swing direction
    const cL_x = 140 + (joinX - 140) * 0.35 + Math.sin(angle) * 10;
    const cL_y = joinY * 0.4;
    const cR_x = 260 + (joinX - 260) * 0.35 + Math.sin(angle) * 10;
    const cR_y = joinY * 0.4;
    strapL.setAttribute('d', `M 140 0 Q ${cL_x.toFixed(1)} ${cL_y.toFixed(1)} ${joinX.toFixed(1)} ${joinY.toFixed(1)}`);
    strapR.setAttribute('d', `M 260 0 Q ${cR_x.toFixed(1)} ${cR_y.toFixed(1)} ${joinX.toFixed(1)} ${joinY.toFixed(1)}`);
    if (clipGroup) {
      // clip rotates with the strap and hangs from the join
      const clipDx = joinX - 200;
      const clipDy = joinY - joinRestY;
      clipGroup.setAttribute('transform', `translate(${clipDx.toFixed(1)} ${clipDy.toFixed(1)}) rotate(${deg.toFixed(1)} 200 ${joinRestY})`);
    }
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) {
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

  setTimeout(() => { if (!dragging) angVel = 1.8; }, 700);
})();
