/* Rolo — app shell, router and boot */
'use strict';

const wideMQ = window.matchMedia('(min-width: 960px)');
const isWide = () => wideMQ.matches;

function currentRoute() {
  const raw = (location.hash.slice(1) || '/today').split('#')[0];
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const p = path.split('/').filter(Boolean);
  if (p[0] === 'c' && p[1] && p[2] === 'edit') return { name: 'edit', id: p[1] };
  if (p[0] === 'c' && p[1]) return { name: 'record', id: p[1] };
  if (['today', 'rolo', 'search', 'new', 'settings', 'import'].includes(p[0])) return { name: p[0], q: params.get('q') || '' };
  return { name: 'today' };
}

function renderNav(active) {
  const tab = (key, href, ic, label) => `<a href="${href}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`;
  $('#nav').innerHTML = `
    <a class="brand" href="#/today" aria-label="Rolo home"><img src="icons/icon-192.png" alt=""></a>
    ${tab('today', '#/today', 'today', 'Today')}
    ${tab('rolo', '#/rolo', 'cards', 'Rolo')}
    <a href="#/new" class="nav-add" aria-label="Add contact"><span class="fab">${icon('plus')}</span><span class="lbl sr-only">Add</span></a>
    ${tab('search', '#/search', 'search', 'Search')}
    ${tab('settings', '#/settings', 'settings', 'Settings')}`;
}

let lastRouteKey = '';
function renderRoute() {
  const r = currentRoute();
  const main = $('#main');
  const navKey = r.name === 'record' || r.name === 'edit' ? 'rolo' : r.name === 'new' ? '' : r.name === 'import' ? 'settings' : r.name;
  renderNav(navKey);
  const key = r.name + (r.id || '');
  const changed = key !== lastRouteKey;
  lastRouteKey = key;
  main.onclick = null;

  // Desktop: rolodex on the left, record on the right
  if (isWide() && (r.name === 'rolo' || r.name === 'record')) {
    main.className = 'main split-mode';
    let split = $('.split', main);
    if (!split) {
      main.innerHTML = `<div class="split"><div class="pane-left" id="pane-left"></div><div class="pane-right" id="pane-right"></div></div>`;
      split = $('.split', main);
      if (r.name === 'record') UI.roloFrontId = r.id;
      renderRolo($('#pane-left'));
    } else if (r.name === 'record' && UI.rolodex && r.id !== UI.roloFrontId) {
      UI.rolodex.jumpToId(r.id);
    }
    if (r.name === 'record') renderRecordPane(r.id);
    else {
      const front = UI.rolodex && UI.rolodex.frontItem();
      if (front && front.contact) { history.replaceState(null, '', `#/c/${front.contact.id}`); renderRecordPane(front.contact.id); }
      else $('#pane-right').innerHTML = `<div class="pane-empty"><div>${icon('cards')}<p>Pick a card to see the details.</p></div></div>`;
    }
    return;
  }

  main.className = 'main';
  switch (r.name) {
    case 'today': renderToday(main); break;
    case 'rolo': renderRolo(main); break;
    case 'search': renderSearch(main, r.q); break;
    case 'record': UI.roloFrontId = r.id; renderRecord(main, r.id); break;
    case 'edit': renderEditor(main, r.id); break;
    case 'new': renderEditor(main, null); break;
    case 'settings': renderSettings(main); break;
    case 'import': renderImport(main); break;
  }
  if (changed) window.scrollTo(0, 0);
}

function renderRecordPane(id) {
  const pane = $('#pane-right');
  if (!pane) return;
  UI.roloFrontId = id;
  renderRecord(pane, id);
  pane.scrollTop = 0;
}

/* Re-render when data changes (but never under someone who is typing in a form) */
function onStoreChange() {
  const r = currentRoute();
  if (r.name === 'edit' || r.name === 'new') return;
  if (isWide() && (r.name === 'rolo' || r.name === 'record')) {
    const left = $('#pane-left');
    if (left) {
      const scroll = left.scrollTop;
      renderRolo(left);
      left.scrollTop = scroll;
    }
    if (r.name === 'record') {
      const pane = $('#pane-right'); const st = pane ? pane.scrollTop : 0;
      renderRecordPane(r.id); if (pane) pane.scrollTop = st;
    }
    return;
  }
  const y = window.scrollY;
  renderRoute();
  window.scrollTo(0, y);
}

/* ---------- "Log this call?" after tapping Call / Text / Email ---------- */
let pendingLog = null;
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-log]');
  if (!a) return;
  if (a.classList.contains('off') || a.getAttribute('href') === '#') { e.preventDefault(); return; }
  const c = Store.get(a.dataset.id); if (!c) return;
  const type = a.dataset.log;
  pendingLog = { id: c.id, type, at: Date.now(), hiddenAt: null };
  const verb = { call: 'call', text: 'text', email: 'email' }[type];
  setTimeout(() => {
    if (!pendingLog || pendingLog.id !== c.id) return;
    toast(`Log this ${verb} with ${c.firstName || fullName(c)}?`, { action: 'Log it', duration: 12000, onAction: () => { pendingLog = null; openLogSheet(c, type); } });
  }, 900);
}, true);

let hiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); if (pendingLog) pendingLog.hiddenAt = hiddenAt; return; }
  // back from a call/text: offer to log it right away
  if (pendingLog && pendingLog.hiddenAt && Date.now() - pendingLog.hiddenAt > 6000 && Date.now() - pendingLog.at < 45 * 60000) {
    const c = Store.get(pendingLog.id); const t = pendingLog.type; pendingLog = null;
    if (c) setTimeout(() => openLogSheet(c, t, { auto: true }), 350);
  }
  const s = Store.settings;
  if (s.pinHash && hiddenAt && Date.now() - hiddenAt > (s.lockAfterMin || 5) * 60000) requireUnlock();
});

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); location.hash = '#/search'; }
  if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); location.hash = '#/search'; }
});

/* ---------- Boot ---------- */
async function boot() {
  try {
    await Store.load();
  } catch (err) {
    console.error(err);
    $('#main').innerHTML = `<div class="panel empty" style="margin-top:40px">Rolo couldn't open its storage. If you're in a private window, try a normal one.</div>`;
    return;
  }
  applyTheme();
  if (Store.settings.pinHash) requireUnlock();

  if (!Store.settings.seeded) {
    Store.settings.seeded = true;
    if (Store.contacts.size === 0) {
      await Store.saveMany(buildSampleContacts());
      setTimeout(() => toast('Loaded 25 sample contacts to explore — erase them anytime in Settings', { duration: 6000 }), 800);
    }
    await Store.saveSettings();
  }

  Store.on((what) => { if (what === 'contacts' || what === 'groups') onStoreChange(); });
  window.addEventListener('hashchange', renderRoute);
  wideMQ.addEventListener('change', () => { lastRouteKey = ''; $('#main').innerHTML = ''; renderRoute(); });
  // refresh relative times / local clocks once a minute on Today & records
  setInterval(() => { const r = currentRoute().name; if ((r === 'today') && !document.hidden && !sheetStack.length) onStoreChange(); }, 60000);
  renderRoute();

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
