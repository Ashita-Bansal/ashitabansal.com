(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const EMAIL = 'ashita1304@gmail.com';
  const LINKS = {
    linkedin: 'https://www.linkedin.com/in/ashitabansal',
    github: 'https://github.com/Ashita-Bansal',
    resume: 'Resume_AshitaBansal_2026.pdf',
  };

  $('#year').textContent = new Date().getFullYear();
  if (!isMac) $$('.mod').forEach(el => (el.textContent = 'Ctrl '));

  /* ───────── Theme ───────── */
  const currentTheme = () =>
    root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const toggleTheme = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    return next;
  };
  $('#theme-toggle').addEventListener('click', toggleTheme);

  /* ───────── Toast ───────── */
  let toastTimer;
  const toast = msg => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  };
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(EMAIL); toast('Email copied to clipboard'); }
    catch (e) { location.href = `mailto:${EMAIL}`; }
  };
  $('#copy-email').addEventListener('click', copyEmail);

  /* ───────── Nav: border on scroll + active section ───────── */
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav-links a');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'projects', 'terminal', 'skills', 'baking', 'contact'].forEach(id => sectionObserver.observe(document.getElementById(id)));

  // Web fonts can finish loading after the browser has jumped to a #section,
  // making the content above it taller and leaving you short of the target.
  // Re-align once fonts and the page have settled.
  if (location.hash.length > 1) {
    const realign = () => {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    };
    if (document.fonts) document.fonts.ready.then(realign);
    addEventListener('load', realign, { once: true });
  }

  /* ───────── Reveal on scroll ───────── */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => {
    // Stagger siblings that enter together.
    const siblings = $$(':scope > .reveal', el.parentElement);
    el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 6) * 60}ms`;
    revealObserver.observe(el);
  });

  /* ───────── Card spotlight follows cursor ───────── */
  $$('.win').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ───────── Pipeline log ticker (illustrative) ───────── */
  const LOG = [
    ['s3', 'ObjectCreated  raw/batch-*.dat'],
    ['eventbridge', 'rule matched → ingest-trigger'],
    ['lambda', 'invoked · triggering DAG ingest_raw'],
    ['airflow', 'DAG ingest_raw running · glue job started'],
    ['glue', 'partition pruning · parquet vectorized read'],
    ['iceberg', 'snapshot committed · <span class="ok">✓</span>'],
  ];
  const logEl = $('#pipe-log');
  let logIdx = 0;
  const stamp = () => new Date().toTimeString().slice(0, 8);
  const pushLog = () => {
    const [src, msg] = LOG[logIdx];
    const li = document.createElement('li');
    li.innerHTML = `<span class="t">${stamp()}</span><span class="src">${src}</span><span>${msg}</span>`;
    logEl.appendChild(li);
    while (logEl.children.length > 4) logEl.firstElementChild.remove();
    logIdx = (logIdx + 1) % LOG.length;
  };
  if (reduceMotion) { for (let i = 0; i < 4; i++) pushLog(); }
  else { pushLog(); setInterval(() => { if (!document.hidden) pushLog(); }, 1500); }

  /* ───────── Cakes + lightbox ───────── */
  const CAKES = [
    'Pink roses in a chocolate lattice',
    'Rose garden with a piped heart',
    'Blue ombré ruffles',
    'Lilac & teal rosettes',
    'White-chocolate lattice',
    'Peach rosettes',
    'Rose wreath with a stencilled heart',
    'Lilac piping & sprinkled truffles',
    'Chocolate glaze & wafer crown',
  ].map((caption, i) => ({ caption, src: `cakes/cake-${String(i + 1).padStart(2, '0')}.jpg` }));
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbCap = $('#lb-cap');
  let lbIdx = 0;
  let lbReturn = null;
  const showCake = i => {
    lbIdx = (i + CAKES.length) % CAKES.length;
    lbImg.src = CAKES[lbIdx].src;
    lbImg.alt = CAKES[lbIdx].caption;
    lbCap.innerHTML = `${CAKES[lbIdx].caption}<span>${lbIdx + 1} / ${CAKES.length}</span>`;
    // Preload neighbours so arrowing through feels instant.
    [lbIdx + 1, lbIdx - 1].forEach(j => { new Image().src = CAKES[(j + CAKES.length) % CAKES.length].src; });
  };
  const openCake = i => {
    lbReturn = document.activeElement;
    showCake(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lb-close', lb).focus();
  };
  const closeCake = () => {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lbReturn) lbReturn.focus({ preventScroll: true });
  };
  $$('[data-cake]').forEach(b => b.addEventListener('click', () => openCake(+b.dataset.cake)));
  lb.addEventListener('click', e => {
    const action = e.target.closest('[data-lb]')?.dataset.lb;
    if (action === 'close' || e.target === lb) closeCake();
    else if (action === 'prev') showCake(lbIdx - 1);
    else if (action === 'next') showCake(lbIdx + 1);
  });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeCake();
    else if (e.key === 'ArrowRight') showCake(lbIdx + 1);
    else if (e.key === 'ArrowLeft') showCake(lbIdx - 1);
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) showCake(lbIdx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ───────── Terminal ───────── */
  const out = $('#term-out');
  const input = $('#term-in');
  const body = $('#term-body');
  const history = [];
  let histIdx = 0;

  const HELP = `<span class="h">Available commands</span>
  <span class="c">whoami</span>       who I am
  <span class="c">experience</span>   where I've worked and what I shipped
  <span class="c">projects</span>     AI systems I've built
  <span class="c">skills</span>       my toolbox
  <span class="c">education</span>    degree and coursework
  <span class="c">bake</span>         a cake I made, picked at random
  <span class="c">play</span>         open the arcade (try <span class="c">play snake</span>)
  <span class="c">contact</span>      how to reach me
  <span class="c">resume</span>       download the PDF
  <span class="c">theme</span>        toggle light / dark
  <span class="c">clear</span>        clear the screen`;

  const COMMANDS = {
    help: () => HELP,
    ls: args => (args[0] || '').replace(/\/$/, '') === 'cakes'
      ? CAKES.map((c, i) => `cake-${String(i + 1).padStart(2, '0')}.jpg  <span class="d">${c.caption}</span>`).join('\n') + `\n<span class="d">Try</span> <span class="c">bake</span> <span class="d">to see one.</span>`
      : `<span class="c">experience/</span>  <span class="c">projects/</span>  <span class="c">skills/</span>  <span class="c">education/</span>  <span class="c">cakes/</span>  <span class="c">arcade/</span>  contact.txt  Resume_AshitaBansal_2026.pdf`,
    play: args => {
      const GAMES = ['snake', 'runner', 'breakout', 'pong', 'flappy', 'stacker', 'blocks', '2048', 'memory', 'whack'];
      const g = (args[0] || '').toLowerCase();
      if (g && !GAMES.includes(g)) return `play: no game called ${escapeHtml(g)}. Games: ${GAMES.join(', ')}`;
      setTimeout(() => (location.href = `play.html${g ? '#' + g : ''}`), 500);
      return `<span class="p">loading arcade…</span> ${g ? `starting <span class="c">${g}</span>` : `10 games: ${GAMES.join(', ')}`}`;
    },
    bake: () => {
      const i = Math.floor(Math.random() * CAKES.length);
      return `<span class="p">preheating oven…</span> done ✓\n<img class="cake-thumb" src="cakes/cake-${String(i + 1).padStart(2, '0')}-sm.jpg" alt="${CAKES[i].caption}" data-term-cake="${i}"><span class="h">${CAKES[i].caption}</span>  <span class="d">(click to enlarge · run again for another)</span>`;
    },
    whoami: () => `<span class="h">Ashita Bansal</span>
Software Engineer, Backend &amp; Infrastructure @ JPMorgan Chase &amp; Co.
I build event-driven AWS data platforms, high-availability Java services
and RAG-powered AI tooling. <span class="d">B.Tech CSE, Punjab Engineering College '24.</span>`,
    experience: () => `<span class="h">JPMorgan Chase &amp; Co.</span>  Software Engineer, Backend &amp; Infrastructure  <span class="d">Aug 2024 — Present</span>
  <span class="p">▸</span> Moved on-prem ingestion to AWS Glue + Airflow + Kafka
  <span class="p">▸</span> Built an MCP server exposing live infra data for production support
  <span class="p">▸</span> Re-platformed a high-volume Query Service onto Spring MVC
  <span class="p">▸</span> Event-driven ETL: S3 → EventBridge → Lambda → Airflow → Iceberg
  <span class="p">▸</span> Blue/green deployment framework wired into CI/CD
  <span class="p">▸</span> Hands-off cert rotation with Lambda + Secrets Manager

<span class="h">JPMorgan Chase &amp; Co.</span>  Software Engineering Intern  <span class="d">Jan 2023 — Jun 2023</span>
  <span class="p">▸</span> Java / Spring Boot / React feature work
  <span class="p">▸</span> Java 8 → 17 migration and Maven upgrades
  <span class="p">▸</span> Hardened 30+ microservices against Raven/Fortify findings
  <span class="p">▸</span> Faster CI/CD pipelines`,
    projects: () => `<span class="h">Compliance &amp; Document Review Platform</span>
  RAG + LLMs that find and check contract clauses, with a full audit trail
  <span class="d">Python · FastAPI · PostgreSQL · Redis · Vector DB · OpenAI · Docker</span>

<span class="h">AI Financial Research &amp; Market Intelligence Agent</span>
  Semantic search + RAG over market data, filings, earnings and news, with cited answers
  <span class="d">Python · FastAPI · PostgreSQL · Vector DB · OpenAI · Docker</span>`,
    skills: () => `<span class="c">languages</span>   Java, Python, C++, JavaScript, SQL, Bash
<span class="c">backend</span>     Spring Boot, Spring MVC, FastAPI, REST, Microservices
<span class="c">cloud</span>       AWS (Glue, Lambda, S3, Athena, EventBridge, MSK, CloudWatch), Airflow, Docker, Redis
<span class="c">data/ai</span>     ETL, PostgreSQL, Iceberg, Vector DBs, RAG, LLMs, Embeddings, AI Agents
<span class="c">devops</span>      Jenkins, GitHub Actions, Spinnaker, Terraform, Blue-Green, Fortify`,
    education: () => `<span class="h">B.Tech, Computer Science &amp; Engineering</span>  <span class="d">June 2024</span>
Punjab Engineering College · Minor in Mathematics · GPA <span class="p">8.13/10</span>
<span class="d">AI · Machine Learning · Operating Systems · Networks</span>`,
    contact: () => `email     <a href="mailto:${EMAIL}">${EMAIL}</a>
linkedin  <a href="${LINKS.linkedin}" target="_blank" rel="noopener">linkedin.com/in/ashitabansal</a>
github    <a href="${LINKS.github}" target="_blank" rel="noopener">github.com/Ashita-Bansal</a>`,
    resume: () => { downloadResume(); return `<span class="p">↓</span> Downloading Resume_AshitaBansal_2026.pdf…`; },
    theme: () => `Switched to <span class="p">${toggleTheme()}</span> mode.`,
    clear: () => { out.innerHTML = ''; return null; },
    sudo: args => args.join(' ').toLowerCase().includes('hire')
      ? (setTimeout(() => (location.href = `mailto:${EMAIL}?subject=Let's%20talk`), 900),
         `<span class="p">[sudo]</span> permission granted ✓\nOpening a draft to ${EMAIL}…`)
      : `<span class="d">ashita is not in the sudoers file. Try</span> <span class="c">sudo hire ashita</span>`,
    'cat': args => args[0] && COMMANDS[args[0].replace(/\/|\.txt$/g, '')]
      ? COMMANDS[args[0].replace(/\/|\.txt$/g, '')]([])
      : `cat: ${escapeHtml(args[0] || '')}: try <span class="c">ls</span>`,
  };
  COMMANDS.cd = COMMANDS.cat;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function print(html) {
    const pre = document.createElement('pre');
    pre.innerHTML = html;
    out.appendChild(pre);
  }

  function run(raw, { focus = true } = {}) {
    const line = raw.trim();
    print(`<span class="p">ashita@portfolio</span>:~$ ${escapeHtml(line)}`);
    if (line) { history.push(line); histIdx = history.length; }
    const [cmd, ...args] = line.split(/\s+/);
    if (cmd) {
      const fn = COMMANDS[cmd.toLowerCase()];
      const result = fn ? fn(args) : `command not found: ${escapeHtml(cmd)}. Type <span class="c">help</span>.`;
      if (result) print(result);
    }
    body.scrollTop = body.scrollHeight;
    if (focus) input.focus({ preventScroll: true });
  }

  $('#term-form').addEventListener('submit', e => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && histIdx > 0) { input.value = history[--histIdx]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { histIdx = Math.min(histIdx + 1, history.length); input.value = history[histIdx] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const match = Object.keys(COMMANDS).find(c => c.startsWith(input.value.trim().toLowerCase()));
      if (match && input.value.trim()) input.value = match + ' ';
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  body.addEventListener('click', () => { if (!getSelection().toString()) input.focus({ preventScroll: true }); });
  $$('#term-hints button').forEach(b => b.addEventListener('click', () => run(b.dataset.cmd)));
  out.addEventListener('click', e => {
    const img = e.target.closest('[data-term-cake]');
    if (img) { e.stopPropagation(); openCake(+img.dataset.termCake); }
  });
  out.addEventListener('load', () => { body.scrollTop = body.scrollHeight; }, true);

  print(`<span class="d">Last login: ${new Date().toDateString()} on ttys001</span>
Welcome! Type <span class="c">help</span> to see what you can run, or tap a command below.`);

  function downloadResume() {
    const a = document.createElement('a');
    a.href = LINKS.resume;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ───────── Command palette ───────── */
  const palette = $('#palette');
  const pIn = $('#palette-in');
  const pList = $('#palette-list');
  const goTo = id => () => document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  const ACTIONS = [
    { label: 'Work experience', grp: 'Go to', run: goTo('work') },
    { label: 'Projects', grp: 'Go to', run: goTo('projects') },
    { label: 'Terminal', grp: 'Go to', run: () => { goTo('terminal')(); setTimeout(() => input.focus({ preventScroll: true }), 500); } },
    { label: 'Skills & education', grp: 'Go to', run: goTo('skills') },
    { label: 'Cakes I bake', grp: 'Go to', run: goTo('baking') },
    { label: 'Play a game (arcade)', grp: 'Go to', run: () => (location.href = 'play.html') },
    { label: 'Contact', grp: 'Go to', run: goTo('contact') },
    { label: 'Copy email address', grp: 'Action', run: copyEmail },
    { label: 'Send an email', grp: 'Action', run: () => (location.href = `mailto:${EMAIL}`) },
    { label: 'Download résumé (PDF)', grp: 'Action', run: downloadResume },
    { label: 'Toggle light / dark theme', grp: 'Action', run: () => toast(`Switched to ${toggleTheme()} mode`) },
    { label: 'Open LinkedIn', grp: 'Link', run: () => open(LINKS.linkedin, '_blank', 'noopener') },
    { label: 'Open GitHub', grp: 'Link', run: () => open(LINKS.github, '_blank', 'noopener') },
  ];
  let filtered = ACTIONS;
  let sel = 0;
  let lastFocus = null;

  const renderPalette = () => {
    const q = pIn.value.trim().toLowerCase();
    filtered = ACTIONS.filter(a => (a.label + ' ' + a.grp).toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(filtered.length - 1, 0));
    pList.innerHTML = filtered.length
      ? filtered.map((a, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}"><span class="label">${a.label}</span><span class="grp">${a.grp}</span></li>`).join('')
      : '<li class="empty">No matching commands</li>';
    const active = pList.querySelector('[aria-selected="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  };
  const openPalette = () => {
    lastFocus = document.activeElement;
    palette.hidden = false;
    pIn.value = '';
    sel = 0;
    renderPalette();
    pIn.focus();
  };
  const closePalette = () => {
    palette.hidden = true;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  const runSelected = i => {
    const action = filtered[i];
    if (!action) return;
    closePalette();
    action.run();
  };

  $('#palette-open').addEventListener('click', openPalette);
  palette.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closePalette();
    const li = e.target.closest('li[data-i]');
    if (li) runSelected(+li.dataset.i);
  });
  pList.addEventListener('pointermove', e => {
    const li = e.target.closest('li[data-i]');
    if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; renderPalette(); }
  });
  pIn.addEventListener('input', () => { sel = 0; renderPalette(); });
  pIn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(filtered.length, 1); renderPalette(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + filtered.length) % Math.max(filtered.length, 1); renderPalette(); e.preventDefault(); }
    else if (e.key === 'Enter') { runSelected(sel); e.preventDefault(); }
    else if (e.key === 'Tab') e.preventDefault();
  });
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      palette.hidden ? openPalette() : closePalette();
    } else if (e.key === 'Escape' && !palette.hidden && lb.hidden) {
      closePalette();
    }
  });
})();
