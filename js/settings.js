/* Rolo — settings, groups, themes, passcode lock, install */
'use strict';

const THEMES = [
  { key: 'ledger', name: 'Midnight Ledger', bg: '#131b30', paper: '#f5eedd', accent: '#d6b46c' },
  { key: 'desk', name: 'Executive Desk', bg: '#1d1611', paper: '#f4e9d2', accent: '#8c2f39' },
  { key: 'forest', name: 'Forest & Paper', bg: '#111e18', paper: '#f2eee3', accent: '#c98552' }
];

const ROADMAP = [
  ['camera', 'Business card scanning', 'Snap a card, Rolo fills in the contact.'],
  ['bell', 'Voice memos', 'Talk through the call on the drive home instead of typing.'],
  ['note', 'Transcript summaries', 'Drop in a call transcript, get notes and next steps.'],
  ['sparkle', 'Connect your AI', 'Use the assistant you already pay for to summarize.'],
  ['lock', 'Accounts & sync', 'Sign in and see your Rolo on every device.']
];

function applyTheme() {
  const t = Store.settings.theme || 'ledger';
  document.documentElement.dataset.theme = t;
  const tc = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
  const m = $('meta[name="theme-color"]'); if (m && tc) m.content = tc;
}

function renderSettings(main) {
  const s = Store.settings;
  const counts = {}; Store.list().forEach((c) => c.groupIds.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
  main.innerHTML = `<div class="fade-in">
    <div class="page-head"><div style="flex:1"><h1>Settings</h1><div class="sub">${Store.contacts.size} contacts · stored on this device</div></div></div>

    <section class="section"><div class="section-head"><h2>${icon('users')}You</h2></div>
      <div class="panel"><label class="field" style="margin:0"><span>Your first name</span><input id="st-name" value="${esc(s.userName)}" placeholder="For your morning greeting"></label></div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('palette')}Look</h2></div>
      <div class="theme-pick">${THEMES.map((t) => `<button class="theme-opt ${s.theme === t.key ? 'on' : ''}" data-pick-theme="${t.key}">
        <div class="swatch" style="background:${t.bg}"><b style="background:${t.accent}"></b><i style="background:${t.paper}"></i></div><div class="nm">${t.name}</div></button>`).join('')}</div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('tag')}Groups</h2><button class="link-btn" data-act="add-group">+ New group</button></div>
      <div class="panel" style="padding:4px 14px">${Store.groups.map((g) => `<button class="group-row" data-group="${g.id}" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left">
        <span class="sw" style="background:${colorHex(g.color)}"></span><span class="nm">${esc(g.name)}<small>${counts[g.id] || 0} contacts · check in every ${g.cadence || s.defaultCadence} days</small></span>${icon('chevron')}</button>`).join('') || '<div class="empty">No groups yet.</div>'}</div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('flame')}Keep in touch</h2></div>
      <div class="panel"><label class="field" style="margin:0"><span>Default cadence (contacts without a group)</span>
        <select id="st-cad">${CADENCES.slice(1).map(([v, l]) => opt(v, l, s.defaultCadence)).join('')}</select>
        <small>Warmth fades as time passes without a call, text, email or meeting.</small></label></div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('lock')}Privacy</h2></div>
      <div class="menu-list settings-list">
        <button class="menu-item" data-act="pin">${icon('lock')}<span class="tx"><b>${s.pinHash ? 'Change passcode' : 'Set a passcode'}</b><small>${s.pinHash ? 'Rolo locks after ' + s.lockAfterMin + ' min away' : 'Lock Rolo with a 4-digit code'}</small></span>${icon('chevron')}</button>
        ${s.pinHash ? `<button class="menu-item" data-act="rm-pin">${icon('x')}<span class="tx"><b>Remove passcode</b></span></button>` : ''}
      </div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('cards')}Data</h2></div>
      <div class="menu-list settings-list">
        <a class="menu-item" href="#/import">${icon('upload')}<span class="tx"><b>Import & export</b><small>Phone contacts, Excel/CSV, backups</small></span>${icon('chevron')}</a>
        <button class="menu-item" data-act="install">${icon('smartphone')}<span class="tx"><b>Install Rolo on your phone</b><small>${isStandalone() ? 'Installed ✓' : 'Add to home screen'}</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-act="sample">${icon('sparkle')}<span class="tx"><b>Load sample contacts</b><small>25 made-up people to explore with</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-act="clear" style="color:var(--danger)">${icon('trash')}<span class="tx"><b>Erase all contacts</b><small>Back up first — this can't be undone</small></span></button>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('sparkle')}Coming soon</h2></div>
      <div class="panel" style="padding:6px 14px">${ROADMAP.map(([i, t, d]) => `<div class="row" style="min-height:0">${`<span class="tl-ic">${icon(i)}</span>`}<div class="main-col"><div class="t1">${t}</div><div class="t2" style="white-space:normal">${d}</div></div></div>`).join('')}</div>
    </section>

    <p class="ver">Rolo prototype · v1.0 · Your contacts never leave this device.</p>
  </div>`;

  $('#st-name', main).addEventListener('change', async (e) => { Store.settings.userName = e.target.value.trim(); await Store.saveSettings(); toast('Saved'); });
  $('#st-cad', main).addEventListener('change', async (e) => { Store.settings.defaultCadence = +e.target.value; await Store.saveSettings(); toast('Saved'); });
  main.onclick = async (e) => {
    const th = e.target.closest('[data-pick-theme]');
    if (th) { Store.settings.theme = th.dataset.pickTheme; applyTheme(); await Store.saveSettings(); if (currentRoute().name === 'settings') renderSettings(main); return; }
    const g = e.target.closest('[data-group]');
    if (g) { openGroupSheet(Store.group(g.dataset.group)); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    switch (a.dataset.act) {
      case 'add-group': openGroupSheet(null); break;
      case 'pin': setPinFlow(); break;
      case 'rm-pin': if (await confirmDialog('Remove your passcode?', { ok: 'Remove' })) { Store.settings.pinHash = null; await Store.saveSettings(); toast('Passcode removed'); } break;
      case 'install': showInstallHelp(); break;
      case 'sample': {
        if (!(await confirmDialog('Add 25 sample contacts? Your own contacts stay as they are.', { ok: 'Add samples' }))) return;
        DEFAULT_GROUPS.forEach((dg) => { if (!Store.group(dg.id)) Store.groups.push({ ...dg }); });
        await Store.saveGroups();
        await Store.saveMany(buildSampleContacts()); toast('Sample contacts added'); location.hash = '#/rolo'; break;
      }
      case 'clear':
        if (!(await confirmDialog(`Erase all ${Store.contacts.size} contacts from this device? Make a backup first if you might want them.`, { ok: 'Erase everything', danger: true }))) return;
        await Store.clearAll(); UI.roloFrontId = null; toast('All contacts erased'); break;
    }
  };
}

function openGroupSheet(g) {
  const isNew = !g;
  const used = Store.groups.map((x) => x.color);
  g = g ? { ...g } : { id: uid('g-'), name: '', color: (GROUP_COLORS.find((x) => !used.includes(x.key)) || GROUP_COLORS[0]).key, cadence: 30 };
  const s = openSheet(`
    <label class="field"><span>Name</span><input id="gr-name" value="${esc(g.name)}" placeholder="e.g. Golf league" autofocus></label>
    <div class="field"><span>Tab color</span><div class="color-pick">${GROUP_COLORS.map((c) => `<button data-c="${c.key}" class="${g.color === c.key ? 'on' : ''}" style="background:${c.hex}" aria-label="${c.name}"></button>`).join('')}</div></div>
    <label class="field"><span>Check in every</span><select id="gr-cad">${CADENCES.slice(1).map(([v, l]) => opt(v, l, g.cadence)).join('')}</select></label>
    <div class="row-btns">${isNew ? '<button class="btn ghost" data-sheet-close>Cancel</button>' : '<button class="btn danger" id="gr-del">Delete</button>'}<button class="btn primary" id="gr-save">Save</button></div>`,
    { title: isNew ? 'New group' : 'Edit group' });
  $('.color-pick', s.el).onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; g.color = b.dataset.c; $$('.color-pick button', s.el).forEach((x) => x.classList.toggle('on', x === b)); };
  $('#gr-save', s.el).onclick = async () => {
    g.name = $('#gr-name', s.el).value.trim(); if (!g.name) { toast('Give it a name'); return; }
    g.cadence = +$('#gr-cad', s.el).value;
    const i = Store.groups.findIndex((x) => x.id === g.id);
    if (i >= 0) Store.groups[i] = g; else Store.groups.push(g);
    await Store.saveGroups(); s.close(); renderRoute();
  };
  const del = $('#gr-del', s.el);
  if (del) del.onclick = async () => {
    if (!(await confirmDialog(`Delete the “${g.name}” group? Contacts stay; they just leave the group.`, { ok: 'Delete group', danger: true }))) return;
    Store.groups = Store.groups.filter((x) => x.id !== g.id);
    const touched = Store.list().filter((c) => c.groupIds.includes(g.id));
    touched.forEach((c) => { c.groupIds = c.groupIds.filter((x) => x !== g.id); });
    await Store.saveGroups(); if (touched.length) await Store.saveMany(touched);
    if (UI.roloGroup === g.id) UI.roloGroup = 'all';
    s.close(); renderRoute();
  };
}

/* ---------------- Install ---------------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
async function showInstallHelp() {
  if (deferredInstall) { deferredInstall.prompt(); const r = await deferredInstall.userChoice; deferredInstall = null; if (r.outcome === 'accepted') toast('Rolo installed'); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openSheet(ios ? `
    <ol class="steps"><li>Open Rolo in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Open Rolo from your home screen from now on.</li></ol>
    <p class="muted" style="font-size:13px;margin-top:14px">Why it matters: Safari can clear website data you haven't opened in a while. Installed apps keep it.</p>
    <div class="row-btns"><button class="btn primary" data-sheet-close>Got it</button></div>` : `
    <ol class="steps"><li>Open your browser menu (⋮).</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Open Rolo from your home screen.</li></ol>
    <div class="row-btns"><button class="btn primary" data-sheet-close>Got it</button></div>`, { title: 'Install Rolo' });
}

/* ---------------- Passcode lock ----------------
   A privacy screen, not encryption: it keeps casual eyes out of Rolo. */
function pinPad(title, sub, verify = async () => true, cancellable = true) {
  return new Promise((resolve) => {
    const root = $('#lock-root');
    let code = '', busy = false;
    root.innerHTML = `<div class="lock"><div class="lock-inner">
      <img src="icons/icon-192.png" alt="">
      <h1>${esc(title)}</h1><p class="muted" style="margin-top:6px">${esc(sub || '')}</p>
      <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
      <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}
        <button class="blank"></button><button data-n="0">0</button><button class="icon" data-n="del" aria-label="Delete">${icon('back')}</button></div>
      ${cancellable ? '<button class="link-btn" data-cancel style="margin-top:18px">Cancel</button>' : ''}
    </div></div>`;
    const dots = $$('.pin-dots i', root);
    const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
    const finish = (val) => { document.removeEventListener('keydown', onKey); root.innerHTML = ''; resolve(val); };
    const press = async (n) => {
      if (busy) return;
      if (n === 'del') code = code.slice(0, -1);
      else if (code.length < 4) code += n;
      draw();
      if (code.length === 4) {
        busy = true;
        const ok = await verify(code);
        if (ok) { setTimeout(() => finish(code), 100); return; }
        const pd = $('.pin-dots', root); pd.classList.add('shake');
        setTimeout(() => { pd.classList.remove('shake'); code = ''; draw(); busy = false; }, 400);
      }
    };
    const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('del'); };
    document.addEventListener('keydown', onKey);
    root.onclick = (e) => {
      const b = e.target.closest('[data-n]'); if (b) press(b.dataset.n);
      if (e.target.closest('[data-cancel]')) finish(null);
    };
  });
}

async function setPinFlow() {
  const a = await pinPad('Set a passcode', 'Choose 4 digits'); if (!a) return;
  const b = await pinPad('Confirm passcode', 'Enter it again', async (code) => code === a); if (!b) return;
  const salt = uid();
  Store.settings.pinSalt = salt; Store.settings.pinHash = await sha256(salt + a);
  await Store.saveSettings(); toast('Passcode set'); renderRoute();
}
let locked = false;
async function requireUnlock() {
  if (!Store.settings.pinHash || locked) return;
  locked = true;
  await pinPad('Enter passcode', 'Rolo is locked', async (code) => (await sha256(Store.settings.pinSalt + code)) === Store.settings.pinHash, false);
  locked = false;
}
