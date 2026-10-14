Arcade.register({
  id: 'stacker',
  title: 'Cake Stacker',
  icon: '🎂',
  blurb: 'Drop each layer neatly. Overhangs get trimmed, perfect drops grow back.',
  controls: 'Space / tap to drop the layer',
  pad: 'action',
  actionLabel: 'Drop',
  width: 400,
  height: 560,
  create(api) {
    const W = api.width, H = api.height;
    const LH = 28;                 // layer height
    const BASE = 470;              // plate top, in world y (screen y when camera is 0)
    const MAXW = 210, PERFECT = 4, HOVER = 22;
    const FROSTING = ['pink', 'yellow', 'purple', 'cyan', 'orange', 'green'];

    const layers = [];             // placed layers: {x, w, color, sprinkles, drop}
    const falling = [];            // trimmed pieces tumbling away
    const pops = [];
    let mover = null, speed = 150, cam = 0, t = 0, over = false, overT = 0;

    // Sprinkles are stored in world x so trimming just filters them.
    function sprinkles(x, w) {
      const out = [];
      for (let i = 0; i < w / 9; i++) out.push({ x: x + api.rand(3, w - 3), y: api.rand(3, 9), a: api.rand(0, Math.PI), c: FROSTING[api.randInt(0, 5)] });
      return out;
    }
    function newMover() {
      const top = layers[layers.length - 1];
      const fromLeft = layers.length % 2 === 0;
      mover = { x: fromLeft ? 0 : W - top.w, w: top.w, dir: fromLeft ? 1 : -1, color: FROSTING[layers.length % FROSTING.length] };
      mover.sprinkles = sprinkles(mover.x, mover.w);
    }
    layers.push({ x: (W - 190) / 2, w: 190, color: FROSTING[0], sprinkles: sprinkles((W - 190) / 2, 190), drop: 0 });
    newMover();

    const layerY = i => BASE - (i + 1) * LH;

    function drop() {
      if (over || !mover) return;
      const top = layers[layers.length - 1];
      const m = mover, shift = x => s => ({ ...s, x: s.x + x });
      const y = layerY(layers.length) - HOVER;
      let x0 = Math.max(m.x, top.x), x1 = Math.min(m.x + m.w, top.x + top.w);
      if (x1 - x0 <= 0) {
        falling.push({ x: m.x, w: m.w, y, vy: 0, vx: m.dir * 60, rot: 0, color: m.color, sprinkles: m.sprinkles.map(shift(-m.x)) });
        mover = null; over = true;
        return;
      }
      let perfect = Math.abs(m.x - top.x) <= PERFECT;
      if (perfect) {
        const w = Math.min(MAXW, top.w + 8);
        x0 = Math.max(0, Math.min(W - w, top.x - (w - top.w) / 2)); x1 = x0 + w;
        pops.push({ text: 'Perfect!', y: layerY(layers.length), t: 0 });
      } else {
        // The overhang becomes a separate piece that falls off.
        const left = m.x < top.x;
        const px = left ? m.x : x1, pw = left ? x0 - m.x : m.x + m.w - x1;
        const ps = m.sprinkles.filter(s => s.x >= px && s.x < px + pw).map(shift(-px));
        falling.push({ x: px, w: pw, y, vy: -40, vx: left ? -50 : 50, rot: 0, color: m.color, sprinkles: ps });
      }
      const sp = perfect ? sprinkles(x0, x1 - x0) : m.sprinkles.filter(s => s.x >= x0 && s.x < x1);
      layers.push({ x: x0, w: x1 - x0, color: m.color, sprinkles: sp, drop: HOVER });
      api.addScore(1);
      speed = Math.min(380, speed + 6);
      newMover();
    }

    function update(dt) {
      t += dt;
      if (mover) {
        mover.x += mover.dir * speed * dt;
        const dx = mover.x < 0 ? -mover.x : mover.x + mover.w > W ? W - mover.w - mover.x : 0;
        if (dx) { mover.x += dx; mover.dir *= -1; for (const s of mover.sprinkles) s.x += dx; }
        else for (const s of mover.sprinkles) s.x += mover.dir * speed * dt;
      }
      for (const l of layers) if (l.drop) l.drop = Math.max(0, l.drop - dt * 220);
      for (const f of falling) { f.vy += 1400 * dt; f.y += f.vy * dt; f.x += f.vx * dt; f.rot += f.vx * dt * 0.02; }
      for (let i = falling.length - 1; i >= 0; i--) if (falling[i].y + cam > H + 80) falling.splice(i, 1);
      for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].t += dt) > 0.9) pops.splice(i, 1);

      // Keep the moving layer around the upper third of the screen.
      const target = Math.max(0, H * 0.32 - (layerY(layers.length) - HOVER));
      cam += (target - cam) * Math.min(1, dt * 5);

      if (over && (overT += dt) > 0.7) { overT = -1e9; api.gameOver('The cake toppled!'); }
    }

    function drawLayer(ctx, x, y, w, color, spr, sx = x) {
      const k = api.colors;
      if (w <= 0) return;
      ctx.fillStyle = k[color];
      ctx.beginPath(); ctx.roundRect(x, y, w, LH, Math.min(6, w / 2)); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, y + LH - 6, w, 6);
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(x, y + LH * 0.55, w, 4);
      for (const s of spr) {
        if (s.x - sx + x < x || s.x - sx + x > x + w) continue;
        ctx.save();
        ctx.translate(s.x - sx + x, y + s.y);
        ctx.rotate(s.a);
        ctx.fillStyle = s.c === color ? '#fff' : k[s.c];
        ctx.fillRect(-2, -1, 4, 2);
        ctx.restore();
      }
    }

    function draw(ctx) {
      const k = api.colors;
      ctx.fillStyle = k.bg2;
      ctx.fillRect(0, 0, W, H);
      // Faint polka dots that drift with the camera.
      ctx.fillStyle = k.surface;
      for (let i = 0; i < 30; i++) {
        const y = ((i * 71 + cam * 0.3) % (H + 40) + H + 40) % (H + 40) - 20;
        ctx.beginPath(); ctx.arc((i * 137) % W, y, 4 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.save();
      ctx.translate(0, cam);
      // Cake plate on a little stand.
      ctx.fillStyle = k.surface2;
      ctx.fillRect(W / 2 - 18, BASE + 10, 36, 30);
      ctx.beginPath(); ctx.ellipse(W / 2, BASE + 42, 60, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.surface;
      ctx.strokeStyle = k.borderStrong;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(W / 2, BASE + 5, 150, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      layers.forEach((l, i) => drawLayer(ctx, l.x, layerY(i) - l.drop, l.w, l.color, l.sprinkles));

      // A cherry crowns every tenth layer while it's on top.
      const n = layers.length - 1, top = layers[n];
      if (n > 0 && n % 10 === 0) {
        const cx = top.x + top.w / 2, cy = layerY(n) - top.drop - 7;
        ctx.strokeStyle = k.green; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.quadraticCurveTo(cx + 2, cy - 14, cx + 8, cy - 16); ctx.stroke();
        ctx.fillStyle = k.red;
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(cx - 2.5, cy - 2.5, 2, 0, Math.PI * 2); ctx.fill();
      }

      if (mover) drawLayer(ctx, mover.x, layerY(layers.length) - HOVER, mover.w, mover.color, mover.sprinkles);

      for (const f of falling) {
        ctx.save();
        ctx.translate(f.x + f.w / 2, f.y + LH / 2);
        ctx.rotate(f.rot);
        drawLayer(ctx, -f.w / 2, -LH / 2, f.w, f.color, f.sprinkles, 0);
        ctx.restore();
      }

      ctx.font = '700 20px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      for (const p of pops) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9);
        ctx.fillStyle = k.text;
        ctx.fillText(p.text, W / 2, p.y - 30 - p.t * 30);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    return {
      update,
      draw,
      onInput(type, e) {
        if (type === 'press' && e.name === 'action' && !e.repeat) drop();
        else if (type === 'pointer' && e.phase === 'down') drop();
      },
      destroy() {},
    };
  },
});
