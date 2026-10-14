Arcade.register({
  id: 'flappy',
  title: 'Flappy',
  icon: '🐤',
  blurb: 'Flap a little chick through the pipes. One tap at a time.',
  controls: 'Space / ↑ / tap to flap',
  pad: 'action',
  actionLabel: 'Flap',
  width: 360,
  height: 540,
  create(api) {
    const W = api.width, H = api.height;
    const GROUND = H - 60;         // top of the ground strip
    const R = 13;                  // bird radius
    const G = 1500, FLAP = -430;
    const SPEED = 140, PW = 58, GAP = 150, SPACING = 200;
    const BX = 100;

    const bird = { y: H * 0.42, vy: 0, wing: 0 };
    let started = false, dead = false, t = 0, scroll = 0;
    const pipes = [];
    for (let i = 0; i < 3; i++) addPipe(W + 80 + i * SPACING);

    function addPipe(x) {
      pipes.push({ x, gapY: api.rand(90 + GAP / 2, GROUND - 60 - GAP / 2), passed: false });
    }

    function flap() {
      if (dead) return;
      started = true;
      bird.vy = FLAP;
      bird.wing = 1;
    }

    // Circle vs axis-aligned rect.
    function hits(cx, cy, x, y, w, h) {
      const nx = Math.max(x, Math.min(cx, x + w)), ny = Math.max(y, Math.min(cy, y + h));
      return (cx - nx) ** 2 + (cy - ny) ** 2 < R * R * 0.8;
    }

    function die(msg) { dead = true; api.gameOver(msg); }

    function update(dt) {
      if (dead) return;
      t += dt;
      bird.wing = Math.max(0, bird.wing - dt * 4);
      if (!started) { bird.y = H * 0.42 + Math.sin(t * 4) * 6; scroll += SPEED * dt; return; }
      scroll += SPEED * dt;
      bird.vy = Math.min(bird.vy + G * dt, 700);
      bird.y += bird.vy * dt;
      if (bird.y + R >= GROUND) { bird.y = GROUND - R; return die('Face-planted.'); }
      if (bird.y - R <= 0) return die('Bonked the sky.');

      for (const p of pipes) {
        p.x -= SPEED * dt;
        if (!p.passed && p.x + PW < BX - R) { p.passed = true; api.addScore(1); }
        const top = p.gapY - GAP / 2, bot = p.gapY + GAP / 2;
        if (hits(BX, bird.y, p.x, -50, PW, top + 50) || hits(BX, bird.y, p.x, bot, PW, GROUND - bot)) return die('Hit a pipe.');
      }
      if (pipes[0].x + PW < -10) { pipes.shift(); addPipe(pipes[pipes.length - 1].x + SPACING); }
    }

    function drawPipe(ctx, x, y, h, lipAtBottom) {
      const k = api.colors;
      ctx.fillStyle = k.accent;
      ctx.fillRect(x, y, PW, h);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + 6, y, 6, h);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x + PW - 10, y, 10, h);
      const ly = lipAtBottom ? y + h - 22 : y;
      ctx.fillStyle = k.accent2;
      ctx.beginPath(); ctx.roundRect(x - 5, ly, PW + 10, 22, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + 2, ly + 3, 6, 16);
    }

    function drawBird(ctx) {
      const k = api.colors;
      const tilt = started ? Math.max(-0.5, Math.min(1.3, bird.vy / 600)) : 0;
      ctx.save();
      ctx.translate(BX, bird.y);
      ctx.rotate(tilt);
      ctx.fillStyle = k.yellow;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.ellipse(-2, 5, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Wing swings up on a flap, idles with a gentle flutter.
      const wa = bird.wing > 0 ? -0.9 * bird.wing : Math.sin(t * 14) * 0.25;
      ctx.save();
      ctx.translate(-4, 1);
      ctx.rotate(wa);
      ctx.fillStyle = k.orange;
      ctx.beginPath(); ctx.ellipse(-4, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(5, -5, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(6.5, -5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.orange;
      ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(19, 2); ctx.lineTo(10, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = k.pink;
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(3, 3, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw(ctx) {
      const k = api.colors;
      ctx.fillStyle = k.bg2;
      ctx.fillRect(0, 0, W, H);

      // Slow parallax clouds and skyline.
      ctx.fillStyle = k.surface;
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 130 - scroll * 0.15) % 520 + 520) % 520 - 60, cy = 70 + (i % 2) * 60;
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.arc(cx + 22, cy - 8, 22, 0, Math.PI * 2); ctx.arc(cx + 46, cy, 16, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = k.surface2;
      for (let i = 0; i < 9; i++) {
        const bx = ((i * 48 - scroll * 0.35) % 432 + 432) % 432 - 48, bh = 40 + ((i * 37) % 5) * 14;
        ctx.fillRect(bx, GROUND - bh, 44, bh);
      }

      for (const p of pipes) {
        if (p.x > W || p.x + PW < -10) continue;
        const top = p.gapY - GAP / 2, bot = p.gapY + GAP / 2;
        drawPipe(ctx, p.x, 0, top, true);
        drawPipe(ctx, p.x, bot, GROUND - bot, false);
      }

      // Scrolling ground strip.
      ctx.fillStyle = k.surface;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = k.accent;
      ctx.fillRect(0, GROUND, W, 6);
      ctx.fillStyle = k.border;
      const off = scroll % 24;
      for (let x = -off - 24; x < W + 24; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, GROUND + 6); ctx.lineTo(x + 12, GROUND + 6); ctx.lineTo(x + 2, GROUND + 20); ctx.lineTo(x - 10, GROUND + 20); ctx.closePath(); ctx.fill();
      }

      drawBird(ctx);

      if (!started) {
        ctx.fillStyle = k.muted;
        ctx.font = '600 16px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Flap to start', W / 2, H * 0.42 + 50);
      }
      ctx.fillStyle = k.text;
      ctx.font = '700 40px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(api.score()), W / 2, 64);
    }

    return {
      update,
      draw,
      onInput(type, e) {
        if (type === 'press' && (e.name === 'action' || e.name === 'up') && !e.repeat && !e.swipe) flap();
        else if (type === 'pointer' && e.phase === 'down') flap();
      },
      destroy() {},
    };
  },
});
