Arcade.register({
  id: '2048',
  title: '2048',
  icon: '🔢',
  blurb: 'Slide and merge matching tiles until you reach 2048.',
  controls: 'Arrow keys / WASD · swipe on mobile',
  pad: 'dpad',
  width: 400,
  height: 400,
  create(api) {
    const N = 4, PAD = 14, GAP = 12;
    const S = (api.width - PAD * 2 - GAP * (N - 1)) / N;   // tile size
    const SLIDE = 0.1, POP = 0.16;
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    // Warm progression; [fill, text]
    const PALETTE = {
      2: ['#f3e8d8', '#5b4a3a'], 4: ['#eedcbc', '#5b4a3a'], 8: ['#f4b17a', '#fffaf3'],
      16: ['#f39463', '#fffaf3'], 32: ['#f27a5c', '#fffaf3'], 64: ['#ee5d3d', '#fffaf3'],
      128: ['#ebcd72', '#fffaf3'], 256: ['#e9c862', '#fffaf3'], 512: ['#e7c351', '#fffaf3'],
      1024: ['#e5be40', '#fffaf3'], 2048: ['#e3b92e', '#fffaf3'],
    };
    const BIG = ['#3d3a33', '#fffaf3'];

    let tiles = [];          // { v, x, y, fx, fy, merged, pop, born }
    let ghosts = [];         // tiles consumed by a merge, still sliding into their partner
    let anim = -1;           // slide progress in seconds, -1 when idle
    let won = false, banner = 0, over = false;
    spawn(); spawn();
    tiles.forEach(t => { t.pop = 0; });

    const pos = i => PAD + i * (S + GAP);
    const ease = t => 1 - Math.pow(1 - t, 3);

    function grid() {
      const g = Array.from({ length: N }, () => Array(N).fill(null));
      tiles.forEach(t => { g[t.y][t.x] = t; });
      return g;
    }

    function spawn() {
      const g = grid(), free = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x]) free.push([x, y]);
      if (!free.length) return;
      const [x, y] = free[api.randInt(0, free.length - 1)];
      tiles.push({ v: Math.random() < 0.9 ? 2 : 4, x, y, fx: x, fy: y, merged: false, pop: POP, born: true });
    }

    function canMove() {
      const g = grid();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const t = g[y][x];
        if (!t) return true;
        if (x + 1 < N && g[y][x + 1] && g[y][x + 1].v === t.v) return true;
        if (y + 1 < N && g[y + 1][x] && g[y + 1][x].v === t.v) return true;
      }
      return false;
    }

    function finishSlide() {
      anim = -1;
      ghosts = [];
      tiles.forEach(t => {
        t.fx = t.x; t.fy = t.y;
        if (t.merged) { t.merged = false; t.pop = POP; t.born = false; }
      });
      spawn();
      if (!won && tiles.some(t => t.v >= 2048)) { won = true; banner = 2.5; }
      if (!over && !canMove()) { over = true; api.gameOver('No more moves'); }
    }

    function slide(name) {
      if (anim >= 0) finishSlide();   // a fast second input completes the previous move first
      if (over) return;
      const [dx, dy] = DIRS[name];
      const g = grid();
      let moved = false, gained = 0;
      const dying = [];
      for (let i = 0; i < N; i++) {
        // Cells of this row/column, starting at the edge tiles slide towards.
        const cells = [];
        for (let j = 0; j < N; j++) {
          const x = dx ? (dx > 0 ? N - 1 - j : j) : i;
          const y = dy ? (dy > 0 ? N - 1 - j : j) : i;
          cells.push([x, y]);
        }
        let k = 0, last = null;
        for (const [x, y] of cells) {
          const t = g[y][x];
          if (!t) continue;
          t.fx = t.x; t.fy = t.y;
          if (last && last.v === t.v && !last.merged) {
            last.merged = true;
            last.v *= 2;
            gained += last.v;
            t.x = last.x; t.y = last.y;
            dying.push(t);
            moved = true;
          } else {
            const [nx, ny] = cells[k++];
            if (nx !== x || ny !== y) moved = true;
            t.x = nx; t.y = ny;
            last = t;
          }
        }
      }
      if (!moved) return;
      tiles = tiles.filter(t => !dying.includes(t));
      ghosts = dying;
      if (gained) api.addScore(gained);
      anim = 0;
    }

    function drawTile(ctx, t, v, px, py, scale) {
      const [fill, ink] = PALETTE[v] || BIG;
      const s = S * scale, x = px + (S - s) / 2, y = py + (S - s) / 2;
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, 8 * scale); ctx.fill();
      const digits = String(v).length;
      const size = (digits <= 2 ? 36 : digits === 3 ? 30 : digits === 4 ? 24 : 18) * scale;
      ctx.fillStyle = ink;
      ctx.font = `700 ${size}px "JetBrains Mono", monospace`;
      ctx.fillText(String(v), px + S / 2, py + S / 2 + size * 0.05);
    }

    return {
      update(dt) {
        if (anim >= 0) { anim += dt; if (anim >= SLIDE) finishSlide(); }
        tiles.forEach(t => { if (t.pop > 0) t.pop = Math.max(0, t.pop - dt); });
        if (banner > 0) banner = Math.max(0, banner - dt);
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, api.width, api.height);
        ctx.fillStyle = k.surface;
        ctx.beginPath(); ctx.roundRect(4, 4, api.width - 8, api.height - 8, 14); ctx.fill();
        ctx.fillStyle = k.dark ? k.bg : k.border;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.beginPath(); ctx.roundRect(pos(x), pos(y), S, S, 8); ctx.fill();
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const p = anim >= 0 ? ease(Math.min(1, anim / SLIDE)) : 1;
        const at = t => [pos(t.fx + (t.x - t.fx) * p), pos(t.fy + (t.y - t.fy) * p)];
        ghosts.forEach(t => { const [x, y] = at(t); drawTile(ctx, t, t.v, x, y, 1); });
        tiles.forEach(t => {
          const [x, y] = at(t);
          const v = t.merged ? t.v / 2 : t.v;   // show the pre-merge value until tiles meet
          let scale = 1;
          if (t.pop > 0) {
            const q = 1 - t.pop / POP;
            scale = t.born ? 0.3 + 0.7 * ease(q) : 1 + 0.14 * Math.sin(q * Math.PI);
          }
          drawTile(ctx, t, v, x, y, scale);
        });

        if (banner > 0) {
          ctx.globalAlpha = Math.min(1, banner / 0.4);
          ctx.fillStyle = k.accent;
          ctx.beginPath(); ctx.roundRect(api.width / 2 - 110, api.height / 2 - 24, 220, 48, 24); ctx.fill();
          ctx.fillStyle = k.accentInk;
          ctx.font = '600 18px "Space Grotesk", sans-serif';
          ctx.fillText('2048! keep going', api.width / 2, api.height / 2 + 1);
          ctx.globalAlpha = 1;
        }
        ctx.textBaseline = 'alphabetic';
      },
      onInput(type, e) {
        if (type !== 'press' || e.repeat || !DIRS[e.name]) return;
        slide(e.name);
      },
      destroy() {},
    };
  },
});
