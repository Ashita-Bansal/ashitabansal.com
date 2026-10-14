Arcade.register({
  id: 'whack',
  title: 'Whack-a-Bug',
  icon: '🐞',
  blurb: 'Squash the bugs before they ship. Leave the features alone.',
  controls: 'Click / tap the bugs · avoid the ✓ features · 30 seconds',
  pad: 'none',
  width: 420,
  height: 480,
  create(api) {
    const W = api.width, H = api.height;
    const ROUND = 30, HS = 120, GAP = 15, X0 = (W - 3 * HS - 2 * GAP) / 2, Y0 = 82, BAR = 18;
    const holes = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      holes.push({ x: X0 + c * (HS + GAP), y: Y0 + r * (HS + GAP), item: null });
    }
    let time = ROUND, spawnTimer = 0.4, squashed = 0, over = false, flash = 0;
    let labels = [];

    function spawn() {
      const free = holes.filter(h => !h.item);
      if (!free.length) return;
      const h = free[api.randInt(0, free.length - 1)];
      const p = 1 - time / ROUND;  // 0 → 1 over the round
      const feature = Math.random() < 0.2;
      h.item = {
        kind: feature ? (Math.random() < 0.5 ? 'check' : 'coffee') : 'bug',
        t: 0, dur: api.rand(1.15, 1.4) - p * 0.55, hit: false, hitT: 0,
      };
    }
    // How far the item has risen out of its slot, 0..1.
    function rise(it) {
      if (it.hit) return 1;
      const e = 0.14;
      return Math.max(0, Math.min(1, it.t / e, (it.dur - it.t) / e));
    }

    function whack(x, y) {
      for (const h of holes) {
        const it = h.item;
        if (!it || it.hit || rise(it) < 0.35) continue;
        if (x < h.x || x > h.x + HS || y < h.y || y > h.y + HS) continue;
        it.hit = true; it.hitT = 0;
        const lx = h.x + HS / 2, ly = h.y + 30;
        if (it.kind === 'bug') {
          squashed++;
          api.addScore(1);
          labels.push({ x: lx, y: ly, text: Math.random() < 0.35 ? 'fixed!' : '+1', good: true, t: 0 });
        } else {
          api.setScore(Math.max(0, api.score() - 2));
          flash = 0.35;
          labels.push({ x: lx, y: ly, text: '-2 regression', good: false, t: 0 });
        }
        return;
      }
    }

    function drawBug(ctx, k, cx, cy, squish) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + squish * 0.4, 1 - squish * 0.6);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of [-1, 1]) for (const ly of [-8, 2, 12]) {
        ctx.moveTo(s * 14, ly); ctx.lineTo(s * 27, ly + (ly - 2) * 0.5 + 4);
      }
      ctx.moveTo(-4, -26); ctx.quadraticCurveTo(-8, -38, -15, -40);
      ctx.moveTo(4, -26); ctx.quadraticCurveTo(8, -38, 15, -40);
      ctx.stroke();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.red;
      ctx.beginPath(); ctx.ellipse(0, 4, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(-1.2, -16, 2.4, 41);
      for (const [sx, sy, sr] of [[-9, -4, 4], [9, -4, 4], [-11, 10, 3.5], [11, 10, 3.5], [-5, 19, 3], [5, 19, 3]]) {
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      if (!squish) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-4, -22, 2.5, 0, Math.PI * 2); ctx.arc(4, -22, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    function drawFeature(ctx, k, kind, cx, cy) {
      ctx.save();
      ctx.translate(cx, cy);
      if (kind === 'check') {
        ctx.fillStyle = k.green;
        ctx.beginPath(); ctx.roundRect(-26, -24, 52, 48, 12); ctx.fill();
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-3, 10); ctx.lineTo(13, -9); ctx.stroke();
      } else {
        ctx.strokeStyle = k.surface; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(19, 4, 8, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.fillStyle = '#f5f5f4';
        ctx.beginPath(); ctx.roundRect(-18, -14, 36, 38, [3, 3, 10, 10]); ctx.fill();
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-15, -11, 30, 6);
        ctx.strokeStyle = k.muted; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -20); ctx.quadraticCurveTo(-10, -26, -5, -32);
        ctx.moveTo(5, -20); ctx.quadraticCurveTo(1, -26, 6, -32); ctx.stroke();
      }
      ctx.restore();
    }

    return {
      update(dt) {
        if (over) return;
        time -= dt;
        flash = Math.max(0, flash - dt);
        for (const h of holes) {
          const it = h.item;
          if (!it) continue;
          if (it.hit) { it.hitT += dt; if (it.hitT > 0.45) h.item = null; }
          else { it.t += dt; if (it.t >= it.dur) h.item = null; }
        }
        for (const l of labels) { l.t += dt; l.y -= 40 * dt; }
        labels = labels.filter(l => l.t < 0.8);
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          if (Math.random() < 0.25 * (1 - time / ROUND)) spawn();  // doubles later in the round
          spawnTimer = 0.85 - 0.45 * (1 - Math.max(0, time) / ROUND);
        }
        if (time <= 0) {
          time = 0; over = true;
          api.gameOver(`Time’s up! ${squashed} bug${squashed === 1 ? '' : 's'} squashed`);
        }
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, W, H);

        // Countdown bar
        const frac = Math.max(0, time / ROUND);
        ctx.fillStyle = k.surface2;
        ctx.beginPath(); ctx.roundRect(X0, 22, W - 2 * X0, BAR, 9); ctx.fill();
        ctx.fillStyle = frac < 0.2 ? k.red : frac < 0.5 ? k.yellow : k.accent;
        if (frac > 0) { ctx.beginPath(); ctx.roundRect(X0, 22, Math.max(BAR, (W - 2 * X0) * frac), BAR, 9); ctx.fill(); }
        ctx.font = '600 14px "Space Grotesk", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = k.muted;
        ctx.fillText(`${Math.ceil(time)}s`, X0, 60);
        ctx.textAlign = 'right';
        ctx.fillText(`🐞 ${squashed} squashed`, W - X0, 60);

        for (const h of holes) {
          // Terminal window: title bar with traffic lights, dark body
          ctx.fillStyle = k.surface;
          ctx.beginPath(); ctx.roundRect(h.x, h.y, HS, HS, 12); ctx.fill();
          ctx.strokeStyle = k.border; ctx.lineWidth = 1;
          ctx.stroke();
          [k.red, k.yellow, k.green].forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.beginPath(); ctx.arc(h.x + 14 + i * 11, h.y + 12, 3.5, 0, Math.PI * 2); ctx.fill();
          });
          const bx = h.x + 8, by = h.y + 24, bw = HS - 16, bh = HS - 32;
          ctx.fillStyle = k.dark ? '#05070a' : '#1e2430';
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
          ctx.fillStyle = k.accent;
          ctx.globalAlpha = 0.5;
          ctx.font = '600 11px ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.fillText('$ _', bx + 6, by + 10);
          ctx.globalAlpha = 1;

          const it = h.item;
          if (!it) continue;
          ctx.save();
          ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
          const cx = h.x + HS / 2, cy = by + bh / 2 + 6 + (1 - rise(it)) * 70;
          if (it.hit) ctx.globalAlpha = Math.max(0, 1 - it.hitT / 0.45);
          if (it.kind === 'bug') drawBug(ctx, k, cx, cy, it.hit ? Math.min(1, it.hitT * 8) : 0);
          else drawFeature(ctx, k, it.kind, cx, cy);
          ctx.restore();
        }

        if (flash > 0) {
          ctx.fillStyle = k.red;
          ctx.globalAlpha = flash * 0.6;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }

        ctx.font = '700 18px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        for (const l of labels) {
          ctx.globalAlpha = Math.max(0, 1 - l.t / 0.8);
          ctx.fillStyle = l.good ? k.green : k.red;
          ctx.fillText(l.text, l.x, l.y);
        }
        ctx.globalAlpha = 1;
      },
      onInput(type, e) {
        if (!over && type === 'pointer' && e.phase === 'down' && Number.isFinite(e.x) && Number.isFinite(e.y)) whack(e.x, e.y);
      },
      destroy() {},
    };
  },
});
