Arcade.register({
  id: 'breakout',
  title: 'Breakout',
  icon: '🧱',
  blurb: 'Bounce the ball, smash every brick, don’t let it drop.',
  controls: 'Mouse / drag to move · ← → keys',
  pad: 'none',
  width: 480,
  height: 560,
  create(api) {
    const W = api.width, H = api.height;
    const COLS = 8, ROWS = 7, GAP = 6, TOP = 64, BH = 18;
    const BW = (W - GAP * (COLS + 1)) / COLS;
    const ROW_COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'];
    const PW = 84, PH = 12, PY = H - 40, R = 7;
    const KEY_SPEED = 520;

    let level = 1, lives = 3, over = false;
    let paddleX = W / 2, targetX = null;
    let bricks = [], particles = [];
    let ball, serveTimer, flash = 0;

    function buildLevel() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        bricks.push({ x: GAP + c * (BW + GAP), y: TOP + r * (BH + GAP), row: r, alive: true });
      }
    }
    function baseSpeed() { return 300 + (level - 1) * 45; }
    function resetBall() {
      ball = { x: paddleX, y: PY - R - 1, vx: 0, vy: 0, stuck: true };
      serveTimer = 1.0;
    }
    function launch() {
      if (!ball.stuck) return;
      const a = api.rand(-0.5, 0.5);
      const s = baseSpeed();
      ball.vx = Math.sin(a) * s;
      ball.vy = -Math.cos(a) * s;
      ball.stuck = false;
    }
    function burst(x, y, color) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, s = api.rand(40, 180);
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: api.rand(0.4, 0.8), color });
      }
    }

    // Advance the ball by a small step; returns after resolving at most one collision.
    function stepBall(dt) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }

      // Paddle: angle depends on where the ball lands relative to the center.
      if (ball.vy > 0 && ball.y + R >= PY && ball.y - R <= PY + PH &&
          ball.x >= paddleX - PW / 2 - R && ball.x <= paddleX + PW / 2 + R) {
        const off = Math.max(-1, Math.min(1, (ball.x - paddleX) / (PW / 2)));
        const s = Math.min(Math.hypot(ball.vx, ball.vy) * 1.01, baseSpeed() * 1.6);
        const a = off * 1.05;
        ball.vx = Math.sin(a) * s;
        ball.vy = -Math.cos(a) * s;
        ball.y = PY - R;
      }

      for (const b of bricks) {
        if (!b.alive) continue;
        const nx = Math.max(b.x, Math.min(ball.x, b.x + BW));
        const ny = Math.max(b.y, Math.min(ball.y, b.y + BH));
        const dx = ball.x - nx, dy = ball.y - ny;
        if (dx * dx + dy * dy > R * R) continue;
        b.alive = false;
        api.addScore(10 + (ROWS - 1 - b.row) * 2);
        burst(b.x + BW / 2, b.y + BH / 2, api.colors[ROW_COLORS[b.row]]);
        // Reflect along the axis of least penetration.
        const overlapX = Math.min(ball.x + R - b.x, b.x + BW - (ball.x - R));
        const overlapY = Math.min(ball.y + R - b.y, b.y + BH - (ball.y - R));
        if (overlapX < overlapY) ball.vx = ball.x < b.x + BW / 2 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
        else ball.vy = ball.y < b.y + BH / 2 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
        break;
      }

      if (ball.y - R > H) {
        lives--;
        flash = 0.3;
        if (lives <= 0) { over = true; api.gameOver(`Out of balls · level ${level}`); }
        else resetBall();
      }
    }

    buildLevel();
    resetBall();

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    }

    return {
      update(dt) {
        if (over) return;
        if (api.held('left')) { paddleX -= KEY_SPEED * dt; targetX = null; }
        if (api.held('right')) { paddleX += KEY_SPEED * dt; targetX = null; }
        if (targetX !== null) paddleX += (targetX - paddleX) * Math.min(1, dt * 25);
        paddleX = Math.max(PW / 2, Math.min(W - PW / 2, paddleX));
        flash = Math.max(0, flash - dt);

        for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; }
        particles = particles.filter(p => p.life > 0);

        if (ball.stuck) {
          ball.x = paddleX; ball.y = PY - R - 1;
          serveTimer -= dt;
          if (serveTimer <= 0) launch();
          return;
        }
        // Substep so each move is under half the ball radius: no tunnelling.
        const dist = Math.hypot(ball.vx, ball.vy) * dt;
        const n = Math.max(1, Math.ceil(dist / (R * 0.5)));
        for (let i = 0; i < n && !ball.stuck && !over; i++) stepBall(dt / n);

        if (!over && bricks.every(b => !b.alive)) {
          level++;
          buildLevel();
          resetBall();
        }
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, W, H);
        if (flash > 0) {
          ctx.fillStyle = k.red;
          ctx.globalAlpha = flash;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }

        ctx.font = '600 16px "Space Grotesk", sans-serif';
        ctx.fillStyle = k.muted;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${level}`, 14, 28);
        ctx.fillStyle = k.accent;
        for (let i = 0; i < lives; i++) {
          ctx.beginPath(); ctx.arc(W - 20 - i * 20, 28, 6, 0, Math.PI * 2); ctx.fill();
        }

        for (const b of bricks) {
          if (!b.alive) continue;
          ctx.fillStyle = k[ROW_COLORS[b.row]];
          roundRect(ctx, b.x, b.y, BW, BH, 5);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          roundRect(ctx, b.x + 3, b.y + 2, BW - 6, 4, 2);
        }

        for (const p of particles) {
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = k.accent2;
        roundRect(ctx, paddleX - PW / 2, PY, PW, PH, 6);

        ctx.fillStyle = k.text;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2); ctx.fill();

        if (ball.stuck && !over) {
          ctx.fillStyle = k.muted;
          ctx.textAlign = 'center';
          ctx.fillText(level > 1 && bricks.every(b => b.alive) ? `Level ${level} · faster!` : 'Get ready…', W / 2, H / 2 + 40);
        }
      },
      onInput(type, e) {
        if (type === 'press' && e.name === 'action' && ball && ball.stuck) launch();
        else if (type === 'pointer' && (e.phase === 'move' || e.phase === 'down') && Number.isFinite(e.x)) targetX = e.x;
      },
      destroy() {},
    };
  },
});
