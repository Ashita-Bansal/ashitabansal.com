Arcade.register({
  id: 'runner',
  title: 'Sprint',
  icon: '🍄',
  blurb: 'Run, jump the gaps, grab coins and stomp the mushrooms.',
  controls: 'Space / ↑ / tap to jump · hold for higher',
  pad: 'action',
  actionLabel: 'Jump',
  width: 640,
  height: 360,
  create(api) {
    const W = api.width, H = api.height;
    const T = 32;                  // tile size
    const GY = 296;                // top of the ground
    const HERO_X = 140;            // hero's fixed screen x
    const HW = 22, HH = 28;        // hero box
    const G = 2100, JUMP_V = -600, HOLD_G = 0.42, HOLD_MAX = 0.24;
    const COYOTE = 0.08, BUFFER = 0.1;

    const hero = { x: HERO_X, y: GY, vy: 0, onGround: true, holdT: 0 };
    let speed = 210, bonus = 0, t = 0, dead = false;
    let coyote = 0, buffer = 0, pointerHeld = false;
    const ground = [], platforms = [], coins = [], enemies = [], pops = [];
    let genX = 0;

    // Safe opening stretch, then procedural sections.
    ground.push({ x: 0, w: T * 34 });
    genX = T * 34;
    function generate() {
      while (genX < hero.x + W * 1.5) {
        const maxGap = Math.max(2, Math.min(4, Math.floor(speed * 0.5 / T)));
        genX += api.randInt(2, maxGap) * T;
        const len = api.randInt(6, 14);
        const seg = { x: genX, w: len * T };
        ground.push(seg);
        const r = Math.random();
        if (r < 0.4 && len >= 7) {
          // Floating brick platform with coins on it.
          const pw = api.randInt(3, 5) * T, px = seg.x + api.randInt(1, len - 5) * T;
          const py = GY - api.randInt(3, 4) * T;
          platforms.push({ x: px, y: py, w: pw });
          for (let cx = px + T / 2; cx < px + pw; cx += T) coins.push({ x: cx, y: py - 18 });
        } else if (r < 0.75) {
          // Arc of coins.
          const n = api.randInt(3, 5), cx0 = seg.x + api.randInt(1, Math.max(1, len - n - 1)) * T;
          for (let i = 0; i < n; i++) coins.push({ x: cx0 + i * 28, y: GY - 40 - Math.sin((i / (n - 1)) * Math.PI) * 40 });
        }
        if (len >= 7 && Math.random() < 0.6) {
          enemies.push({ x: seg.x + seg.w * api.rand(0.5, 0.8), y: GY, vx: -50, seg, squash: 0 });
        }
        genX += seg.w;
      }
    }
    generate();

    const jumpHeld = () => api.held('action') || api.held('up') || pointerHeld;
    const overlapsX = (x, w) => hero.x + HW / 2 - 3 > x && hero.x - HW / 2 + 3 < x + w;

    function pressJump() { buffer = BUFFER; }
    function releaseJump() { if (hero.vy < 0) hero.vy *= 0.45; hero.holdT = HOLD_MAX; }

    function die(msg) { dead = true; api.gameOver(msg); }

    function update(dt) {
      if (dead) return;
      t += dt;
      speed = Math.min(420, speed + dt * 3.5);
      hero.x += speed * dt;
      coyote -= dt; buffer -= dt;

      if (buffer > 0 && (hero.onGround || coyote > 0)) {
        hero.vy = JUMP_V; hero.onGround = false; hero.holdT = 0; buffer = 0; coyote = 0;
      }
      // Holding jump softens gravity on the way up for a while.
      let g = G;
      if (hero.vy < 0 && jumpHeld() && hero.holdT < HOLD_MAX) { g *= HOLD_G; hero.holdT += dt; }
      const prevY = hero.y;
      hero.vy = Math.min(hero.vy + g * dt, 1200);
      hero.y += hero.vy * dt;

      const wasGround = hero.onGround;
      hero.onGround = false;
      if (hero.vy >= 0) {
        if (prevY <= GY + 1 && hero.y >= GY && ground.some(s => overlapsX(s.x, s.w))) { hero.y = GY; hero.vy = 0; hero.onGround = true; }
        for (const p of platforms) {
          if (prevY <= p.y + 1 && hero.y >= p.y && overlapsX(p.x, p.w)) { hero.y = p.y; hero.vy = 0; hero.onGround = true; }
        }
      }
      if (wasGround && !hero.onGround && hero.vy >= 0) coyote = COYOTE;
      if (hero.y > H + 60) return die('Fell down a gap!');

      for (const c of coins) {
        if (!c.taken && Math.abs(c.x - hero.x) < 18 && Math.abs(c.y - (hero.y - HH / 2)) < 22) {
          c.taken = true; bonus += 5; pops.push({ x: c.x, y: c.y, t: 0, text: '+5' });
        }
      }
      for (const e of enemies) {
        if (e.squash) { e.squash += dt; continue; }
        e.x += e.vx * dt;
        if (e.x < e.seg.x + 12 || e.x > e.seg.x + e.seg.w - 12) { e.vx *= -1; e.x = Math.max(e.seg.x + 12, Math.min(e.seg.x + e.seg.w - 12, e.x)); }
        if (Math.abs(e.x - hero.x) < (HW + 22) / 2 - 2 && hero.y > e.y - 20 && hero.y - HH < e.y) {
          if (hero.vy > 0 && prevY <= e.y - 12) {
            e.squash = 0.001; bonus += 10;
            hero.vy = jumpHeld() ? -560 : -360; hero.holdT = HOLD_MAX;
            pops.push({ x: e.x, y: e.y - 26, t: 0, text: '+10' });
          } else return die('Bonked by a mushroom!');
        }
      }
      for (const p of pops) p.t += dt;

      // Drop anything well behind the camera.
      const left = hero.x - HERO_X - 100;
      const prune = (arr, end) => { while (arr.length && end(arr[0]) < left) arr.shift(); };
      prune(ground, s => s.x + s.w); prune(platforms, p => p.x + p.w);
      for (let i = coins.length - 1; i >= 0; i--) if (coins[i].x < left || coins[i].taken) coins.splice(i, 1);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].x < left || enemies[i].squash > 0.4) enemies.splice(i, 1);
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 0.7) pops.splice(i, 1);
      generate();

      api.setScore(Math.floor(hero.x / 40) + bonus);
    }

    function drawHero(ctx, x, y) {
      const k = api.colors;
      const run = hero.onGround ? Math.floor(t * 12) % 2 : 2;
      const L = x - HW / 2;
      ctx.fillStyle = '#7c2d12';  // boots
      if (run === 2) { ctx.fillRect(L, y - 5, 8, 5); ctx.fillRect(L + 14, y - 7, 8, 5); }
      else { ctx.fillRect(L + (run ? 2 : 0), y - 5, 8, 5); ctx.fillRect(L + (run ? 12 : 14), y - 5, 8, 5); }
      ctx.fillStyle = k.blue;     // overalls
      ctx.fillRect(L + 2, y - 15, 18, 10);
      ctx.fillStyle = k.red;      // shirt + arms
      ctx.fillRect(L + 1, y - 19, 20, 5);
      ctx.fillStyle = k.blue;
      ctx.fillRect(L + 5, y - 19, 3, 5); ctx.fillRect(L + 14, y - 19, 3, 5);
      ctx.fillStyle = k.yellow;   // buttons
      ctx.fillRect(L + 5, y - 14, 2, 2); ctx.fillRect(L + 15, y - 14, 2, 2);
      ctx.fillStyle = '#fcd9b6';  // face
      ctx.fillRect(L + 4, y - 26, 16, 8);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(L + 14, y - 25, 2, 3);            // eye
      ctx.fillRect(L + 12, y - 21, 8, 2);            // moustache
      ctx.fillStyle = k.red;      // cap with brim
      ctx.fillRect(L + 3, y - 31, 15, 5);
      ctx.fillRect(L + 12, y - 27, 10, 2);
    }

    function draw(ctx) {
      const k = api.colors;
      const cam = hero.x - HERO_X;
      ctx.fillStyle = k.bg2;
      ctx.fillRect(0, 0, W, H);

      // Parallax: clouds, far hills, near hills.
      ctx.fillStyle = k.surface2;
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 190 - cam * 0.1) % 950 + 950) % 950 - 120, cy = 50 + (i % 3) * 28;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.arc(cx + 20, cy - 8, 20, 0, Math.PI * 2); ctx.arc(cx + 42, cy, 15, 0, Math.PI * 2); ctx.fill();
      }
      const hills = (f, r, col, step) => {
        ctx.fillStyle = col;
        const off = ((cam * f) % step + step) % step;
        for (let x = -off - step; x < W + step; x += step) { ctx.beginPath(); ctx.arc(x, GY + 10, r, Math.PI, 0); ctx.fill(); }
      };
      ctx.globalAlpha = 0.35; hills(0.2, 120, k.accent2, 260);
      ctx.globalAlpha = 0.5; hills(0.45, 70, k.accent, 190);
      ctx.globalAlpha = 1;

      // Coins spin by squashing horizontally.
      for (const c of coins) {
        const sx = c.x - cam;
        if (sx < -20 || sx > W + 20) continue;
        const s = Math.abs(Math.cos(t * 5 + c.x * 0.01));
        ctx.fillStyle = k.yellow;
        ctx.beginPath(); ctx.ellipse(sx, c.y, Math.max(1.5, 7 * s), 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = k.orange;
        ctx.fillRect(sx - Math.max(0.5, 1.5 * s), c.y - 5, Math.max(1, 3 * s), 10);
      }

      for (const e of enemies) {
        const sx = e.x - cam, sq = e.squash ? 0.35 : 1;
        if (sx < -30 || sx > W + 30) continue;
        const h = 22 * sq, step = Math.floor(t * 8) % 2;
        ctx.fillStyle = '#92400e';
        if (!e.squash) { ctx.fillRect(sx - 10 + step * 2, e.y - 4, 7, 4); ctx.fillRect(sx + 3 - step * 2, e.y - 4, 7, 4); }
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sx - 7, e.y - h * 0.55, 14, h * 0.5);
        ctx.fillStyle = k.red;
        ctx.beginPath(); ctx.ellipse(sx, e.y - h * 0.55, 13, h * 0.5, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx - 5, e.y - h * 0.75, 2.5 * sq + 0.5, 0, Math.PI * 2); ctx.arc(sx + 5, e.y - h * 0.8, 2 * sq + 0.5, 0, Math.PI * 2); ctx.fill();
        if (!e.squash) { ctx.fillStyle = '#1f2937'; ctx.fillRect(sx - 4, e.y - 10, 2, 3); ctx.fillRect(sx + 2, e.y - 10, 2, 3); }
      }

      // Hero goes behind the ground so falling into a gap looks right.
      drawHero(ctx, HERO_X, hero.y);

      for (const s of ground) {
        const x0 = Math.floor(s.x - cam);
        if (x0 > W || x0 + s.w < 0) continue;
        for (let x = x0; x < x0 + s.w; x += T) {
          for (let y = GY; y < H; y += T) {
            ctx.fillStyle = y === GY ? '#b45309' : '#92400e';
            ctx.fillRect(x, y, T, T);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + T - 2, y, 2, T);
          }
        }
        ctx.fillStyle = k.green;
        ctx.fillRect(x0, GY, s.w, 6);
      }
      for (const p of platforms) {
        const x0 = Math.floor(p.x - cam);
        if (x0 > W || x0 + p.w < 0) continue;
        ctx.fillStyle = k.orange;
        ctx.fillRect(x0, p.y, p.w, T / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x0, p.y + T / 4 - 1, p.w, 2); ctx.fillRect(x0, p.y + T / 2 - 2, p.w, 2);
        for (let x = 0; x < p.w; x += T / 2) ctx.fillRect(x0 + x + ((x / (T / 2)) % 2 ? 0 : T / 4), p.y, 2, T / 4);
        for (let x = 0; x < p.w; x += T / 2) ctx.fillRect(x0 + x + ((x / (T / 2)) % 2 ? T / 4 : 0), p.y + T / 4, 2, T / 4);
      }

      ctx.font = '600 14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      for (const p of pops) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / 0.7);
        ctx.fillStyle = k.text;
        ctx.fillText(p.text, p.x - cam, p.y - p.t * 40);
      }
      ctx.globalAlpha = 1;
    }

    return {
      update,
      draw,
      onInput(type, e) {
        if (dead) return;
        if (type === 'press' && (e.name === 'action' || e.name === 'up') && !e.repeat && !e.swipe) pressJump();
        else if (type === 'release' && (e.name === 'action' || e.name === 'up') && !e.swipe && !jumpHeld()) releaseJump();
        else if (type === 'pointer' && e.phase === 'down') { pointerHeld = true; pressJump(); }
        else if (type === 'pointer' && e.phase === 'up') { pointerHeld = false; if (!jumpHeld()) releaseJump(); }
      },
      destroy() {},
    };
  },
});
