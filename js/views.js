/* Rolo — Today, Rolodex/List and Search views */
'use strict';

const UI = { roloView: null, roloGroup: 'all', roloFrontId: null, roloQuery: '', rolodex: null };

/* ---------- shared bits ---------- */
function avatarHTML(c, size = 44) {
  return `<span class="avatar" style="--s:${size}px;--c:${contactColor(c)}">${c.photo ? `<img src="${c.photo}" alt="">` : esc(initials(c))}</span>`;
}
function warmthHTML(c, withLabel = true) {
  const w = warmth(c);
  const bars = [1, 2, 3, 4].map((n) => `<i class="${n <= w.level ? 'on' : ''}"></i>`).join('');
  const txt = w.key === 'new' ? 'No touches yet' : `${w.label} · ${w.days === 0 ? 'today' : w.days + 'd'}`;
  return `<span class="warmth ${w.key}" title="Keep-in-touch every ${w.cadence} days"><span class="bars">${bars}</span>${withLabel ? esc(txt) : ''}</span>`;
}
function groupTagsHTML(c) {
  return contactGroups(c).map((g) => `<span class="gtag"><i style="background:${colorHex(g.color)}"></i>${esc(g.name)}</span>`).join('');
}
function roleLine(c) {
  return [c.title, c.company && (c.firstName || c.lastName) ? c.company : ''].filter(Boolean).join(' · ');
}
function dueLabel(inDays) {
  if (inDays < 0) return `<span class="overdue">${-inDays}d overdue</span>`;
  if (inDays === 0) return `<span class="due-today">Due today</span>`;
  if (inDays === 1) return 'Tomorrow';
  return `In ${inDays}d`;
}
function quickActions(c) {
  const ph = primaryPhone(c), mob = mobilePhone(c) || ph;
  return `<span class="quick">
    ${ph ? `<a href="${telHref(ph)}" data-log="call" data-id="${c.id}" aria-label="Call ${esc(fullName(c))}">${icon('phone')}</a>` : ''}
    ${mob ? `<a href="${smsHref(mob)}" data-log="text" data-id="${c.id}" aria-label="Text ${esc(fullName(c))}">${icon('message')}</a>` : ''}
  </span>`;
}
function contactRow(c, { sub, side, quick = true } = {}) {
  // a div (not <a>) so the Call/Text links inside it stay valid HTML; app.js routes taps via data-href
  return `<div class="row tap" data-href="#/c/${c.id}" role="link" tabindex="0">
    ${avatarHTML(c)}
    <div class="main-col"><div class="t1">${esc(fullName(c))}</div><div class="t2">${sub ?? esc(roleLine(c) || primaryPhone(c) && fmtPhone(primaryPhone(c)) || '')}</div></div>
    ${side ? `<div class="side">${side}</div>` : ''}
    ${quick ? quickActions(c) : ''}
  </div>`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* =========================================================
   TODAY
   ========================================================= */
function renderToday(main) {
  const s = Store.settings;
  const fu = followUps();
  const overdue = fu.filter((f) => f.inDays < 0);
  const thisWeek = fu.filter((f) => f.inDays >= 0 && f.inDays <= 7);
  const dates = upcomingDates(30);
  const datesWeek = dates.filter((d) => d.inDays <= 7);
  const cold = Store.list().map((c) => ({ c, w: warmth(c) })).filter((x) => x.w.key === 'cold' || x.w.key === 'cooling')
    .sort((a, b) => b.w.ratio - a.w.ratio);
  const recent = Store.list().flatMap((c) => c.touches.map((t) => ({ c, t }))).sort((a, b) => b.t.date.localeCompare(a.t.date)).slice(0, 6);
  const now = new Date();
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const name = s.userName ? `, ${esc(s.userName.split(' ')[0])}` : '';

  const parts = [];
  if (overdue.length + thisWeek.length) parts.push(`<em>${overdue.length + thisWeek.length} follow-up${overdue.length + thisWeek.length === 1 ? '' : 's'}</em>`);
  if (datesWeek.length) parts.push(`<em>${datesWeek.length} date${datesWeek.length === 1 ? '' : 's'}</em> to remember`);
  const line = parts.length ? `You have ${parts.join(' and ')} this week.` : 'Your week is clear. A good time to warm someone up.';

  const backupDue = Store.contacts.size > 0 && (!s.lastBackup || daysBetween(new Date(s.lastBackup), now) > 14);
  const showInstall = !isStandalone() && !s.installDismissed;

  main.innerHTML = `<div class="fade-in">
    <div class="hello dots-bg">
      <div class="date">${esc(dateStr)}</div>
      <h1>${greeting()}${name}.<span class="line">${line}</span></h1>
    </div>

    <div class="stats ticks">
      <a class="stat ${overdue.length ? 'alert' : ''}" href="#fu"><div class="n">${overdue.length}</div><div class="l">Overdue</div></a>
      <a class="stat" href="#fu"><div class="n">${thisWeek.length}</div><div class="l">Due this week</div></a>
      <a class="stat gold" href="#dates"><div class="n">${datesWeek.length}</div><div class="l">Dates this week</div></a>
      <a class="stat" href="#cold"><div class="n">${cold.filter((x) => x.w.key === 'cold').length}</div><div class="l">Going cold</div></a>
    </div>

    ${showInstall ? `<div class="banner">${icon('smartphone')}<p><b>Add Rolo to your home screen</b> so it opens like an app and keeps your data safe.</p><button class="btn sm" data-act="install">How</button><button class="icon-btn" data-act="dismiss-install" aria-label="Dismiss">${icon('x')}</button></div>` : ''}
    ${backupDue && !showInstall ? `<div class="banner">${icon('download')}<p>Your contacts live on this device. ${s.lastBackup ? `Last backup ${relDay(s.lastBackup)}.` : 'You haven\'t made a backup yet.'}</p><button class="btn sm primary" data-act="backup">Back up</button></div>` : ''}

    <section class="section" id="fu">
      <div class="section-head"><h2>${icon('bell')}Follow-ups</h2><span class="count">${overdue.length + thisWeek.length}</span></div>
      <div class="panel" style="padding:4px 12px">
        ${overdue.concat(thisWeek).length ? `<div class="rows">${overdue.concat(thisWeek).map((f) => `
          <div class="row">
            <button class="check-btn" data-act="done" data-id="${f.contact.id}" aria-label="Mark done">${icon('check')}</button>
            <a href="#/c/${f.contact.id}" class="main-col" style="text-decoration:none">
              <div class="t1">${esc(fullName(f.contact))}</div>
              <div class="t2">${esc(f.text || 'Follow up')}</div>
            </a>
            <div class="side">${dueLabel(f.inDays)}</div>
          </div>`).join('')}</div>` : `<div class="empty">${icon('check')}Nothing due. Set a next step on any record.</div>`}
      </div>
    </section>

    <section class="section" id="dates">
      <div class="section-head"><h2>${icon('calendar')}Coming up</h2><span class="count">${dates.length}</span></div>
      <div class="panel" style="padding:4px 12px">
        ${dates.length ? `<div class="rows">${dates.slice(0, 10).map((d) => `
          <a class="row tap" href="#/c/${d.contact.id}">
            <div class="date-badge"><div class="m">${MONTHS[d.date.getMonth()]}</div><div class="d">${d.date.getDate()}</div></div>
            <div class="main-col"><div class="t1">${esc(fullName(d.contact))}</div>
              <div class="t2">${esc(d.label)}${d.turning ? ` · turns ${d.turning}` : ''}</div></div>
            <div class="side">${d.inDays === 0 ? '<span class="due-today">Today</span>' : esc(relDay(d.date))}</div>
          </a>`).join('')}</div>` : `<div class="empty">${icon('calendar')}No birthdays, anniversaries or renewals in the next 30 days.</div>`}
      </div>
    </section>

    <section class="section" id="cold">
      <div class="section-head"><h2>${icon('snow')}Going cold</h2><span class="count">${cold.length}</span></div>
      <div class="panel" style="padding:4px 12px">
        ${cold.length ? `<div class="rows">${cold.slice(0, 6).map(({ c, w }) => contactRow(c, {
          sub: `<span class="wdot ${w.key}"></span> ${w.days}d since last touch · every ${w.cadence}d`, quick: true
        })).join('')}</div>` : `<div class="empty">${icon('flame')}Everyone's warm. Nice work.</div>`}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>${icon('clock')}Recent activity</h2></div>
      <div class="panel" style="padding:4px 12px">
        ${recent.length ? `<div class="rows">${recent.map(({ c, t }) => contactRow(c, {
          sub: `<b>${esc(TOUCH_TYPES[t.type]?.label || 'Note')}</b> · ${esc(t.note || '')}`, side: esc(relDay(t.date)), quick: false
        })).join('')}</div>` : `<div class="empty">No activity yet.</div>`}
      </div>
    </section>
  </div>`;

  main.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'done') { e.preventDefault(); completeNextStep(Store.get(b.dataset.id)); }
    if (act === 'backup') exportBackup();
    if (act === 'install') showInstallHelp();
    if (act === 'dismiss-install') { Store.settings.installDismissed = true; await Store.saveSettings(); renderRoute(); }
  };
  $$('.stat', main).forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); const t = $(a.getAttribute('href'), main); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

async function completeNextStep(c) {
  if (!c || !c.nextStep.text && !c.nextStep.due) return;
  const prev = { ...c.nextStep };
  const touch = { id: uid('t'), type: 'note', date: new Date().toISOString(), note: `Done: ${prev.text || 'follow-up'}` };
  c.touches.unshift(touch);
  c.nextStep = { text: '', due: '' };
  await Store.save(c);
  toast('Marked done', {
    action: 'Undo', onAction: async () => {
      c.nextStep = prev; c.touches = c.touches.filter((t) => t.id !== touch.id); await Store.save(c);
    }
  });
}

/* =========================================================
   ROLODEX (wheel + list)
   ========================================================= */
function filteredContacts() {
  let list = Store.sorted();
  if (UI.roloGroup === 'fav') list = list.filter((c) => c.favorite);
  else if (UI.roloGroup !== 'all') list = list.filter((c) => c.groupIds.includes(UI.roloGroup));
  return list;
}

function renderRolo(container) {
  const view = UI.roloView || Store.settings.rolodexView || 'wheel';
  UI.roloView = view;
  const list = filteredContacts();
  const total = Store.contacts.size;
  container.innerHTML = `
    <div class="rolo-top">
      <div class="wordmark">Rolo<span class="dot"></span></div>
      <div class="seg" role="tablist" aria-label="View">
        <button class="${view === 'wheel' ? 'on' : ''}" data-view="wheel" aria-label="Rolodex view">${icon('wheel')}<span>Rolo</span></button>
        <button class="${view === 'list' ? 'on' : ''}" data-view="list" aria-label="List view">${icon('list')}<span>List</span></button>
      </div>
    </div>
    <label class="searchbox" style="margin-bottom:12px">${icon('search')}<input id="rolo-q" type="search" placeholder="Search names, kids, hobbies, notes…" value="${esc(UI.roloQuery)}" autocomplete="off" enterkeyhint="search"></label>
    <div class="chips scroll" id="rolo-groups">
      <button class="chip ${UI.roloGroup === 'all' ? 'on' : ''}" data-g="all">All <span class="muted">${total}</span></button>
      <button class="chip ${UI.roloGroup === 'fav' ? 'on' : ''}" data-g="fav">${icon('star')}Favorites</button>
      ${Store.groups.map((g) => `<button class="chip ${UI.roloGroup === g.id ? 'on' : ''}" data-g="${g.id}"><span class="sw" style="background:${colorHex(g.color)}"></span>${esc(g.name)}</button>`).join('')}
    </div>
    <div id="rolo-body" style="margin-top:12px"></div>`;

  const body = $('#rolo-body', container);
  const q = $('#rolo-q', container);

  const drawBody = () => {
    if (UI.roloQuery.trim()) { body.innerHTML = searchResultsHTML(UI.roloQuery); UI.rolodex = null; return; }
    if (!list.length) {
      body.innerHTML = `<div class="panel empty">${icon('cards')}<p>${total ? 'No contacts in this group yet.' : 'Your rolodex is empty.'}</p>
        <div class="row-btns" style="justify-content:center"><a class="btn primary" href="#/new">${icon('plus')}Add a contact</a>${total ? '' : `<a class="btn" href="#/import">${icon('upload')}Import</a>`}</div></div>`;
      UI.rolodex = null; return;
    }
    if (view === 'list') { body.innerHTML = listHTML(list); UI.rolodex = null; bindSwipe(body); return; }
    drawWheel(body, list);
  };
  drawBody();

  q.addEventListener('input', debounce(() => { UI.roloQuery = q.value; drawBody(); }, 120));
  $('#rolo-groups', container).onclick = (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    UI.roloGroup = b.dataset.g; UI.roloFrontId = null; renderRolo(container);
  };
  $$('[data-view]', container).forEach((b) => b.onclick = async () => {
    UI.roloView = b.dataset.view; Store.settings.rolodexView = UI.roloView; Store.saveSettings(); renderRolo(container);
  });
}

function drawWheel(body, list) {
  body.innerHTML = `
    <div class="rolo">
      <div class="rolo-stage" id="stage" aria-label="Rolodex. Scroll, drag or use arrow keys to flip. Enter opens the front card."><div class="rolo-rail"></div></div>
      <div class="az" id="az"></div>
    </div>
    <div class="rolo-meta"><span id="rolo-pos" class="tnum"></span><span class="hint">${icon('down')}Scroll or drag to flip · tap to open</span></div>
    <div class="rolo-front-actions" id="front-actions"></div>`;
  const stage = $('#stage', body), az = $('#az', body), meta = $('#rolo-pos', body), fa = $('#front-actions', body);
  const contactsOnly = list.length;
  const rd = new Rolodex(stage, {
    onOpen: (c) => { UI.roloFrontId = c.id; location.hash = `#/c/${c.id}`; },
    onFront: (it) => {
      if (!it) return;
      $$('button', az).forEach((b) => b.classList.toggle('cur', b.dataset.l === it.letter));
      if (it.type === 'contact') {
        UI.roloFrontId = it.contact.id;
        const idx = list.indexOf(it.contact) + 1;
        meta.textContent = `${idx} of ${contactsOnly}`;
        const c = it.contact, ph = primaryPhone(c), mob = mobilePhone(c) || ph, em = primaryEmail(c);
        fa.innerHTML = `
          ${ph ? `<a class="btn" href="${telHref(ph)}" data-log="call" data-id="${c.id}">${icon('phone')}Call</a>` : ''}
          ${mob ? `<a class="btn" href="${smsHref(mob)}" data-log="text" data-id="${c.id}">${icon('message')}Text</a>` : ''}
          ${!ph && em ? `<a class="btn" href="mailto:${esc(em)}" data-log="email" data-id="${c.id}">${icon('mail')}Email</a>` : ''}
          <a class="btn primary" href="#/c/${c.id}">Open ${icon('chevron')}</a>`;
      } else {
        meta.textContent = `${it.letter} · ${it.count} ${it.count === 1 ? 'card' : 'cards'}`;
        fa.innerHTML = '';
      }
    },
    onSettle: (it) => {
      if (isWide() && it && it.contact && currentRoute().name === 'record' && currentRoute().id !== it.contact.id) {
        history.replaceState(null, '', `#/c/${it.contact.id}`);
        renderRecordPane(it.contact.id);
      }
    }
  });
  UI.rolodex = rd;
  rd.setContacts(list, UI.roloFrontId);
  const letters = rd.letters();
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
  az.innerHTML = ALPHA.map((l) => `<button data-l="${l}" class="${letters[l] != null ? 'has' : ''}" ${letters[l] == null ? 'disabled' : ''} aria-label="Jump to ${l}">${l}</button>`).join('');
  rd.onFront(rd.frontItem());
  // tap or slide along the A–Z rail
  let sliding = false;
  const pickAt = (y) => {
    const el = document.elementFromPoint(az.getBoundingClientRect().left + 13, y);
    if (el && el.dataset && el.dataset.l && !el.disabled) rd.jumpToLetter(el.dataset.l);
  };
  az.addEventListener('pointerdown', (e) => { sliding = true; az.setPointerCapture(e.pointerId); pickAt(e.clientY); });
  az.addEventListener('pointermove', (e) => { if (sliding) pickAt(e.clientY); });
  az.addEventListener('pointerup', () => { sliding = false; });
  az.addEventListener('pointercancel', () => { sliding = false; });
}

function listHTML(list) {
  let out = '', letter = null;
  list.forEach((c) => {
    const l = letterOf(c);
    if (l !== letter) { if (letter) out += '</div>'; letter = l; out += `<div class="letter-head">${l}</div><div class="rows">`; }
    const w = warmth(c);
    out += `<div class="swipe" data-swipe="${c.id}"><button class="swipe-del" data-swipe-del="${c.id}" tabindex="-1">${icon('trash')}Delete</button>${contactRow(c, { sub: `<span class="wdot ${w.key}"></span> ${esc(roleLine(c) || fmtPhone(primaryPhone(c)) || primaryEmail(c))}` })}</div>`;
  });
  return out + '</div>';
}

/* =========================================================
   SEARCH
   ========================================================= */
function searchResultsHTML(q) {
  const res = searchContacts(q);
  if (!res.length) return `<div class="panel empty">${icon('search')}No matches for “${esc(q)}”.<br><small>Search looks through names, companies, family, pets, hobbies, tags and notes.</small></div>`;
  return `<div class="muted" style="font-size:12.5px;margin:0 2px 6px">${res.length} result${res.length === 1 ? '' : 's'}</div>
    <div class="panel" style="padding:4px 12px"><div class="rows">${res.map(({ contact: c, snippet }) => `
    <div class="row tap" data-href="#/c/${c.id}" role="link" tabindex="0">
      ${avatarHTML(c)}
      <div class="main-col">
        <div class="t1">${highlight(fullName(c), q)}</div>
        <div class="t2">${highlight(roleLine(c), q)}</div>
        ${snippet ? `<div class="snip"><b>${esc(snippet.label)}:</b> ${highlight(snippet.text, q)}</div>` : ''}
      </div>
      ${quickActions(c)}
    </div>`).join('')}</div></div>`;
}

function renderSearch(main, q0 = '') {
  // Build suggestion chips from the user's own data
  const freq = {};
  Store.list().forEach((c) => [...c.hobbies, ...c.tags].forEach((h) => { const k = h.toLowerCase(); freq[k] = (freq[k] || 0) + 1; }));
  const sugg = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
  const recent = Store.list().filter((c) => lastAnyTouch(c)).sort((a, b) => lastAnyTouch(b).date.localeCompare(lastAnyTouch(a).date)).slice(0, 5);

  main.innerHTML = `<div class="fade-in">
    <div class="searchbar"><label class="searchbox">${icon('search')}<input id="q" type="search" placeholder="Search everything…" value="${esc(q0)}" autocomplete="off" enterkeyhint="search" autofocus><kbd class="desk-only">⌘K</kbd></label></div>
    <div id="res"></div>
  </div>`;
  const input = $('#q', main), res = $('#res', main);
  const idle = () => `
    <div class="section" style="margin-top:6px"><div class="section-head"><h2>${icon('sparkle')}Try searching</h2></div>
      <div class="suggest">${[...new Set([Store.list().flatMap((c) => c.kids.map((k) => k.name)).find(Boolean), Store.list().flatMap((c) => c.pets.map((p) => p.name)).find(Boolean), ...sugg].filter(Boolean))].slice(0, 9).map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin-top:10px">Search reaches past names — try a kid's name, a pet, a hobby, a city, or something from your call notes.</p>
    </div>
    ${recent.length ? `<div class="section"><div class="section-head"><h2>${icon('clock')}Recently in touch</h2></div><div class="panel" style="padding:4px 12px"><div class="rows">${recent.map((c) => contactRow(c)).join('')}</div></div></div>` : ''}`;
  const draw = () => {
    const q = input.value.trim();
    res.innerHTML = q ? searchResultsHTML(q) : idle();
    history.replaceState(null, '', q ? `#/search?q=${encodeURIComponent(q)}` : '#/search');
  };
  draw();
  input.addEventListener('input', debounce(draw, 100));
  res.addEventListener('click', (e) => { const s = e.target.closest('[data-s]'); if (s) { input.value = s.dataset.s; draw(); } });
  setTimeout(() => input.focus(), 50);
}

/* ---------- Swipe right-to-left on a list row to reveal Delete ---------- */
function bindSwipe(root) {
  if (root._swipeBound) return;
  root._swipeBound = true;
  const OPEN = -96;
  let s = null, openRow = null, suppressUntil = 0;
  const setX = (row, x) => { row.style.transform = x ? `translateX(${x}px)` : ''; };
  const closeOpen = () => { if (openRow) { setX(openRow, 0); openRow = null; } };
  root.addEventListener('pointerdown', (e) => {
    const wrap = e.target.closest('.swipe'); if (!wrap || e.target.closest('.swipe-del')) return;
    const row = wrap.querySelector('.row');
    if (openRow && openRow !== row) closeOpen();
    s = { wrap, row, x0: e.clientX, y0: e.clientY, base: openRow === row ? OPEN : 0, dx: 0, active: false, id: e.pointerId };
  });
  root.addEventListener('pointermove', (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { s = null; return; } // vertical scroll wins
      if (Math.abs(dx) < 8) return;
      s.active = true; s.wrap.classList.add('dragging');
      try { s.wrap.setPointerCapture(e.pointerId); } catch {}
    }
    s.dx = dx;
    setX(s.row, Math.min(0, Math.max(OPEN * 1.6, s.base + dx)));
  });
  const end = (e) => {
    if (!s || e.pointerId !== s.id) return;
    const st = s; s = null;
    st.wrap.classList.remove('dragging');
    if (!st.active) return;
    const x = st.base + st.dx;
    if (x < OPEN / 2) { setX(st.row, OPEN); openRow = st.row; } else { setX(st.row, 0); if (openRow === st.row) openRow = null; }
    suppressUntil = Date.now() + 400; // swallow the click that follows a drag so the record doesn't open
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('click', (e) => {
    if (Date.now() < suppressUntil && !e.target.closest('[data-swipe-del]')) { e.preventDefault(); e.stopPropagation(); return; }
    const del = e.target.closest('[data-swipe-del]');
    if (del) { e.preventDefault(); const c = Store.get(del.dataset.swipeDel); if (c) deleteContact(c, { ask: false, stay: true }); openRow = null; return; }
    if (openRow && e.target.closest('.row') === openRow) { e.preventDefault(); e.stopPropagation(); closeOpen(); }
  }, true);
}
