/* Rolo — intro animation (~27s).
   Everything is drawn by renderAt(t) from a single timeline, so it plays smoothly in the app
   and can also be rendered frame-by-frame to a video. */
'use strict';

const Intro = (() => {
  const DUR = 27000;
  const SCENES = { logo: [0, 3000], rolo: [3000, 7800], search: [7800, 11800], record: [11800, 16300], intake: [16300, 21300], today: [21300, 24800], end: [24800, DUR] };
  const CAPTIONS = {
    rolo: ['Flip through your Rolo', 'Scroll or drag to flip. Tap A–Z to jump.'],
    search: ['Search everything', 'Names, kids, pets, hobbies and notes.'],
    record: ['Everything, one tap away', 'Call, text or email. Rolo logs it for you.'],
    intake: ['Talk after the call', 'Quick intake files your notes where they belong.'],
    today: ['Start every day here', 'Follow-ups, birthdays and who’s going cold.']
  };
  const CARDS = [
    ['Sam', 'Alvarez', 'Owner · Alvarez Auto Body', 'A', '(918) 555-0125'],
    ['Hannah', 'Baker', 'Owner · Baker Street Bakery', 'B', '(918) 555-0164'],
    ['Tasha', 'Brooks', 'VP Operations · Prairie Fire Builders', 'B', '(918) 555-0190'],
    ['Olivia', 'Chen', 'HR Director · Lumen Health Partners', 'C', '(918) 555-0186'],
    ['Ray', 'Dawson', 'COO · Dawson Oil Field Services', 'D', '(580) 555-0149'],
    ['Megan', 'Ellis', 'Ellis Family', 'E', '(918) 555-0116'],
    ['Paul', 'Fischer', 'Plant Manager · Fischer Precision', 'F', '(918) 555-0127'],
    ['Ana', 'Garcia', 'Executive Director · Sunrise Senior Living', 'G', '(405) 555-0172']
  ];
  const SEARCH_Q = 'golf';
  const RESULTS = [['GM', '#8B5CF6', 'Grant Morgan', 'Golf (2 handicap), Fly fishing'], ['DN', '#4F6EE8', 'David Nguyen', 'Golf, Thunder basketball'], ['RD', '#4F6EE8', 'Ray Dawson', 'Golf, Hunting']];
  const SPOKEN = 'Unhappy with his broker. Wants a call back next week. Loves golf, and his favorite spot is STK.';
  const FILED = [['bell', 'Next step', 'Call back · Mon'], ['heart', 'Hobby', 'Golf'], ['utensils', 'Dinner spot', 'STK'], ['pin', 'Don’t forget', 'Unhappy with broker']];

  // ---------- math helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (x) => 1 - Math.pow(1 - x, 3);
  const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function sceneAlpha(t, [a, b], first, last) {
    const fin = first ? 1 : eOut(seg(t, a, a + 380));
    const fout = last ? 1 : 1 - seg(t, b - 320, b);
    return t < a || t > b ? 0 : Math.min(fin, fout);
  }

  let root = null, E = {}, raf = 0, start = 0, paused = false, pausedAt = 0, onDone = null, lastT = -1;

  function build() {
    const el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Rolo intro');
    el.innerHTML = `
      <div class="intro-stage" id="ix-stage">
        <div class="ix-top"><div class="ix-bar"><i id="ix-prog"></i></div><button class="ix-skip" id="ix-skip">Skip</button></div>

        <section class="ix-scene ix-logo" data-s="logo">
          <img id="ix-logo-icon" src="icons/icon-192.png" alt="">
          <div class="ix-word" id="ix-word">Rolo<span class="dot"></span></div>
          <div class="ix-tag" id="ix-tag">Remember everything about everyone.</div>
        </section>

        <section class="ix-scene" data-s="rolo">
          <div class="ix-ui">
            <div class="ix-wheel" id="ix-wheel">${CARDS.map((c, i) => `
              <div class="ix-card" data-i="${i}"><div class="face front">
                <div class="ix-name">${c[0]} <b>${c[1]}</b></div><div class="ix-role">${c[2]}</div><div class="ix-rule"></div>
                <div class="ix-line">${icon('phone')}${c[4]}</div><div class="ix-line">${icon('mail')}${c[0].toLowerCase()}@example.com</div>
              </div><div class="face back"></div><div class="ix-shade"></div></div>`).join('')}
              <div class="ix-rail"></div>
            </div>
            <div class="ix-az" id="ix-az">${'ABCDEFGHIJKLMN'.split('').map((l) => `<span data-l="${l}">${l}</span>`).join('')}</div>
          </div>
        </section>

        <section class="ix-scene" data-s="search">
          <div class="ix-ui ix-pad">
            <div class="ix-search">${icon('search')}<span id="ix-q"></span><i class="ix-caret" id="ix-caret"></i></div>
            <div class="ix-results">${RESULTS.map((r, i) => `<div class="ix-row" data-r="${i}"><span class="ix-av" style="background:${r[1]}">${r[0]}</span>
              <div><div class="ix-t1">${r[2]}</div><div class="ix-t2"><b>Hobby:</b> ${r[3].replace('Golf', '<mark>Golf</mark>')}</div></div></div>`).join('')}</div>
          </div>
        </section>

        <section class="ix-scene" data-s="record">
          <div class="ix-ui ix-pad">
            <div class="ix-hero"><span class="ix-av lg" style="background:#12A37A">MH</span><div><div class="ix-h1">Marcus Hale</div><div class="ix-t2">CFO · Bluestem Manufacturing</div><span class="ix-chip" style="background:#12A37A">Clients</span></div></div>
            <div class="ix-actions">${[['phone', 'Call'], ['message', 'Text'], ['mail', 'Email'], ['map', 'Map'], ['linkedin', 'LinkedIn']].map(([ic, l], i) => `<div class="ix-act ${i === 0 ? 'primary' : ''}" ${i === 0 ? 'id="ix-call"' : ''}>${icon(ic)}${l}</div>`).join('')}</div>
            <div class="ix-brief"><div class="ix-kicker">${icon('sparkle')}Before you call</div>
              <div class="ix-bl">${icon('users')}<span>Spouse <b>Dana</b> · <b>Caleb</b> (14), <b>Lily</b> (9)</span></div>
              <div class="ix-bl">${icon('heart')}<span>Bass fishing, OSU football</span></div>
              <div class="ix-bl">${icon('calendar')}<span><b>Birthday</b> in 4 days</span></div></div>
            <div class="ix-toast" id="ix-toast"><span>Call with Marcus logged</span><b>Add note</b></div>
          </div>
        </section>

        <section class="ix-scene" data-s="intake">
          <div class="ix-ui ix-pad">
            <div class="ix-mic-wrap"><div class="ix-mic" id="ix-mic">${icon('mic')}</div><div class="ix-micstate" id="ix-micstate">Listening…</div></div>
            <div class="ix-transcript" id="ix-tx"></div>
            <div class="ix-filed">${FILED.map(([ic, k, v], i) => `<div class="ix-file" data-f="${i}">${icon(ic)}<span class="k">${k}</span><span class="v">${v}</span>${icon('check', 'ok')}</div>`).join('')}</div>
          </div>
        </section>

        <section class="ix-scene" data-s="today">
          <div class="ix-ui ix-pad">
            <div class="ix-date">MONDAY, OCTOBER 12</div>
            <div class="ix-hello">Good morning.</div>
            <div class="ix-stats">${[['Overdue', 3, 'alert'], ['This week', 7, ''], ['Dates', 4, 'gold']].map(([l, n, c], i) => `<div class="ix-stat ${c}"><div class="n" data-n="${n}" data-st="${i}">0</div><div class="l">${l}</div></div>`).join('')}</div>
            <div class="ix-list">${[['Carmen Reyes', 'Drop off cookies for her office', '6d overdue', 'od'], ['Marcus Hale', 'Call back about his broker', 'Today', 'td'], ['Hollis Vance', 'Birthday · turns 78', 'Tomorrow', '']].map((r, i) => `<div class="ix-li" data-li="${i}"><span class="ix-check">${icon('check')}</span><div><div class="ix-t1">${r[0]}</div><div class="ix-t2">${r[1]}</div></div><span class="ix-due ${r[3]}">${r[2]}</span></div>`).join('')}</div>
          </div>
        </section>

        <section class="ix-scene ix-end" data-s="end">
          <img src="icons/icon-192.png" alt="">
          <div class="ix-endh">You’re ready.</div>
          <div class="ix-ends">Bring in your contacts, or explore with the sample cards.</div>
          <div class="ix-endbtns"><button class="btn primary" id="ix-import">${icon('upload')}Import my contacts</button><button class="btn" id="ix-explore">Explore Rolo</button></div>
          <button class="ix-replay" id="ix-replay">${icon('refer')}Watch again</button>
        </section>

        <div class="ix-cap" id="ix-cap"><div class="ix-cap1" id="ix-cap1"></div><div class="ix-cap2" id="ix-cap2"></div></div>
        <div class="ix-touch" id="ix-touch"></div>
      </div>`;
    document.body.appendChild(el);
    root = el;
    const q = (s) => el.querySelector(s);
    E = {
      stage: q('#ix-stage'), prog: q('#ix-prog'), scenes: Object.fromEntries([...el.querySelectorAll('[data-s]')].map((s) => [s.dataset.s, s])),
      logoIcon: q('#ix-logo-icon'), word: q('#ix-word'), tag: q('#ix-tag'),
      cards: [...el.querySelectorAll('.ix-card')], az: [...el.querySelectorAll('#ix-az span')],
      q: q('#ix-q'), caret: q('#ix-caret'), rows: [...el.querySelectorAll('.ix-row')],
      call: q('#ix-call'), toast: q('#ix-toast'),
      mic: q('#ix-mic'), micstate: q('#ix-micstate'), tx: q('#ix-tx'), files: [...el.querySelectorAll('.ix-file')],
      stats: [...el.querySelectorAll('.ix-stat .n')], lis: [...el.querySelectorAll('.ix-li')],
      endbtns: q('.ix-endbtns'), replay: q('#ix-replay'),
      cap: q('#ix-cap'), cap1: q('#ix-cap1'), cap2: q('#ix-cap2'), touch: q('#ix-touch')
    };
    q('#ix-skip').onclick = () => close();
    q('#ix-explore').onclick = () => close();
    q('#ix-import').onclick = () => { close(); location.hash = '#/import'; };
    q('#ix-replay').onclick = () => play(onDone);
    E.stage.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (lastT >= DUR) return;
      togglePause();
    });
    window.addEventListener('resize', fit);
    document.addEventListener('keydown', onKey);
    fit();
  }
  function onKey(e) { if (!root) return; if (e.key === 'Escape') close(); if (e.key === ' ') { e.preventDefault(); togglePause(); } }
  function fit() {
    if (!root) return;
    const s = Math.min(window.innerWidth / 360, window.innerHeight / 640);
    E.stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  function togglePause() {
    if (paused) { paused = false; start = performance.now() - pausedAt; loop(); root.classList.remove('paused'); }
    else { paused = true; pausedAt = performance.now() - start; cancelAnimationFrame(raf); root.classList.add('paused'); }
  }

  // ---------- the timeline ----------
  function touchAt(t, at, x, y) {
    const k = seg(t, at, at + 550);
    if (k <= 0 || k >= 1) return false;
    E.touch.style.opacity = String(0.55 * (1 - k));
    E.touch.style.transform = `translate(${x - 22}px, ${y - 22}px) scale(${0.6 + k * 0.9})`;
    return true;
  }

  function renderAt(t) {
    lastT = t;
    E.prog.style.transform = `scaleX(${clamp(t / DUR)})`;
    let touching = false;
    for (const [name, range] of Object.entries(SCENES)) {
      const a = sceneAlpha(t, range, name === 'logo', name === 'end');
      const sc = E.scenes[name];
      sc.style.opacity = a.toFixed(3);
      sc.style.visibility = a > 0.001 ? 'visible' : 'hidden';
      sc.style.transform = `translateY(${(1 - eOut(seg(t, range[0], range[0] + 450))) * 14}px)`;
    }
    // caption
    const capScene = Object.keys(CAPTIONS).find((k) => t >= SCENES[k][0] && t <= SCENES[k][1]);
    if (capScene) {
      const [a, b] = SCENES[capScene];
      if (E.cap1.textContent !== CAPTIONS[capScene][0]) { E.cap1.textContent = CAPTIONS[capScene][0]; E.cap2.textContent = CAPTIONS[capScene][1]; }
      const ca = Math.min(eOut(seg(t, a + 150, a + 600)), 1 - seg(t, b - 320, b));
      E.cap.style.opacity = ca.toFixed(3);
      E.cap.style.transform = `translateY(${(1 - eOut(seg(t, a + 150, a + 650))) * 10}px)`;
    } else E.cap.style.opacity = '0';

    // 1. logo
    { const lt = t; const k = eBack(seg(lt, 100, 900));
      E.logoIcon.style.transform = `scale(${0.6 + 0.4 * k})`; E.logoIcon.style.opacity = String(seg(lt, 100, 500));
      E.word.style.opacity = String(eOut(seg(lt, 600, 1200))); E.word.style.transform = `translateY(${(1 - eOut(seg(lt, 600, 1200))) * 12}px)`;
      E.tag.style.opacity = String(eOut(seg(lt, 1100, 1700))); }

    // 2. rolodex
    { const lt = t - SCENES.rolo[0];
      let pos = 0;
      for (let k = 0; k < 4; k++) pos += eInOut(seg(lt, 800 + k * 850, 1400 + k * 850));
      E.cards.forEach((el, i) => {
        const d = i - pos; let tr, z, op = 1, sh = 0;
        if (d < 0) { const a = Math.max(d, -1.25); tr = `translateZ(${-a * 24}px) rotateX(${a * 112}deg)`; z = 200 + Math.round(d * 10); op = d < -0.35 ? Math.max(0, 1 + (d + 0.35) * 2.5) : 1; sh = Math.min(0.3, -d * 0.4); }
        else { const dd = Math.min(d, 6); tr = `translateY(${-dd * 7}px) translateZ(${-dd * 18}px) rotateX(${dd * 4.5}deg)`; z = 100 - Math.round(d * 10); sh = Math.min(0.5, dd * 0.09); op = d > 5 ? Math.max(0, 6 - d) : 1; }
        el.style.transform = tr; el.style.zIndex = z;
        el.querySelectorAll('.face').forEach((f) => { f.style.opacity = op.toFixed(3); });
        el.querySelector('.ix-shade').style.opacity = sh.toFixed(3);
      });
      const cur = CARDS[Math.min(CARDS.length - 1, Math.round(pos))][3];
      E.az.forEach((s) => s.classList.toggle('cur', s.dataset.l === cur));
      // swipe hint finger
      if (t >= SCENES.rolo[0] && t < SCENES.rolo[1]) { for (let k = 0; k < 4; k++) touching = touchAt(t, SCENES.rolo[0] + 700 + k * 850, 170, 290) || touching; } }

    // 3. search
    { const lt = t - SCENES.search[0];
      const n = Math.floor(clamp((lt - 400) / 160, 0, SEARCH_Q.length));
      E.q.textContent = SEARCH_Q.slice(0, n);
      E.caret.style.opacity = (Math.floor(lt / 450) % 2 === 0 || n < SEARCH_Q.length) ? '1' : '0';
      E.rows.forEach((r, i) => { const k = eOut(seg(lt, 1200 + i * 180, 1650 + i * 180)); r.style.opacity = k.toFixed(3); r.style.transform = `translateY(${(1 - k) * 16}px)`; }); }

    // 4. record
    { const lt = t - SCENES.record[0];
      const tap = seg(lt, 1900, 2150);
      E.call.style.transform = `scale(${1 - 0.08 * Math.sin(Math.PI * tap)})`;
      if (t >= SCENES.record[0] && t < SCENES.record[1]) touching = touchAt(t, SCENES.record[0] + 1900, 47, 217) || touching;
      const k = eOut(seg(lt, 2350, 2800)) * (1 - seg(lt, 4000, 4300));
      E.toast.style.opacity = k.toFixed(3); E.toast.style.transform = `translate(-50%, ${(1 - k) * 18}px)`; }

    // 5. intake
    { const lt = t - SCENES.intake[0];
      const listening = lt > 500 && lt < 2700;
      if (t >= SCENES.intake[0] && t < SCENES.intake[1]) touching = touchAt(t, SCENES.intake[0] + 350, 180, 92) || touching;
      E.mic.classList.toggle('on', listening);
      E.mic.style.boxShadow = listening ? `0 0 0 ${8 + 8 * Math.abs(Math.sin(lt / 260))}px var(--accent-soft)` : '';
      E.micstate.textContent = lt < 2700 ? 'Listening…' : 'Sorted into the record';
      const chars = Math.floor(clamp((lt - 600) / 2000) * SPOKEN.length);
      E.tx.textContent = '“' + SPOKEN.slice(0, chars) + (chars < SPOKEN.length && lt > 600 ? '' : '') + (chars >= SPOKEN.length ? '”' : '');
      E.tx.style.opacity = lt > 550 ? '1' : '0';
      E.files.forEach((f, i) => { const k = eBack(seg(lt, 2850 + i * 260, 3300 + i * 260)); f.style.opacity = clamp(k).toFixed(3); f.style.transform = `translateX(${(1 - k) * 24}px)`; f.classList.toggle('done', lt > 3300 + i * 260); }); }

    // 6. today
    { const lt = t - SCENES.today[0];
      E.stats.forEach((s) => { const n = +s.dataset.n; s.textContent = String(Math.round(n * eOut(seg(lt, 450, 1300)))); });
      E.lis.forEach((li, i) => { const k = eOut(seg(lt, 900 + i * 180, 1350 + i * 180)); li.style.opacity = k.toFixed(3); li.style.transform = `translateY(${(1 - k) * 14}px)`; li.classList.toggle('checked', i === 1 && lt > 2500); });
      if (t >= SCENES.today[0] && t < SCENES.today[1]) touching = touchAt(t, SCENES.today[0] + 2300, 44, 313) || touching; }

    // 7. end
    { const lt = t - SCENES.end[0];
      const k = eOut(seg(lt, 500, 1000));
      E.endbtns.style.opacity = k.toFixed(3); E.endbtns.style.transform = `translateY(${(1 - k) * 8}px)`;
      E.replay.style.opacity = k.toFixed(3);
      root.classList.toggle('at-end', lt > 600); }

    if (!touching) E.touch.style.opacity = '0';
  }

  function loop() {
    cancelAnimationFrame(raf);
    const step = () => {
      const t = Math.min(DUR, performance.now() - start);
      renderAt(t);
      if (t < DUR && !paused) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function play(done) {
    onDone = done || onDone;
    if (!root) build();
    root.classList.remove('at-end', 'paused');
    paused = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => root.classList.add('show'));
    if (reduce) { renderAt(SCENES.end[0] + 800); return; } // jump to the end card
    start = performance.now();
    loop();
  }
  function close() {
    if (!root) return;
    cancelAnimationFrame(raf);
    root.classList.remove('show');
    const r = root; root = null;
    window.removeEventListener('resize', fit);
    document.removeEventListener('keydown', onKey);
    setTimeout(() => r.remove(), 300);
    if (onDone) { const f = onDone; onDone = null; f(); }
  }
  // For recording: show the intro frozen, then call renderAt(t) per frame.
  function freeze() { if (!root) build(); root.classList.add('show', 'recording'); cancelAnimationFrame(raf); paused = true; }
  return { play, close, renderAt, freeze, DUR };
})();
