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
