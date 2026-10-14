Arcade.register({
  id: 'snake',
  title: 'Snake',
  icon: '🐍',
  blurb: 'Eat the cake, grow longer, don’t bite your own tail.',
  controls: 'Arrow keys / WASD · swipe on mobile',
  pad: 'dpad',
  width: 400,
  height: 400,
  create(api) {
    const N = 20;                 // grid cells per side
    const C = api.width / N;      // cell size
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let snake = [[10, 10], [9, 10], [8, 10]];
    let dir = [1, 0];
    const queue = [];             // buffered turns so quick double-taps aren't lost
    let food = spawn();
    let step = 0.13;              // seconds per move; shrinks as you grow
    let acc = 0;

    function spawn() {
      let p;
      do { p = [api.randInt(0, N - 1), api.randInt(0, N - 1)]; }
      while (snake.some(s => s[0] === p[0] && s[1] === p[1]));
      return p;
    }

    function tick() {
      if (queue.length) dir = queue.shift();
      const head = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N;
      const hitSelf = snake.slice(0, -1).some(s => s[0] === head[0] && s[1] === head[1]);
      if (hitWall || hitSelf) return api.gameOver(hitWall ? 'Ouch, a wall.' : 'Tangled up.');
      snake.unshift(head);
      if (head[0] === food[0] && head[1] === food[1]) {
        api.addScore(1);
        food = spawn();
        step = Math.max(0.06, step * 0.97);
      } else {
        snake.pop();
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    }

    return {
      update(dt) {
        acc += dt;
        while (acc >= step) { acc -= step; tick(); }
      },
      draw(ctx) {
        const k = api.colors;
        ctx.fillStyle = k.bg2;
        ctx.fillRect(0, 0, api.width, api.height);
        // Checkerboard
        ctx.fillStyle = k.surface;
        for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) ctx.fillRect(x * C, y * C, C, C);

        // Food: a little slice of cake
        const fx = food[0] * C, fy = food[1] * C;
        ctx.fillStyle = k.pink;
        roundRect(ctx, fx + 3, fy + 7, C - 6, C - 10, 3);
        ctx.fillStyle = '#fff7ed';
        ctx.fillRect(fx + 3, fy + 11, C - 6, 2);
        ctx.fillStyle = k.red;
        ctx.beginPath(); ctx.arc(fx + C / 2, fy + 5, 3, 0, Math.PI * 2); ctx.fill();

        // Snake
        snake.forEach(([x, y], i) => {
          ctx.fillStyle = i === 0 ? k.accent : k.accent2;
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i / (snake.length + 8));
          roundRect(ctx, x * C + 1, y * C + 1, C - 2, C - 2, 5);
        });
        ctx.globalAlpha = 1;

        // Eyes
        const [hx, hy] = snake[0];
        ctx.fillStyle = k.accentInk;
        const ex = dir[0] === 0 ? [0.3, 0.7] : [0.5 + dir[0] * 0.2, 0.5 + dir[0] * 0.2];
        const ey = dir[1] === 0 ? [0.3, 0.7] : [0.5 + dir[1] * 0.2, 0.5 + dir[1] * 0.2];
        for (let j = 0; j < 2; j++) {
          ctx.beginPath(); ctx.arc(hx * C + ex[j] * C, hy * C + ey[j] * C, 2, 0, Math.PI * 2); ctx.fill();
        }
      },
      onInput(type, e) {
        if (type !== 'press' || !DIRS[e.name]) return;
        const next = DIRS[e.name];
        const lastDir = queue.length ? queue[queue.length - 1] : dir;
        if (next[0] === -lastDir[0] && next[1] === -lastDir[1]) return; // no reversing into yourself
        if (next[0] === lastDir[0] && next[1] === lastDir[1]) return;
        if (queue.length < 3) queue.push(next);
      },
    };
  },
});
