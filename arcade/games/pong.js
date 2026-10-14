Arcade.register({
  id: 'pong',
  title: 'Pong',
  icon: '🏓',
  blurb: 'The classic. Beat the computer to seven points.',
  controls: 'Mouse / drag or ↑ ↓ keys · first to 7',
  pad: 'none',
  width: 560,
  height: 400,
  create(api) {
    const W = api.width, H = api.height;
    const PW = 10, PH = 70, MARGIN = 22, R = 7, WIN = 7;
    const KEY_SPEED = 420, CPU_SPEED = 300;

    let player = H / 2, cpu = H / 2, targetY = null;
    let pts = 0, cpuPts = 0, over = false;
    let ball, serveTimer = 0, serveDir = 1;
    let cpuAim = 0, aimTimer = 0;   // cpu aims at ball.y + cpuAim; re-rolled periodically
    let hitFlash = 0;

    function serve() {
      ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: 280 };
      serveTimer = 1.0;
    }
    function launch() {
      const a = api.rand(-0.45, 0.45);
      ball.vx = Math.cos(a) * ball.speed * serveDir;
      ball.vy = Math.sin(a) * ball.speed;
    }
    function point(playerScored) {
      if (playerScored) { pts++; api.setScore(pts); } else cpuPts++;
      serveDir = playerScored ? 1 : -1;  // serve toward whoever just lost the point
      if (pts >= WIN) { over = true; return api.gameOver('You win! 🎉'); }
      if (cpuPts >= WIN) { over = true; return api.gameOver('The computer wins'); }
      serve();
    }
    // Bounce off a paddle at center y; dir is the outgoing x direction.
    function bounce(py, dir) {
      const off = Math.max(-1, Math.min(1, (ball.y - py) / (PH / 2)));
      ball.speed = Math.min(ball.speed * 1.06, 720);
      const a = off * 0.9;
      ball.vx = Math.cos(a) * ball.speed * dir;
      ball.vy = Math.sin(a) * ball.speed;
      hitFlash = 0.12;
    }

    function stepBall(dt) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
      if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); }
      const lx = MARGIN + PW, rx = W - MARGIN - PW;
      if (ball.vx < 0 && ball.x - R <= lx && ball.x - R >= MARGIN - 6 && Math.abs(ball.y - player) <= PH / 2 + R) {
        ball.x = lx + R; bounce(player, 1);
      } else if (ball.vx > 0 && ball.x + R >= rx && ball.x + R <= W - MARGIN + 6 && Math.abs(ball.y - cpu) <= PH / 2 + R) {
        ball.x = rx - R; bounce(cpu, -1);
      }
      if (ball.x < -R) point(false);
      else if (ball.x > W + R) point(true);
    }

    serve();
    const clampPaddle = y => Math.max(PH / 2, Math.min(H - PH / 2, y));

    return {
      update(dt) {
        if (over) return;
        if (api.held('up')) { player -= KEY_SPEED * dt; targetY = null; }
        if (api.held('down')) { player += KEY_SPEED * dt; targetY = null; }
        if (targetY !== null) player += (targetY - player) * Math.min(1, dt * 25);
        player = clampPaddle(player);
        hitFlash = Math.max(0, hitFlash - dt);

        // CPU: chase the ball only when it's coming, with limited speed and a wobbly aim.
        aimTimer -= dt;
        if (aimTimer <= 0) { aimTimer = api.rand(0.3, 0.7); cpuAim = api.rand(-PH * 0.6, PH * 0.6); }
        const goal = ball.vx > 0 ? ball.y + cpuAim : H / 2;
        const diff = goal - cpu;
        const maxMove = CPU_SPEED * dt * (ball.vx > 0 ? 1 : 0.5);
        cpu = clampPaddle(cpu + Math.max(-maxMove, Math.min(maxMove, diff)));

        if (serveTimer > 0) {
          serveTimer -= dt;
          if (serveTimer <= 0) launch();
          return;
        }
        const n = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (R * 0.5)));
        for (let i = 0; i < n && serveTimer <= 0 && !over; i++) stepBall(dt / n);
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, W, H);

        // Big faint scores
        ctx.font = '700 120px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = k.text;
        ctx.globalAlpha = 0.07;
        ctx.fillText(String(pts), W / 4, H / 2);
        ctx.fillText(String(cpuPts), W * 3 / 4, H / 2);
        ctx.globalAlpha = 1;

        // Dashed center line
        ctx.fillStyle = k.border;
        for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 2, y, 4, 12);

        ctx.font = '600 13px "Space Grotesk", sans-serif';
        ctx.fillStyle = k.muted;
        ctx.fillText('YOU', W / 4, 20);
        ctx.fillText('CPU', W * 3 / 4, 20);

        ctx.fillStyle = k.accent;
        ctx.beginPath(); ctx.roundRect(MARGIN, player - PH / 2, PW, PH, 4); ctx.fill();
        ctx.fillStyle = k.pink;
        ctx.beginPath(); ctx.roundRect(W - MARGIN - PW, cpu - PH / 2, PW, PH, 4); ctx.fill();

        if (ball) {
          ctx.fillStyle = hitFlash > 0 ? k.yellow : k.text;
          ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2); ctx.fill();
        }
        if (serveTimer > 0 && !over) {
          ctx.font = '600 16px "Space Grotesk", sans-serif';
          ctx.fillStyle = k.muted;
          ctx.fillText(pts + cpuPts === 0 ? 'Get ready…' : `${pts} – ${cpuPts}`, W / 2, H / 2 + 40);
        }
      },
      onInput(type, e) {
        if (type === 'pointer' && (e.phase === 'move' || e.phase === 'down') && Number.isFinite(e.y)) targetY = e.y;
      },
      destroy() {},
    };
  },
});
