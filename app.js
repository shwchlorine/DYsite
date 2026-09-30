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
  const hoverSel = 'a, button, .project, .tenets li';
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
      const dp = el.dataset.decimals != null ? +el.dataset.decimals : (target >= 10 || Number.isInteger(target) ? 0 : 1);
      el.textContent = target >= 10 && el.dataset.decimals == null ? Math.floor(val) : val.toFixed(dp || (target < 10 ? 1 : 0));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(dp);
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

  // re-count whenever a work card comes to the top of the deck
  document.querySelectorAll('.project').forEach(card => {
    card.addEventListener('card:shown', () => {
      const el = card.querySelector('.metric-value');
      if (!el) return;
      delete el.dataset.done;
      el.textContent = '0';
      animate(el);
    });
  });
})();

// ─────────── WORK DECK ───────────
// The work entries are a stack of trading cards. Drag or click the top card
// to send it to the back; ← / → (or the buttons / index) flip through.
(() => {
  const deck = document.getElementById('deck');
  if (!deck) return;
  const cards = [...deck.querySelectorAll('.wcard')];
  const n = cards.length;
  if (!n) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const count = document.getElementById('deckCount');
  const index = document.getElementById('deckIndex');
  let order = cards.map((_, i) => i); // order[0] is the top card
  let busy = false;

  // index list built from the cards themselves
  const indexButtons = cards.map((c, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    const num = document.createElement('span'); num.className = 'n'; num.textContent = String(i + 1).padStart(2, '0');
    const t = document.createElement('span'); t.className = 't'; t.textContent = c.querySelector('h2').textContent;
    const y = document.createElement('span'); y.className = 'y'; y.textContent = c.querySelector('.proj-year').textContent;
    b.append(num, t, y);
    b.addEventListener('click', () => goTo(i));
    li.append(b);
    index?.append(li);
    return b;
  });

  function slot(p) {
    if (p === 0) return 'translate(0px, 0px) rotate(0deg) scale(1)';
    const rot = (p % 2 ? 2.6 : -2.2) * Math.min(p, 2);
    return `translate(${p * 12}px, ${p * 11}px) rotate(${rot}deg) scale(${(1 - p * 0.035).toFixed(3)})`;
  }
  function layout() {
    order.forEach((ci, p) => {
      const c = cards[ci];
      c.style.zIndex = String(n - p);
      c.style.transform = slot(p);
      const top = p === 0;
      c.classList.toggle('is-top', top);
      c.setAttribute('aria-hidden', top ? 'false' : 'true');
      c.inert = !top;
    });
    const topI = order[0];
    if (count) count.textContent = `${topI + 1} / ${n}`;
    indexButtons.forEach((b, i) => b.setAttribute('aria-current', i === topI ? 'true' : 'false'));
  }
  function shown() { cards[order[0]].dispatchEvent(new Event('card:shown')); }

  async function next(side = -1) {
    if (busy) return;
    busy = true;
    const top = cards[order[0]];
    if (!reduce) {
      top.classList.remove('dragging');
      top.classList.add('flying');
      top.style.transform = `translate(${side * 115}%, -4%) rotate(${side * 16}deg)`;
      await wait(270);
      top.classList.remove('flying');
    }
    order.push(order.shift()); // tucks under the stack on its way back
    layout();
    shown();
    await wait(300);
    busy = false;
  }
  async function prev() {
    if (busy) return;
    busy = true;
    const ci = order.pop();
    order.unshift(ci);
    const c = cards[ci];
    if (!reduce) {
      c.classList.add('no-anim');
      c.style.zIndex = String(n + 1);
      c.style.transform = 'translate(-115%, -4%) rotate(-16deg)';
      void c.offsetWidth;
      c.classList.remove('no-anim');
    }
    layout();
    shown();
    await wait(420);
    busy = false;
  }
  function goTo(i) {
    if (busy || order[0] === i) return;
    while (order[0] !== i) order.push(order.shift());
    layout();
    shown();
  }

  // ── drag / click the top card ──
  let drag = null;
  deck.addEventListener('pointerdown', (e) => {
    const top = cards[order[0]];
    if (busy || e.button !== 0 || !top.contains(e.target) || e.target.closest('a')) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), moved: 0, id: e.pointerId, card: top };
    top.setPointerCapture(e.pointerId);
    top.classList.add('dragging');
  });
  deck.addEventListener('pointermove', (e) => {
    const top = cards[order[0]];
    if (drag && e.pointerId === drag.id) {
      drag.dx = e.clientX - drag.x;
      drag.dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(drag.dx, drag.dy));
      drag.card.style.transform = `translate(${drag.dx}px, ${drag.dy * 0.35}px) rotate(${drag.dx * 0.06}deg)`;
      return;
    }
    // foil follows the pointer on the top card
    if (top.contains(e.target)) {
      const r = top.getBoundingClientRect();
      top.style.setProperty('--lx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      top.style.setProperty('--ly', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, moved, t, card } = drag;
    drag = null;
    try { card.releasePointerCapture(e.pointerId); } catch (_) {}
    const speed = Math.abs(dx) / Math.max(1, performance.now() - t);
    if (e.type === 'pointerup' && moved < 6) { next(-1); return; }          // a click flips
    if (Math.abs(dx) > 90 || (Math.abs(dx) > 30 && speed > 0.6)) { next(Math.sign(dx) || -1); return; }
    card.classList.remove('dragging');
    layout();                                                                // snap back
  };
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(-1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });
  document.getElementById('deckNext')?.addEventListener('click', () => next(-1));
  document.getElementById('deckPrev')?.addEventListener('click', () => prev());

  layout();
})();

// Side Quest card: foil follows the pointer
(() => {
  const card = document.querySelector('#sidequest .wcard');
  if (!card) return;
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--lx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    card.style.setProperty('--ly', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  });
})();

// ESC to close dialog
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const d = document.getElementById('about');
    if (d && d.open) d.close();
  }
});

// ─────────── MASTER BALL ───────────
// A weighted ball resting on the giant name. It drops in, bounces, can be
// grabbed and thrown, rolls, rocks itself upright, and does the three-wobble
// capture wiggle while idle. Click (without dragging) to open the battle.
(() => {
  const stage = document.getElementById('stage');
  const ball = document.getElementById('mball');
  const spin = document.getElementById('mbSpin');
  const shadow = document.getElementById('mbShadow');
  const hint = document.getElementById('mbHint');
  const light = document.getElementById('mbLight');
  const name = stage && stage.querySelector('.name-behind');
  if (!stage || !ball || !spin || !name) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (matchMedia('(hover: none)').matches) hint.textContent = '[tap to catch]';

  const GRAVITY = 2600;     // px/s²
  const BOUNCE = 0.42;      // restitution off the name
  const WALL = 0.5;         // restitution off the sides
  const ROLL_FRICTION = 3.2;
  const UPRIGHT_K = 90;     // weighted base: spring back to upright…
  const UPRIGHT_C = 6.5;    // …underdamped, so it rocks a few times
  const STEP = 1 / 120;
  const TAU = Math.PI * 2;
  const wrap = (a) => a - TAU * Math.round(a / TAU);

  let W = 0, R = 0, floor = 0, fs = 0;
  let x = 0, y = 0, vx = 0, vy = 0, a = 0, av = 0, squash = 0;
  let onFloor = false, still = 0, nextWiggle = 0.8;
  let state = 'idle';          // idle | drag | open
  let wiggle = null;           // { t, i }
  let drag = null, dragMoved = 0, dragged = false;

  function layout(first) {
    const rect = stage.getBoundingClientRect();
    const stageTop = rect.top + window.scrollY;
    const vh = window.innerHeight;
    const prevW = W;
    W = stage.clientWidth;
    R = ball.offsetWidth / 2;
    fs = parseFloat(getComputedStyle(name).fontSize);
    const capH = fs * 0.7;

    // name's capitals start ~60% down the screen, clear of the intro text
    const intro = stage.querySelector('.intro');
    const introBottom = intro ? intro.offsetTop + intro.offsetHeight : 0;
    // "Derrick Yen" has no descenders, so the hero can end just under the
    // baseline; lift the name if needed so the ticker fits on the first screen
    const gap = fs * 0.08;
    const ticker = document.querySelector('.hero .ticker');
    const tickerBlock = ticker ? ticker.offsetHeight + parseFloat(getComputedStyle(ticker).marginTop) : 0;
    let capTop = Math.min(vh * 0.6 - stageTop, vh - stageTop - capH - gap - tickerBlock - 12);
    // the ball sits in front of the top third of the capitals
    floor = capTop + capH * 0.33;
    if (floor - 2 * R < introBottom + 24) {
      floor = introBottom + 24 + 2 * R;
      capTop = floor - capH * 0.33;
    }
    name.style.top = `${Math.round(capTop - fs * 0.05)}px`;
    name.style.bottom = 'auto';
    stage.style.height = `${Math.round(capTop + capH + gap)}px`;

    if (first) {
      x = W / 2;
      if (reduceMotion) { y = floor - R; }
      else { y = -stageTop - R * 1.5; vx = -W * 0.05; av = -2; }
    } else {
      if (prevW) x *= W / prevW; // keep its place relative to the page width
      x = Math.min(Math.max(x, R), W - R);
      if (state !== 'drag' && y > floor - R) y = floor - R;
    }
  }

  // ── input ──
  function local(e) {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  ball.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || state !== 'idle') return;
    const q = local(e);
    drag = { ox: q.x - x, oy: q.y - y, tx: x, ty: y, sx: e.clientX, sy: e.clientY };
    dragMoved = 0;
    dragged = false;
    state = 'drag';
    wiggle = null;
    ball.setPointerCapture(e.pointerId);
  });
  ball.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const q = local(e);
    drag.tx = q.x - drag.ox;
    drag.ty = q.y - drag.oy;
    dragMoved = Math.max(dragMoved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    if (dragMoved > 6) dragged = true;
  });
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    try { ball.releasePointerCapture(e.pointerId); } catch (_) {}
    state = 'idle';
    // cap the throw, and give it some spin in the direction it's flying
    const v = Math.hypot(vx, vy), MAX = 2600;
    if (v > MAX) { vx = vx / v * MAX; vy = vy / v * MAX; }
    av += vx / R * 0.35;
    still = 0;
  };
  ball.addEventListener('pointerup', endDrag);
  ball.addEventListener('pointercancel', endDrag);
  ball.addEventListener('click', (e) => {
    if (dragged) { dragged = false; e.preventDefault(); return; }
    openBall();
  });

  function openBall() {
    if (state === 'open') return;
    state = 'open';
    wiggle = null;
    vx = vy = 0; av = 0; a = wrap(a);
    ball.classList.remove('shake', 'blink'); void ball.offsetWidth;
    ball.classList.add('shake');
    setTimeout(() => {
      ball.classList.add('open');
      light.style.left = `${x}px`;
      light.style.top = `${y}px`;
      light.classList.remove('burst'); void light.offsetWidth;
      if (!reduceMotion) light.classList.add('burst');
    }, reduceMotion ? 0 : 340);
    setTimeout(() => {
      if (window.openBattle) window.openBattle();
    }, reduceMotion ? 0 : 620);
  }
  document.addEventListener('battle:closed', () => {
    ball.classList.remove('open', 'shake');
    light.classList.remove('burst');
    state = 'idle';
    still = 0;
    nextWiggle = 1.2;
    layout(false); // the battle may have grown the hero; restore it
  });

  // ── simulation ──
  function step(dt) {
    if (state === 'drag') {
      // follow the hand with a little lag; the velocity carries into the throw
      const k = 18;
      vx = (drag.tx - x) * k;
      vy = (drag.ty - y) * k;
      x += vx * dt; y += vy * dt;
      av += (vx / R * 0.15 - av) * Math.min(1, dt * 6);
      a += av * dt;
      onFloor = false;
      return;
    }

    if (state !== 'open') {
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
    }
    if (x < R) { x = R; vx = Math.abs(vx) * WALL; av *= -0.6; }
    if (x > W - R) { x = W - R; vx = -Math.abs(vx) * WALL; av *= -0.6; }

    onFloor = false;
    if (y >= floor - R) {
      y = floor - R;
      if (vy > 240) {
        squash = Math.min(0.16, vy / 9000);
        vy = -vy * BOUNCE;
      } else {
        vy = 0;
        onFloor = true;
      }
    }

    if (onFloor) {
      vx *= Math.exp(-ROLL_FRICTION * dt);
      if (Math.abs(vx) < 4) vx = 0;
      if (Math.abs(vx) > 30) {
        // rolling: spin matches ground speed
        av += (vx / R - av) * Math.min(1, dt * 14);
      } else {
        // weighted base rocks it back upright
        av += (-UPRIGHT_K * wrap(a) - UPRIGHT_C * av) * dt;
      }
    } else if (state !== 'open') {
      av *= Math.exp(-0.4 * dt);
    }
    if (state === 'open') {
      // snap upright before the lid lifts, whatever angle it was clicked at
      a = wrap(a) * Math.exp(-22 * dt);
      av = 0;
    }
    a += av * dt;
    squash *= Math.exp(-14 * dt);

    // idle capture wiggle: three wobbles, then the button blinks
    if (state === 'idle' && onFloor && !reduceMotion) {
      const settled = vx === 0 && Math.abs(av) < 0.6 && Math.abs(wrap(a)) < 0.08;
      if (wiggle) {
        wiggle.t += dt;
        const kicks = [0, 0.95, 1.9];
        if (wiggle.i < kicks.length && wiggle.t >= kicks[wiggle.i]) {
          av += (wiggle.i % 2 ? 1 : -1) * 5.6;
          wiggle.i++;
        }
        if (wiggle.t >= 2.9) {
          ball.classList.remove('blink'); void ball.offsetWidth;
          ball.classList.add('blink');
          wiggle = null;
          still = 0;
          nextWiggle = 0.7 + Math.random() * 0.8;
        }
      } else if (settled) {
        still += dt;
        if (still > nextWiggle) wiggle = { t: 0, i: 0 };
      } else {
        still = 0;
      }
    }
  }

  // ── rendering ──
  const f1 = (n) => n.toFixed(1);
  function render() {
    ball.style.transform =
      `translate(${f1(x - R)}px, ${f1(y - R)}px) scale(${(1 + squash).toFixed(3)}, ${(1 - squash).toFixed(3)})`;
    spin.style.transform = `rotate(${(a * 180 / Math.PI).toFixed(2)}deg)`;

    const h = Math.max(0, floor - (y + R));
    const s = Math.max(0.35, 1 - h / 700);
    shadow.style.transform = `translate(${f1(x - R * 0.78)}px, ${f1(floor - R * 0.14)}px) scale(${s.toFixed(3)})`;
    shadow.style.opacity = (0.35 + 0.65 * s).toFixed(2);

    const resting = state === 'idle' && onFloor && vx === 0;
    hint.style.transform = `translate(calc(${f1(x)}px - 50%), ${f1(y - R - 34)}px)`;
    hint.classList.toggle('show', resting);
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
    layout(true);
    render();
    ball.classList.add('ready');
    requestAnimationFrame(frame);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layout(false), 120);
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();

// ─────────── BATTLE ───────────
// Opening the Master Ball starts a battle against QUOTA. FIGHT plays the work
// entries as moves, BAG shows the stack, ABOUT shows the bio, RUN closes.
// All copy is read from the page itself (work cards + About dialog).
(() => {
  const dlg = document.getElementById('battle');
  const stage = document.getElementById('stage');
  if (!dlg || !stage) return;
  const isOpen = () => !dlg.hidden;

  // Put the battle where the name and ball are, and grow it out of the ball.
  function place() {
    const s = stage.getBoundingClientRect();
    const b = document.getElementById('mball')?.getBoundingClientRect() || s;
    const intro = stage.querySelector('.intro');
    const introBottom = intro ? intro.offsetTop + intro.offsetHeight : 0;
    const w = dlg.offsetWidth, h = dlg.offsetHeight;
    const ballX = b.left - s.left + b.width / 2, ballY = b.top - s.top + b.height / 2;
    const top = Math.max(introBottom + 20, ballY - h / 2);
    dlg.style.top = `${Math.round(top)}px`;
    if (top + h + 24 > stage.clientHeight) stage.style.height = `${Math.ceil(top + h + 24)}px`;
    const left = (s.width - w) / 2;
    dlg.style.transformOrigin = `${Math.round(ballX - left)}px ${Math.round(ballY - top)}px`;
  }
  function show() {
    dlg.hidden = false;
    place();
    stage.classList.add('battling');
    dlg.classList.remove('leaving', 'shown'); void dlg.offsetWidth; dlg.classList.add('shown');
    const r = dlg.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) dlg.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  const $ = (id) => document.getElementById(id);
  const hud = $('btHud'), line = $('btLine'), textBox = $('btText');
  const menu = $('btMenu'), movesEl = $('btMoves'), info = $('btMoveInfo');
  const arena = $('btArena'), foe = $('foe'), me = $('me'), ball = $('ball'), catchBall = $('catchBall');
  const foeHp = $('foeHp'), fx = $('fx');
  const bagPanel = $('bagPanel'), aboutPanel = $('aboutPanel');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 120) : ms));
  const text = (root, sel) => (root.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();

  // ── data from the page ──
  const moves = [...document.querySelectorAll('#work .project')].map(p => {
    const num = p.querySelector('.metric-num');
    const metric = num
      ? text(num, '.metric-prefix') + (num.querySelector('.metric-value')?.dataset.target || '') + text(num, '.metric-suffix')
      : '';
    return {
      name: text(p, 'h2'),
      years: text(p, '.proj-year'),
      role: text(p, '.proj-role'),
      desc: text(p, '.proj-desc'),
      metric,
      label: text(p, '.metric-label'),
    };
  });
  const stack = text(document, '#about .stack-line').split('·').map(t => t.trim()).filter(Boolean);

  // bag items
  $('bagItems').innerHTML = '';
  stack.forEach((item, i) => {
    const li = document.createElement('li');
    const icon = document.createElement('i');
    icon.textContent = item[0];
    li.append(icon, document.createTextNode(item));
    li.style.animationDelay = `${i * 40}ms`;
    $('bagItems').append(li);
  });
  // about: the bio and experience from the About dialog
  const aboutBody = $('aboutBody');
  document.querySelectorAll('#about .bio p').forEach(p => aboutBody.append(p.cloneNode(true)));
  const traits = document.querySelector('#about .traits');
  if (traits) {
    const h = document.createElement('h4');
    h.textContent = text(document, '#traits-title') || 'Traits';
    aboutBody.append(h, traits.cloneNode(true));
  }
  const exp = document.querySelector('#about .experience');
  if (exp) {
    const h = document.createElement('h4');
    h.textContent = text(document, '#experience-title') || 'Experience';
    aboutBody.append(h, exp.cloneNode(true));
  }

  // move buttons
  moves.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.dataset.move = i;
    b.textContent = m.name.toUpperCase();
    movesEl.append(b);
  });

  // ── text box ──
  let typingTimer = null, finishTyping = null, advance = null;
  function type(str) {
    return new Promise(resolve => {
      clearTimeout(typingTimer);
      let i = 0;
      line.textContent = '';
      finishTyping = () => { clearTimeout(typingTimer); typingTimer = null; finishTyping = null; line.textContent = str; resolve(); };
      if (reduce) { finishTyping(); return; }
      const tick = () => {
        i += 2;
        line.textContent = str.slice(0, i);
        if (i >= str.length) { typingTimer = null; finishTyping = null; resolve(); return; }
        typingTimer = setTimeout(tick, 22);
      };
      typingTimer = setTimeout(tick, 22);
    });
  }
  async function say(str, hold = true) {
    const my = session;
    await type(str);
    if (!hold || my !== session) return;
    textBox.classList.add('more');
    await new Promise(r => { advance = r; });
    textBox.classList.remove('more');
  }
  function onAdvance() {
    if (finishTyping) { finishTyping(); return; }
    if (advance) { const a = advance; advance = null; a(); }
  }
  // pack sentences into pages that fit the three-line text box
  function pages(str) {
    const fsz = parseFloat(getComputedStyle(textBox).fontSize) || 16;
    const inner = textBox.clientWidth - fsz * 2.2;
    const perLine = Math.max(20, Math.floor(inner / (fsz * 0.56)));
    const max = perLine * 3 - 6;
    const out = [];
    let cur = '';
    for (const sentence of str.split(/(?<=[.!?])\s+/)) {
      if (cur && (cur + ' ' + sentence).length > max) { out.push(cur); cur = sentence; }
      else cur = cur ? cur + ' ' + sentence : sentence;
    }
    if (cur) out.push(cur);
    return out;
  }

  // ── modes ──
  let mode = 'closed', lastCmd = 0, lastMove = 0, hp = 100, busy = false, session = 0;
  const used = new Set();
  function setMode(m) {
    mode = m;
    hud.dataset.mode = m === 'intro' || m === 'busy' ? 'text' : m;
  }
  function focusIn(container, idx) {
    const items = [...container.querySelectorAll('button')];
    (items[idx] || items[0])?.focus({ preventScroll: true });
  }
  function setHp(v) {
    hp = Math.max(0, v);
    foeHp.style.setProperty('--hp', `${hp}%`);
    foeHp.classList.toggle('mid', hp <= 50 && hp > 20);
    foeHp.classList.toggle('low', hp <= 20);
  }
  function showInfo(i) {
    const m = moves[i];
    if (!m) return;
    info.innerHTML = '';
    const row = (k, v) => {
      const p = document.createElement('div');
      const kk = document.createElement('span'); kk.className = 'k'; kk.textContent = k;
      const vv = document.createElement('b'); vv.textContent = v;
      p.append(kk, vv);
      info.append(p);
    };
    row('PP', used.has(i) ? '0/1' : '1/1');
    row('YEARS', m.years);
    row('TYPE/', m.role.split('·')[0].trim());
  }

  async function command() {
    setMode('command');
    focusIn(menu, lastCmd);
    await type('What will DERRICK do?');
  }

  async function open() {
    if (isOpen()) return;
    const my = ++session;
    used.clear();
    movesEl.querySelectorAll('button').forEach(b => b.classList.remove('used'));
    setHp(100);
    me.className = 'bt-me';
    me.style.transform = '';
    ball.className = 'bt-ball';
    foe.className = 'bt-foe';
    exitAfterCatch = false;
    resetCatch();
    bagPanel.hidden = aboutPanel.hidden = true;
    line.textContent = '';
    dlg.classList.remove('leaving', 'arena-in');
    setMode('intro');
    show();
    dlg.classList.remove('enter'); void dlg.offsetWidth; dlg.classList.add('enter');
    textBox.focus({ preventScroll: true });
    await wait(reduce ? 0 : 950);
    dlg.classList.add('arena-in');
    await wait(700);
    if (my !== session) return;
    foe.classList.add('lit');
    await say('A wild QUOTA appeared!');
    if (my !== session) return;
    await type('Go! DERRICK!');
    ball.classList.add('throw');
    await wait(720);
    ball.classList.remove('throw');
    ball.classList.add('open');
    me.classList.add('out');
    await wait(550);
    if (my !== session) return;
    command();
  }

  async function useMove(i) {
    const m = moves[i];
    if (!m || busy) return;
    const my = session;
    const alive = () => my === session;
    busy = true;
    lastMove = i;
    setMode('busy');
    textBox.focus({ preventScroll: true });
    await type(`DERRICK used ${m.name.toUpperCase()}!`);
    if (!alive()) return;
    // attack
    me.classList.remove('out', 'lunge'); void me.offsetWidth;
    me.classList.add('lunge');
    await wait(200);
    if (!alive()) return;
    burst(foe);
    foe.classList.remove('hit', 'shake'); void foe.offsetWidth;
    foe.classList.add('hit', 'shake');
    setHp(hp - 25);
    await wait(900);
    if (!alive()) return;
    me.classList.remove('lunge');
    me.style.transform = 'scale(1)';
    foe.classList.remove('shake');
    used.add(i);
    movesEl.querySelector(`[data-move="${i}"]`)?.classList.add('used');

    await say(`${m.role} · ${m.years}`);
    for (const page of pages(m.desc)) { if (!alive()) return; await say(page); }
    if (!alive()) return;
    if (m.metric) await say(`It's super effective! ${m.metric} ${m.label}.`);
    if (!alive()) return;

    if (hp <= 0 && !(await catchQuota(alive))) return;
    busy = false;
    command();
  }

  // ── end-of-battle catch ──
  function resetCatch() {
    catchBall.getAnimations({ subtree: true }).forEach(a => a.cancel());
    catchBall.className = 'bt-catch';
    catchBall.style.opacity = '';
    catchBall.style.transform = '';
    foe.style.removeProperty('--ax');
    foe.style.removeProperty('--ay');
  }

  // Every catch ends by closing the battle back into the Master Ball. With
  // exit (RUN / ✕ / Esc) it closes on its own shortly after "Gotcha!".
  // Returns false because the battle is over (or was closed part-way).
  let catching = false, exitAfterCatch = false;
  async function catchQuota(alive, exit = false) {
    catching = true;
    try { return await catchSequence(alive, exit); }
    finally { catching = false; }
  }
  async function catchSequence(alive, exit) {
    await type('DERRICK threw a MASTER BALL!');
    if (!alive()) return false;

    const A = arena.getBoundingClientRect(), M = me.getBoundingClientRect(), F = foe.getBoundingClientRect();
    const size = catchBall.offsetWidth;
    const from = { x: M.left - A.left + M.width * 0.62, y: M.top - A.top + M.height * 0.3 };
    const hit = { x: F.left - A.left + F.width / 2, y: F.top - A.top + F.height * 0.42 };
    const land = { x: hit.x, y: F.bottom - A.top - size * 0.5 };
    const at = (p, r = 0) => `translate(${(p.x - size / 2).toFixed(1)}px, ${(p.y - size / 2).toFixed(1)}px) rotate(${r}deg)`;
    const settle = (p) => {
      catchBall.getAnimations().forEach(a => a.cancel());
      catchBall.style.transform = at(p);
    };

    // throw: an arc from Derrick to QUOTA, spinning
    catchBall.style.opacity = '1';
    if (!reduce) {
      const peak = { x: (from.x + hit.x) / 2, y: Math.min(from.y, hit.y) - A.height * 0.25 };
      await catchBall.animate([
        { transform: at(from, 0) },
        { transform: at(peak, 400), offset: 0.5 },
        { transform: at(hit, 720) },
      ], { duration: 720, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }).finished.catch(() => {});
    }
    settle(hit);
    if (!alive()) return false;

    // open and pull QUOTA in as red light
    catchBall.classList.add('open');
    foe.style.setProperty('--ax', `${(hit.x - (F.left - A.left + F.width / 2)).toFixed(1)}px`);
    foe.style.setProperty('--ay', `${(hit.y - (F.top - A.top + F.height / 2)).toFixed(1)}px`);
    foe.classList.remove('hit');
    foe.classList.add('absorb');
    await wait(560);
    if (!alive()) return false;
    foe.classList.add('caught');
    foe.classList.remove('absorb');
    catchBall.classList.remove('open');
    await wait(180);
    if (!alive()) return false;

    // drop onto the platform with a little bounce
    if (!reduce) {
      const bounce = { x: land.x, y: land.y - size * 0.35 };
      await catchBall.animate([
        { transform: at(hit), easing: 'ease-in' },
        { transform: at(land), offset: 0.6, easing: 'ease-out' },
        { transform: at(bounce), offset: 0.8, easing: 'ease-in' },
        { transform: at(land) },
      ], { duration: 560, fill: 'forwards' }).finished.catch(() => {});
    }
    settle(land);
    if (!alive()) return false;

    // three wobbles
    const svg = catchBall.querySelector('svg');
    for (let k = 0; k < 3; k++) {
      await wait(620);
      if (!alive()) return false;
      if (!reduce) {
        await svg.animate([
          { transform: 'rotate(0deg)' },
          { transform: `rotate(${k % 2 ? 24 : -24}deg)` },
          { transform: 'rotate(0deg)' },
        ], { duration: 440, easing: 'ease-in-out' }).finished.catch(() => {});
      }
    }
    await wait(520);
    if (!alive()) return false;

    // click!
    catchBall.classList.add('clicked');
    burst(catchBall, true);
    if (exit || exitAfterCatch) {
      await type('Gotcha! QUOTA was caught!');
      await wait(1100);
      if (alive()) close();
      return false;
    }
    await say('Gotcha! QUOTA was caught!');
    if (!alive()) return false;
    // caught: the battle folds back into the Master Ball
    close();
    return false;
  }

  function burst(target, gold = false) {
    const r = arena.getBoundingClientRect(), f = target.getBoundingClientRect();
    const cx = f.left - r.left + f.width / 2, cy = f.top - r.top + f.height * (gold ? 0.5 : 0.6);
    const reach = gold ? Math.max(f.width * 1.6, 40) : f.width * 0.7;
    for (let k = 0; k < 9; k++) {
      const s = document.createElement('span');
      s.textContent = k % 3 ? '✦' : '✧';
      if (gold) s.className = 'gold';
      const a = (k / 9) * Math.PI * 2;
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.setProperty('--dx', `${Math.cos(a) * reach}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * (gold ? reach * 0.8 : f.height * 0.6)}px`);
      fx.append(s);
      setTimeout(() => s.remove(), 700);
    }
  }

  function openPanel(panel, title) {
    setMode('panel');
    panel.hidden = false;
    line.textContent = title;
    panel.querySelector('[data-back]')?.focus({ preventScroll: true });
  }
  function closePanels() {
    bagPanel.hidden = aboutPanel.hidden = true;
    command();
  }

  // RUN, ✕ and Esc all end with the catch, then close. A second ✕ during
  // the catch closes straight away.
  async function run() {
    if (mode === 'closed') return;
    if (catching) {
      if (exitAfterCatch) close();
      else exitAfterCatch = true;
      return;
    }
    // nothing to catch yet (still in the intro) → just close
    const quotaOut = foe.classList.contains('lit') && !foe.classList.contains('caught');
    const derrickOut = me.classList.contains('out') || me.classList.contains('lunge') || me.style.transform === 'scale(1)';
    if (mode === 'intro' || !quotaOut || !derrickOut) {
      close();
      return;
    }
    const my = ++session; // interrupt whatever was playing
    advance = null;
    if (finishTyping) finishTyping();
    exitAfterCatch = true;
    busy = true;
    setMode('busy');
    bagPanel.hidden = aboutPanel.hidden = true;
    textBox.focus({ preventScroll: true });
    foe.classList.remove('hit', 'shake');
    me.classList.remove('lunge');
    me.style.transform = 'scale(1)';
    await catchQuota(() => my === session, true);
  }
  function close() {
    session++;
    exitAfterCatch = false;
    resetCatch();
    advance = null;
    if (finishTyping) finishTyping();
    // shrink back into the ball, then bring the name and ball back
    dlg.classList.remove('shown');
    dlg.classList.add('leaving');
    setTimeout(() => {
      dlg.hidden = true;
      dlg.classList.remove('leaving', 'enter', 'arena-in');
      stage.classList.remove('battling');
      busy = false;
      mode = 'closed';
      document.dispatchEvent(new CustomEvent('battle:closed'));
      document.getElementById('mball')?.focus({ preventScroll: true });
    }, reduce ? 0 : 450);
  }

  function back() {
    if (mode === 'fight') { command(); focusIn(menu, 0); }
    else if (mode === 'panel') closePanels();
    else if (mode === 'command') run();
  }

  // ── input ──
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || mode !== 'command') return;
    const cmd = b.dataset.cmd;
    lastCmd = [...menu.children].indexOf(b);
    if (cmd === 'fight') {
      setMode('fight');
      focusIn(movesEl, lastMove);
      showInfo(lastMove);
    } else if (cmd === 'bag') openPanel(bagPanel, text(document, '#stack-title') || 'Stack');
    else if (cmd === 'about') openPanel(aboutPanel, text(document, '#about-title') || 'About');
    else if (cmd === 'run') run();
  });
  movesEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && mode === 'fight') useMove(+b.dataset.move);
  });
  movesEl.addEventListener('focusin', (e) => {
    const b = e.target.closest('button');
    if (b) showInfo(+b.dataset.move);
  });
  movesEl.addEventListener('mouseover', (e) => {
    const b = e.target.closest('button');
    if (b) showInfo(+b.dataset.move);
  });
  dlg.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', closePanels));
  $('btClose').addEventListener('click', run);
  textBox.addEventListener('click', onAdvance);
  arena.addEventListener('click', (e) => {
    if (e.target.closest('.bt-panel')) return;
    if (mode === 'intro' || mode === 'busy') onAdvance();
  });
  // keep keyboard focus inside the battle when clicking its scenery
  dlg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .bt-about')) return;
    setTimeout(() => textBox.focus({ preventScroll: true }), 0);
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (isOpen()) place(); }, 160);
  });

  document.addEventListener('keydown', (e) => {
    // only while the battle is up and has focus, so page scrolling keys still work
    if (!isOpen() || !dlg.contains(document.activeElement)) return;
    const k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      if (mode === 'intro') return;
      if (mode === 'busy') run(); else back();
      return;
    }
    if (mode === 'intro' || mode === 'busy') {
      if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') { e.preventDefault(); onAdvance(); }
      return;
    }
    if (k === 'x' || k === 'X' || k === 'Backspace') { e.preventDefault(); back(); return; }
    const grid = mode === 'command' ? menu : mode === 'fight' ? movesEl : null;
    if (!grid) return;
    if (k === 'z' || k === 'Z') { e.preventDefault(); document.activeElement?.click(); return; }
    const items = [...grid.querySelectorAll('button')];
    let i = items.indexOf(document.activeElement);
    if (i < 0) i = 0;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const moveBy = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[k];
    if (moveBy === undefined) return;
    e.preventDefault();
    const n = i + moveBy;
    if (n >= 0 && n < items.length) items[n].focus({ preventScroll: true });
  });

  window.openBattle = open;
})();
