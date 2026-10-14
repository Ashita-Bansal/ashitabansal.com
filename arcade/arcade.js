/*
  Tiny arcade engine.

  A game registers itself with:

    Arcade.register({
      id: 'snake',                 // used in URLs (play.html#snake) and for best scores
      title: 'Snake',
      icon: '🐍',
      blurb: 'One-line description.',
      controls: 'Arrow keys or swipe',
      pad: 'dpad' | 'action' | 'none', // on-screen buttons shown on touch devices
      actionLabel: 'Jump',         // label for the action button (pad 'dpad' or 'action')
      width: 400, height: 400,     // logical canvas size; the engine scales it to fit
      lowerIsBetter: false,        // e.g. Memory counts moves, so lower is better
      create(api) {
        return {
          update(dt) {},           // seconds since last frame (capped); only called while running
          draw(ctx) {},            // every frame, in logical coordinates; canvas is already cleared
          onInput(type, e) {},     // 'press' | 'release' with e.name, or 'pointer' with e.phase/x/y/tap
          destroy() {},
        };
      },
    });

  api: width, height, colors (theme-aware, updated live), held(name), score(),
       setScore(n), addScore(n = 1), gameOver(message?), rand(a, b), randInt(a, b), isTouch.
  Input names: 'up' | 'down' | 'left' | 'right' | 'action'.
*/
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const games = [];
  window.Arcade = { register: def => games.push(def), games };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const bestKey = id => `arcade:best:${id}`;
  const getBest = id => store.get(bestKey(id));

  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ───────── Theme ───────── */
  const colors = {};
  const readColors = () => {
    const cs = getComputedStyle(root);
    const v = n => cs.getPropertyValue(n).trim();
    Object.assign(colors, {
      bg: v('--bg'), bg2: v('--bg-2'), surface: v('--surface'), surface2: v('--surface-2'),
      border: v('--border'), borderStrong: v('--border-strong'),
      text: v('--text'), muted: v('--muted'), faint: v('--faint'),
      accent: v('--accent'), accent2: v('--accent-2'), accentInk: v('--accent-ink'),
      dark: (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark',
      // A fixed playful palette that reads well on both themes.
      pink: '#f472b6', yellow: '#fbbf24', red: '#f87171', orange: '#fb923c',
      purple: '#a78bfa', blue: '#60a5fa', green: '#4ade80', cyan: '#22d3ee',
    });
  };
  readColors();
  new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);

  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = colors.dark ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ───────── Stage elements ───────── */
  const stage = $('#stage');
  const canvas = $('#st-canvas');
  const ctx = canvas.getContext('2d');
  const screen = $('#st-screen');
  const overlay = $('#st-overlay');
  const padEl = $('#st-pad');
  const scoreEl = $('#st-score');
  const bestEl = $('#st-best');

  let def = null, inst = null, state = 'idle', score = 0, raf = 0, last = 0, scale = 1, returnFocus = null;
  const held = new Set();

  const fmtBest = d => {
    const b = getBest(d.id);
    return b === null || b === undefined ? '—' : String(b);
  };

  const api = {
    get width() { return def.width; },
    get height() { return def.height; },
    colors,
    isTouch,
    held: name => held.has(name),
    score: () => score,
    setScore(n) { score = n; scoreEl.textContent = score; },
    addScore(n = 1) { api.setScore(score + n); },
    gameOver(message) { if (state === 'running') endGame(message); },
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  };

  /* ───────── Lifecycle ───────── */
  function boot() {
    if (inst && inst.destroy) inst.destroy();
    held.clear();
    api.setScore(0);
    inst = def.create(api);
    state = 'ready';
    showOverlay('ready');
  }
  function start() {
    state = 'running';
    overlay.hidden = true;
    last = performance.now();
  }
  function pause() {
    if (state !== 'running') return;
    state = 'paused';
    showOverlay('paused');
  }
  function endGame(message) {
    state = 'over';
    const prev = getBest(def.id);
    const better = prev === null || prev === undefined || (def.lowerIsBetter ? score < prev : score > prev);
    const isNew = better && (def.lowerIsBetter || score > 0);
    if (isNew) store.set(bestKey(def.id), score);
    bestEl.textContent = fmtBest(def);
    showOverlay('over', { message, isNew });
  }
  // The universal "go" gesture: start, resume or play again.
  function proceed() {
    if (state === 'ready') start();
    else if (state === 'paused') start();
    else if (state === 'over') { boot(); start(); }
  }

  function showOverlay(kind, { message, isNew } = {}) {
    const go = isTouch ? 'Tap' : 'Press <kbd>Space</kbd>';
    let html = '';
    if (kind === 'ready') {
      html = `<div class="ov-icon">${def.icon}</div><h3>${def.title}</h3><p>${def.blurb}</p>
        <p class="ov-hint">${def.controls}</p><button class="btn primary ov-go">${isTouch ? 'Tap to start' : 'Start'}</button>`;
    } else if (kind === 'paused') {
      html = `<h3>Paused</h3><p class="ov-hint">${go} to resume</p><button class="btn primary ov-go">Resume</button>`;
    } else {
      html = `<h3>${message || 'Game over'}</h3>
        <p class="ov-score">${def.lowerIsBetter ? 'Moves' : 'Score'} <b>${score}</b>${isNew ? ' <span class="ov-new">New best!</span>' : ''}</p>
        <p class="ov-hint">Best: ${fmtBest(def)}</p><button class="btn primary ov-go">Play again</button>`;
    }
    overlay.innerHTML = `<div class="ov-card">${html}</div>`;
    overlay.hidden = false;
  }
  overlay.addEventListener('click', e => { if (e.target.closest('.ov-go') || e.target === overlay) proceed(); });

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 1000, 1 / 20);
    last = t;
    if (state === 'running' && inst.update) inst.update(dt);
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, def.width, def.height);
    if (inst.draw) inst.draw(ctx);
  }

  function fit() {
    if (!def) return;
    const r = screen.getBoundingClientRect();
    scale = Math.min(r.width / def.width, r.height / def.height);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${def.width * scale}px`;
    canvas.style.height = `${def.height * scale}px`;
    canvas.width = Math.round(def.width * scale * dpr);
    canvas.height = Math.round(def.height * scale * dpr);
  }
  addEventListener('resize', fit);

  function open(d) {
    def = d;
    returnFocus = document.activeElement;
    $('#st-title').textContent = `${d.icon} ${d.title}`;
    $('#st-controls').textContent = d.controls;
    $('#st-score-label').textContent = d.lowerIsBetter ? 'Moves' : 'Score';
    bestEl.textContent = fmtBest(d);
    renderPad(d);
    stage.hidden = false;
    document.body.style.overflow = 'hidden';
    fit();
    boot();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    $('#st-close').focus();
    if (location.hash !== `#${d.id}`) history.replaceState(null, '', `#${d.id}`);
  }
  function close() {
    if (!def) return;
    cancelAnimationFrame(raf);
    if (inst && inst.destroy) inst.destroy();
    inst = null; def = null; state = 'idle';
    stage.hidden = true;
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    renderGrid();
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  }
  $('#st-close').addEventListener('click', close);
  $('#st-restart').addEventListener('click', () => { if (def) { boot(); start(); } });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ───────── Input ───────── */
  const KEYMAP = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'action', Enter: 'action', z: 'action', Z: 'action',
  };
  function press(name, repeat = false) {
    // The key that starts, resumes or restarts a game is consumed by the engine,
    // except a direction key on the start screen, which also counts as a move.
    if (state === 'over') { if (name === 'action' && !repeat) proceed(); return; }
    if (state === 'paused') { if (name === 'action') start(); return; }
    if (state === 'ready') { start(); if (name === 'action') return; }
    if (state !== 'running') return;
    held.add(name);
    if (inst.onInput) inst.onInput('press', { name, repeat });
  }
  function release(name) {
    held.delete(name);
    if (state === 'running' && inst.onInput) inst.onInput('release', { name });
  }

  addEventListener('keydown', e => {
    if (!def) return;
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    if (e.key === 'p' || e.key === 'P') { state === 'paused' ? start() : pause(); return; }
    if (e.key === 'r' || e.key === 'R') { boot(); start(); return; }
    const name = KEYMAP[e.key];
    if (!name) return;
    if (document.activeElement && document.activeElement.tagName === 'BUTTON' && name === 'action') {
      // Space/Enter on a focused button should play, not click the button.
      document.activeElement.blur();
    }
    e.preventDefault();
    press(name, e.repeat);
  });
  addEventListener('keyup', e => {
    if (!def) return;
    const name = KEYMAP[e.key];
    if (name) release(name);
  });

  // Pointer → logical coordinates, plus swipe detection.
  let down = null;
  const toLogical = e => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * def.width, y: (e.clientY - r.top) / r.height * def.height };
  };
  canvas.addEventListener('pointerdown', e => {
    if (!def) return;
    canvas.setPointerCapture(e.pointerId);
    const p = toLogical(e);
    down = { cx: e.clientX, cy: e.clientY, t: performance.now() };
    if (state !== 'running') { proceed(); return; }
    if (inst.onInput) inst.onInput('pointer', { phase: 'down', ...p });
  });
  canvas.addEventListener('pointermove', e => {
    if (!def || state !== 'running' || !inst.onInput) return;
    inst.onInput('pointer', { phase: 'move', down: !!down, ...toLogical(e) });
  });
  canvas.addEventListener('pointerup', e => {
    if (!def || !down) return;
    const dx = e.clientX - down.cx, dy = e.clientY - down.cy;
    const dist = Math.hypot(dx, dy);
    const tap = dist < 12 && performance.now() - down.t < 400;
    down = null;
    if (state !== 'running') return;
    if (dist >= 30) {
      const name = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (inst.onInput) { inst.onInput('press', { name, swipe: true }); inst.onInput('release', { name, swipe: true }); }
    }
    if (inst.onInput) inst.onInput('pointer', { phase: 'up', tap, ...toLogical(e) });
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  // On-screen pad for touch devices.
  function renderPad(d) {
    const btn = (name, label, cls = '') => `<button type="button" class="pad-btn ${cls}" data-pad="${name}" aria-label="${name}">${label}</button>`;
    let html = '';
    if (d.pad === 'dpad') {
      html = `<div class="dpad">${btn('up', '▲', 'up')}${btn('left', '◀', 'left')}${btn('right', '▶', 'right')}${btn('down', '▼', 'down')}</div>`;
      if (d.actionLabel) html += btn('action', d.actionLabel, 'act');
    } else if (d.pad === 'action') {
      html = btn('action', d.actionLabel || 'Tap', 'act wide');
    }
    padEl.innerHTML = html;
    padEl.hidden = !html || !isTouch;
  }
  padEl.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-pad]');
    if (!b) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    press(b.dataset.pad);
  });
  const padUp = e => { const b = e.target.closest('[data-pad]'); if (b) release(b.dataset.pad); };
  padEl.addEventListener('pointerup', padUp);
  padEl.addEventListener('pointercancel', padUp);

  /* ───────── Launcher grid ───────── */
  const grid = $('#arcade-grid');
  function renderGrid() {
    grid.innerHTML = games.map(g => `
      <button class="game-card" type="button" data-game="${g.id}">
        <span class="gc-icon" aria-hidden="true">${g.icon}</span>
        <span class="gc-title">${g.title}</span>
        <span class="gc-blurb">${g.blurb}</span>
        <span class="gc-best">${getBest(g.id) !== null ? `${g.lowerIsBetter ? 'Fewest moves' : 'Best'}: ${getBest(g.id)}` : 'Not played yet'}</span>
      </button>`).join('');
  }
  grid.addEventListener('click', e => {
    const card = e.target.closest('[data-game]');
    if (card) open(games.find(g => g.id === card.dataset.game));
  });

  document.addEventListener('DOMContentLoaded', () => {
    const order = ['snake', 'runner', 'breakout', 'pong', 'flappy', 'stacker', 'blocks', '2048', 'memory', 'whack'];
    games.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99));
    renderGrid();
    const fromHash = games.find(g => `#${g.id}` === location.hash);
    if (fromHash) open(fromHash);
  });
})();
