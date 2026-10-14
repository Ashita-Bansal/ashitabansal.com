Arcade.register({
  id: 'memory',
  title: 'Memory',
  icon: '🃏',
  blurb: 'Flip cards and find all eight pairs of treats and tech.',
  controls: 'Click / tap to flip · match all 8 pairs in as few moves as possible',
  pad: 'none',
  width: 400,
  height: 440,
  lowerIsBetter: true,
  create(api) {
    const N = 4, TOP = 40, PAD = 16, GAP = 12;
    const S = (api.width - PAD * 2 - GAP * (N - 1)) / N;   // card size
    const FLIP = 0.22;                                      // seconds per flip
    const EMOJI = ['🎂', '🧁', '🍰', '🍪', '☕', '💻', '🐛', '🚀'];

    const faces = EMOJI.concat(EMOJI);
    for (let i = faces.length - 1; i > 0; i--) {
      const j = api.randInt(0, i);
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    // f animates towards up ? 1 : 0; glow pulses when a pair is found.
    const cards = faces.map((e, i) => ({ e, x: i % N, y: Math.floor(i / N), up: false, matched: false, f: 0, glow: 0 }));
    let first = null, second = null;
    let wait = 0;            // delay before a mismatched pair flips back
    let moves = 0, found = 0, done = false, endT = 0;
    let cursor = 0, showCursor = false, ticked = false;

    const cx = c => PAD + c.x * (S + GAP);
    const cy = c => TOP + PAD / 2 + c.y * (S + GAP);

    function flip(c) {
      if (done || wait > 0 || !c || c.up || c.matched) return;
      c.up = true;
      if (!first) { first = c; return; }
      second = c;
      moves++;
      api.setScore(moves);
      if (first.e === second.e) {
        first.matched = second.matched = true;
        first.glow = second.glow = 1;
        first = second = null;
        found++;
        if (found === EMOJI.length) { done = true; endT = 0.6; }
      } else {
        wait = 0.7;
      }
    }

    function hit(x, y) {
      return cards.find(c => x >= cx(c) && x <= cx(c) + S && y >= cy(c) && y <= cy(c) + S);
    }

    return {
      update(dt) {
        ticked = true;
        for (const c of cards) {
          const target = c.up ? 1 : 0;
          c.f += Math.sign(target - c.f) * Math.min(Math.abs(target - c.f), dt / FLIP);
          if (c.glow > 0) c.glow = Math.max(0, c.glow - dt * 1.5);
        }
        if (wait > 0) {
          wait -= dt;
          if (wait <= 0) {
            wait = 0;
            if (first) first.up = false;
            if (second) second.up = false;
            first = second = null;
          }
        }
        if (done && endT > 0) {
          endT -= dt;
          if (endT <= 0) api.gameOver(`Solved in ${moves} moves!`);
        }
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, api.width, api.height);

        ctx.textBaseline = 'middle';
        ctx.font = '600 16px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = k.muted;
        ctx.fillText('Moves', PAD, TOP / 2 + 2);
        ctx.fillStyle = k.text;
        ctx.font = '700 18px "JetBrains Mono", monospace';
        ctx.fillText(String(moves), PAD + 56, TOP / 2 + 2);
        ctx.textAlign = 'right';
        ctx.font = '600 16px "Space Grotesk", sans-serif';
        ctx.fillStyle = k.muted;
        ctx.fillText(`Pairs ${found}/${EMOJI.length}`, api.width - PAD, TOP / 2 + 2);

        ctx.textAlign = 'center';
        cards.forEach((c, i) => {
          const x = cx(c), y = cy(c);
          const sx = Math.max(0.02, Math.abs(Math.cos(c.f * Math.PI)));   // scale-X squash during the flip
          const faceUp = c.f > 0.5;
          ctx.save();
          ctx.translate(x + S / 2, y + S / 2);
          ctx.scale(sx, 1);
          ctx.fillStyle = faceUp ? k.surface : k.accent2;
          ctx.beginPath(); ctx.roundRect(-S / 2, -S / 2, S, S, 10); ctx.fill();
          if (faceUp) {
            ctx.strokeStyle = c.matched ? k.accent : k.border;
            ctx.lineWidth = c.matched ? 3 : 1.5;
            ctx.stroke();
            ctx.font = '40px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            ctx.fillStyle = k.text;
            ctx.fillText(c.e, 0, 3);
          } else {
            // Simple back pattern: a small inset ring.
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(-S / 2 + 8, -S / 2 + 8, S - 16, S - 16, 6); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
          if (c.glow > 0) {
            ctx.globalAlpha = c.glow;
            ctx.strokeStyle = k.accent;
            ctx.lineWidth = 2;
            const g = (1 - c.glow) * 8;
            ctx.beginPath(); ctx.roundRect(x - g, y - g, S + g * 2, S + g * 2, 10 + g); ctx.stroke();
            ctx.globalAlpha = 1;
          }
          if (showCursor && i === cursor) {
            ctx.strokeStyle = k.text;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.roundRect(x - 4, y - 4, S + 8, S + 8, 12); ctx.stroke();
            ctx.setLineDash([]);
          }
        });
        ctx.textBaseline = 'alphabetic';
      },
      onInput(type, e) {
        if (type === 'pointer') {
          if (e.phase === 'down') { showCursor = false; flip(hit(e.x, e.y)); }
          return;
        }
        if (type !== 'press') return;
        const d = { left: -1, right: 1, up: -N, down: N }[e.name];
        if (d) {
          if (showCursor) {
            const col = cursor % N;
            if ((e.name === 'left' && col > 0) || (e.name === 'right' && col < N - 1) ||
                (e.name === 'up' && cursor >= N) || (e.name === 'down' && cursor < N * (N - 1))) cursor += d;
          }
          showCursor = true;
        } else if (e.name === 'action' && ticked) {
          // The first action press just reveals the cursor (and the Space that starts the game is ignored).
          if (showCursor) flip(cards[cursor]);
          showCursor = true;
        }
      },
      destroy() {},
    };
  },
});
