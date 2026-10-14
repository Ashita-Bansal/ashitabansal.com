Arcade.register({
  id: 'blocks',
  title: 'Blocks',
  icon: '🟪',
  blurb: 'Stack the falling pieces, clear lines, don’t top out.',
  controls: '← → move · ↑ rotate · ↓ soft drop · Space hard drop · swipe/tap on mobile',
  pad: 'dpad',
  actionLabel: 'Drop',
  width: 360,
  height: 560,
  create(api) {
    const W = 10, H = 20, C = 26;   // board cells and cell size
    const BX = 10, BY = 20;          // board origin
    const PX = BX + W * C + 14;      // side panel x
    const SHAPES = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    };
    const COLOR = { I: 'cyan', O: 'yellow', T: 'purple', S: 'green', Z: 'red', J: 'blue', L: 'orange' };
    const SCORES = [0, 100, 300, 500, 800];
    const LOCK_DELAY = 0.45;

    const board = Array.from({ length: H }, () => Array(W).fill(null));
    let bag = [];
    let next = fromBag();
    let piece = null;                // { t, m, x, y }
    let lines = 0, level = 1;
    let fall = 0, lockT = 0, lockMoves = 0;
    let flashRows = null, flashT = 0;
    let dead = false, ticked = false;
    spawn();

    function fromBag() {
      if (!bag.length) {
        bag = Object.keys(SHAPES);
        for (let i = bag.length - 1; i > 0; i--) {
          const j = api.randInt(0, i);
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
      }
      return bag.pop();
    }

    const rotate = m => m.map((row, y) => row.map((_, x) => m[m.length - 1 - x][y]));
    const gravity = () => Math.max(0.05, 0.8 * Math.pow(0.85, level - 1));

    function fits(m, px, py) {
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) {
        if (!m[y][x]) continue;
        const bx = px + x, by = py + y;
        if (bx < 0 || bx >= W || by >= H) return false;
        if (by >= 0 && board[by][bx]) return false;
      }
      return true;
    }

    function die(msg) {
      if (dead) return;
      dead = true;
      piece = null;
      api.gameOver(msg);
    }

    function spawn() {
      const t = next;
      next = fromBag();
      const m = SHAPES[t];
      piece = { t, m, x: Math.floor((W - m.length) / 2), y: t === 'I' ? -1 : 0 };
      fall = 0; lockT = 0; lockMoves = 0;
      if (!fits(piece.m, piece.x, piece.y)) die('Topped out!');
    }

    function lock() {
      const { m, x, y, t } = piece;
      let above = false;
      for (let cy = 0; cy < m.length; cy++) for (let cx = 0; cx < m.length; cx++) {
        if (!m[cy][cx]) continue;
        if (y + cy < 0) above = true;
        else board[y + cy][x + cx] = t;
      }
      piece = null;
      if (above) return die('Topped out!');
      const full = [];
      for (let r = 0; r < H; r++) if (board[r].every(Boolean)) full.push(r);
      if (full.length) { flashRows = full; flashT = 0.25; } else spawn();
    }

    function clearRows() {
      for (const r of flashRows) { board.splice(r, 1); board.unshift(Array(W).fill(null)); }
      api.addScore(SCORES[flashRows.length] * level);
      lines += flashRows.length;
      level = 1 + Math.floor(lines / 10);
      flashRows = null;
      spawn();
    }

    // Moving or rotating a grounded piece buys a little more time, up to a cap.
    function nudged() {
      if (lockT > 0 && lockMoves < 15) { lockT = 0; lockMoves++; }
    }

    function move(dx, dy) {
      if (!fits(piece.m, piece.x + dx, piece.y + dy)) return false;
      piece.x += dx; piece.y += dy;
      if (dx) nudged();
      return true;
    }

    function turn() {
      const r = rotate(piece.m);
      for (const off of [0, 1, -1, 2, -2]) {
        if (fits(r, piece.x + off, piece.y)) { piece.m = r; piece.x += off; nudged(); return; }
      }
    }

    function hardDrop() {
      let n = 0;
      while (fits(piece.m, piece.x, piece.y + 1)) { piece.y++; n++; }
      api.addScore(n * 2);
      lock();
    }

    function ghostY() {
      let y = piece.y;
      while (fits(piece.m, piece.x, y + 1)) y++;
      return y;
    }

    function cell(ctx, x, y, size, color, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x + 1, y + 1, size - 2, size - 2, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x + 3, y + 3, size - 6, 3);
      ctx.globalAlpha = 1;
    }

    function eachCell(m, fn) {
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) if (m[y][x]) fn(x, y);
    }

    return {
      update(dt) {
        ticked = true;
        if (dead) return;
        if (flashRows) { flashT -= dt; if (flashT <= 0) clearRows(); return; }
        if (!piece) return;
        if (!fits(piece.m, piece.x, piece.y + 1)) {
          fall = 0;
          lockT += dt;
          if (lockT >= LOCK_DELAY) lock();
          return;
        }
        lockT = 0;
        const soft = api.held('down');
        const step = soft ? Math.min(0.04, gravity()) : gravity();
        fall += dt;
        while (fall >= step && piece) {
          fall -= step;
          if (!move(0, 1)) { fall = 0; break; }
          if (soft) api.addScore(1);
        }
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, api.width, api.height);

        // Board well
        ctx.fillStyle = k.surface;
        ctx.beginPath(); ctx.roundRect(BX - 4, BY - 4, W * C + 8, H * C + 8, 8); ctx.fill();
        ctx.strokeStyle = k.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 1; x < W; x++) { ctx.moveTo(BX + x * C + 0.5, BY); ctx.lineTo(BX + x * C + 0.5, BY + H * C); }
        for (let y = 1; y < H; y++) { ctx.moveTo(BX, BY + y * C + 0.5); ctx.lineTo(BX + W * C, BY + y * C + 0.5); }
        ctx.stroke();

        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (board[y][x]) cell(ctx, BX + x * C, BY + y * C, C, k[COLOR[board[y][x]]]);
        }

        if (flashRows) {
          ctx.fillStyle = k.dark ? '#ffffff' : k.text;
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(flashT * 40);
          for (const r of flashRows) ctx.fillRect(BX, BY + r * C, W * C, C);
          ctx.globalAlpha = 1;
        }

        if (piece) {
          const col = k[COLOR[piece.t]];
          const gy = ghostY();
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          eachCell(piece.m, (x, y) => {
            if (gy + y < 0) return;
            ctx.globalAlpha = 0.45;
            ctx.beginPath(); ctx.roundRect(BX + (piece.x + x) * C + 3, BY + (gy + y) * C + 3, C - 6, C - 6, 4); ctx.stroke();
          });
          ctx.globalAlpha = 1;
          eachCell(piece.m, (x, y) => {
            if (piece.y + y >= 0) cell(ctx, BX + (piece.x + x) * C, BY + (piece.y + y) * C, C, col);
          });
        }

        // Side panel
        const label = (text, y) => {
          ctx.fillStyle = k.muted;
          ctx.font = '600 12px "Space Grotesk", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(text, PX, y);
        };
        const value = (text, y) => {
          ctx.fillStyle = k.text;
          ctx.font = '700 22px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(text, PX, y);
        };
        label('NEXT', BY + 12);
        const pw = api.width - PX - 10;
        ctx.fillStyle = k.surface;
        ctx.beginPath(); ctx.roundRect(PX, BY + 20, pw, 70, 8); ctx.fill();
        const nm = SHAPES[next], s = 15;
        let minX = 9, maxX = -1, minY = 9, maxY = -1;
        eachCell(nm, (x, y) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
        const ox = PX + pw / 2 - (maxX - minX + 1) * s / 2, oy = BY + 55 - (maxY - minY + 1) * s / 2;
        eachCell(nm, (x, y) => cell(ctx, ox + (x - minX) * s, oy + (y - minY) * s, s, k[COLOR[next]]));

        label('LINES', BY + 125); value(String(lines), BY + 150);
        label('LEVEL', BY + 190); value(String(level), BY + 215);
        label('SCORE', BY + 255); value(String(api.score()), BY + 280);
      },
      onInput(type, e) {
        if (dead || !piece) return;
        if (type === 'pointer') { if (e.phase === 'up' && e.tap) turn(); return; }
        if (type !== 'press') return;
        if (e.name === 'left') move(-1, 0);
        else if (e.name === 'right') move(1, 0);
        else if (e.name === 'up') turn();
        else if (e.name === 'down') {
          if (e.swipe) hardDrop();
          else if (move(0, 1)) { api.addScore(1); fall = 0; }
        }
        // The Space that starts the game also arrives here; don't let it slam the first piece.
        else if (e.name === 'action' && ticked) hardDrop();
      },
      destroy() {},
    };
  },
});
