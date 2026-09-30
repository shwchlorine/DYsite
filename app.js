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
  if (matchMedia('(hover: none)').matches) hint.textContent = '[tap to open]';

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
    if (!reduceMotion) { vy = -650; onFloor = false; }
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
  if (!dlg) return;
  const $ = (id) => document.getElementById(id);
  const hud = $('btHud'), line = $('btLine'), textBox = $('btText');
  const menu = $('btMenu'), movesEl = $('btMoves'), info = $('btMoveInfo');
  const arena = $('btArena'), foe = $('foe'), me = $('me'), ball = $('ball');
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
    await type(str);
    if (!hold) return;
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
    if (dlg.open) return;
    const my = ++session;
    used.clear();
    movesEl.querySelectorAll('button').forEach(b => b.classList.remove('used'));
    setHp(100);
    me.className = 'bt-me';
    me.style.transform = '';
    ball.className = 'bt-ball';
    foe.className = 'bt-foe';
    bagPanel.hidden = aboutPanel.hidden = true;
    line.textContent = '';
    dlg.classList.remove('leaving', 'arena-in');
    setMode('intro');
    dlg.showModal();
    dlg.classList.remove('enter'); void dlg.offsetWidth; dlg.classList.add('enter');
    textBox.focus({ preventScroll: true });
    await wait(reduce ? 0 : 950);
    dlg.classList.add('arena-in');
    await wait(700);
    if (my !== session) return;
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
    busy = true;
    lastMove = i;
    setMode('busy');
    textBox.focus({ preventScroll: true });
    await type(`DERRICK used ${m.name.toUpperCase()}!`);
    // attack
    me.classList.remove('out', 'lunge'); void me.offsetWidth;
    me.classList.add('lunge');
    await wait(200);
    burst();
    foe.classList.remove('hit', 'shake'); void foe.offsetWidth;
    foe.classList.add('hit', 'shake');
    setHp(hp - 25);
    await wait(900);
    me.classList.remove('lunge');
    me.style.transform = 'scale(1)';
    foe.classList.remove('shake');
    used.add(i);
    movesEl.querySelector(`[data-move="${i}"]`)?.classList.add('used');

    await say(`${m.role} · ${m.years}`);
    for (const page of pages(m.desc)) await say(page);
    if (m.metric) await say(`It's super effective! ${m.metric} ${m.label}.`);

    if (hp <= 0) {
      foe.classList.add('faint');
      await wait(650);
      await say('QUOTA fainted!');
      await say('DERRICK gained EXP. Points!');
      foe.classList.remove('faint', 'hit');
      used.clear();
      movesEl.querySelectorAll('button').forEach(b => b.classList.remove('used'));
      setHp(100);
      await wait(300);
      await say('Another QUOTA appeared!');
    }
    busy = false;
    command();
  }

  function burst() {
    const r = arena.getBoundingClientRect(), f = foe.getBoundingClientRect();
    const cx = f.left - r.left + f.width / 2, cy = f.top - r.top + f.height * 0.6;
    for (let k = 0; k < 9; k++) {
      const s = document.createElement('span');
      s.textContent = k % 3 ? '✦' : '✧';
      const a = (k / 9) * Math.PI * 2;
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.setProperty('--dx', `${Math.cos(a) * f.width * 0.7}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * f.height * 0.6}px`);
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

  async function run() {
    if (mode === 'closed') return;
    busy = true;
    setMode('busy');
    textBox.focus({ preventScroll: true });
    await type('Got away safely!');
    await wait(650);
    close();
  }
  function close() {
    session++;
    advance = null;
    if (finishTyping) finishTyping();
    dlg.classList.add('leaving');
    setTimeout(() => {
      if (dlg.open) dlg.close();
      dlg.classList.remove('leaving', 'enter', 'arena-in');
      busy = false;
      mode = 'closed';
      document.dispatchEvent(new CustomEvent('battle:closed'));
      document.getElementById('mball')?.focus({ preventScroll: true });
    }, reduce ? 0 : 350);
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
  $('btClose').addEventListener('click', close);
  textBox.addEventListener('click', onAdvance);
  arena.addEventListener('click', (e) => {
    if (e.target.closest('.bt-panel')) return;
    if (mode === 'intro' || mode === 'busy') onAdvance();
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (mode === 'intro' || mode === 'busy') return; back(); });
  dlg.addEventListener('close', () => {
    if (mode !== 'closed') {
      session++; mode = 'closed'; busy = false;
      dlg.classList.remove('leaving', 'enter', 'arena-in');
      document.dispatchEvent(new CustomEvent('battle:closed'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!dlg.open) return;
    const k = e.key;
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
