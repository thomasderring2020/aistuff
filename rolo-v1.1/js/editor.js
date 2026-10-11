/* Rolo — add / edit contact form */
'use strict';

const PHONE_LABELS = ['Mobile', 'Work', 'Office', 'Home', 'Other'];
const EMAIL_LABELS = ['Work', 'Personal', 'Other'];
const CADENCES = [['', 'Group default'], ['7', 'Weekly'], ['14', 'Every 2 weeks'], ['30', 'Monthly'], ['45', 'Every 6 weeks'], ['60', 'Every 2 months'], ['90', 'Quarterly'], ['180', 'Twice a year'], ['365', 'Yearly']];

function opt(v, label, cur) { return `<option value="${esc(v)}" ${String(v) === String(cur ?? '') ? 'selected' : ''}>${esc(label)}</option>`; }

function mdInputHTML(name, val = '', withYear = false) {
  let y = '', m = '', d = '';
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val || ''), md = /^(\d{2})-(\d{2})$/.exec(val || '');
  if (full) { y = full[1]; m = full[2]; d = full[3]; } else if (md) { m = md[1]; d = md[2]; }
  return `<div class="md-input" data-md="${name}" ${withYear ? '' : 'style="grid-template-columns:1.3fr 1fr"'}>
    <select data-part="m" aria-label="Month">${opt('', 'Month', m)}${MONTHS.map((mm, i) => opt(String(i + 1).padStart(2, '0'), mm, m)).join('')}</select>
    <select data-part="d" aria-label="Day">${opt('', 'Day', d)}${Array.from({ length: 31 }, (_, i) => opt(String(i + 1).padStart(2, '0'), String(i + 1), d)).join('')}</select>
    ${withYear ? `<input data-part="y" inputmode="numeric" maxlength="4" placeholder="Year (opt.)" value="${esc(y)}" aria-label="Year (optional)">` : ''}
  </div>`;
}
function readMd(root) {
  if (!root) return '';
  const m = $('[data-part="m"]', root).value, d = $('[data-part="d"]', root).value;
  const yEl = $('[data-part="y"]', root); const y = yEl ? yEl.value.trim() : '';
  if (!m || !d) return '';
  return /^\d{4}$/.test(y) ? `${y}-${m}-${d}` : `${m}-${d}`;
}

const ROW_TPL = {
  phone: (p = {}) => `<div class="r"><select data-k="label">${PHONE_LABELS.map((l) => opt(l, l, p.label || 'Mobile')).join('')}</select><input data-k="value" type="tel" inputmode="tel" placeholder="Phone number" value="${esc(p.value || '')}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>`,
  email: (e = {}) => `<div class="r"><select data-k="label">${EMAIL_LABELS.map((l) => opt(l, l, e.label || 'Work')).join('')}</select><input data-k="value" type="email" inputmode="email" placeholder="name@company.com" value="${esc(e.value || '')}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>`,
  pinned: (v = '') => `<div class="r one"><input data-k="value" placeholder="e.g. Hates small talk — get to the point" value="${esc(v)}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>`,
  kid: (k = {}) => `<div class="block" data-row data-id="${esc(k.id || uid('k'))}" data-age0="${esc(k.age ?? '')}" data-asof="${esc(k.ageAsOf || '')}">
      <div class="r kid"><input data-k="name" placeholder="Name" value="${esc(k.name || '')}"><input data-k="age" inputmode="numeric" placeholder="Age" value="${esc(k.age != null && k.age !== '' ? kidAge(k) : '')}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>
      <div><small class="muted" style="font-size:12px">Birthday, only if it comes up naturally</small>${mdInputHTML('kidbday', k.birthday || '')}</div>
    </div>`,
  pet: (p = {}) => `<div class="r pet"><input data-k="name" placeholder="Pet's name" value="${esc(p.name || '')}"><input data-k="kind" placeholder="Kind (e.g. Lab)" value="${esc(p.kind || '')}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>`,
  date: (d = {}) => `<div class="block" data-row data-id="${esc(d.id || uid('d'))}">
      <div class="r date"><input data-k="label" placeholder="e.g. Policy renewal" value="${esc(d.label || '')}"><input data-k="date" type="date" value="${esc(/^\d{4}/.test(d.date || '') ? d.date : '')}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>
      <label class="toggle" style="font-size:13px"><input type="checkbox" data-k="recurring" ${d.recurring !== false ? 'checked' : ''}> Repeats every year</label>
    </div>`,
  custom: (f = {}) => `<div class="r pet"><input data-k="label" placeholder="Field (e.g. # Employees)" value="${esc(f.label || '')}"><input data-k="value" placeholder="Value" value="${esc(f.value || '')}"><button type="button" class="icon-btn" data-del aria-label="Remove">${icon('x')}</button></div>`
};

function repeatHTML(key, items, tpl, addLabel) {
  return `<div class="repeat" data-repeat="${key}">${items.map(tpl).join('')}</div>
    <button type="button" class="add-row" data-add="${key}">${icon('plus')}${esc(addLabel)}</button>`;
}

function renderEditor(main, id) {
  const isNew = !id;
  const c = isNew ? blankContact() : JSON.parse(JSON.stringify(Store.get(id) || null));
  if (!c) { location.hash = '#/rolo'; return; }
  if (isNew) {
    if (!c.phones.length) c.phones.push({ label: 'Mobile', value: '' });
    if (!c.emails.length) c.emails.push({ label: 'Work', value: '' });
    if (UI.roloGroup && UI.roloGroup.startsWith('g-')) c.groupIds = [UI.roloGroup];
  }
  const referrer = c.referredBy && Store.get(c.referredBy);
  const canPick = 'contacts' in navigator && 'ContactsManager' in window;

  main.innerHTML = `<form class="fade-in editor" novalidate>
    <div class="page-head">
      <button type="button" class="icon-btn" data-act="cancel" aria-label="Cancel">${icon('back')}</button>
      <h1>${isNew ? 'New contact' : 'Edit contact'}</h1>
    </div>
    ${isNew ? `<div class="chips" style="margin-bottom:6px">
      ${canPick ? `<button type="button" class="chip" data-act="phone-pick">${icon('smartphone')}From phone contacts</button>` : ''}
      <a class="chip" href="#/import">${icon('upload')}Import many</a></div>` : ''}

    <div class="form-section">
      <div class="photo-edit">
        <span class="avatar" id="ed-avatar" style="--s:72px;--c:${contactColor(c)}">${c.photo ? `<img src="${c.photo}" alt="">` : esc(initials(c))}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="photo">${icon('camera')}${c.photo ? 'Change' : 'Add'} photo</button>${c.photo ? `<button type="button" class="btn sm ghost" data-act="rm-photo">Remove</button>` : ''}</div>
      </div>
    </div>

    <div class="form-section"><h3>${icon('users')}Name</h3>
      <div class="grid2">
        <label class="field"><span>First name</span><input name="firstName" value="${esc(c.firstName)}" autocomplete="off" ${isNew ? 'autofocus' : ''}></label>
        <label class="field"><span>Last name</span><input name="lastName" value="${esc(c.lastName)}" autocomplete="off"></label>
      </div>
      <label class="field"><span>Goes by</span><input name="nickname" value="${esc(c.nickname)}" placeholder="Nickname (optional)"></label>
      <div class="grid2">
        <label class="field"><span>Company</span><input name="company" value="${esc(c.company)}"></label>
        <label class="field"><span>Title</span><input name="title" value="${esc(c.title)}"></label>
      </div>
    </div>

    <div class="form-section"><h3>${icon('tag')}Groups</h3>
      <div class="chips pick-chips" id="ed-groups">${Store.groups.map((g) => `<button type="button" class="chip ${c.groupIds.includes(g.id) ? 'on' : ''}" data-g="${g.id}" style="--c:${colorHex(g.color)}"><span class="sw" style="background:${colorHex(g.color)}"></span>${esc(g.name)}</button>`).join('')}
        <button type="button" class="chip" data-act="new-group">${icon('plus')}New group</button></div>
      <label class="toggle" style="margin-top:12px"><input type="checkbox" name="favorite" ${c.favorite ? 'checked' : ''}> ${icon('star')} Favorite</label>
    </div>

    <div class="form-section"><h3>${icon('phone')}Phone</h3>${repeatHTML('phone', c.phones, ROW_TPL.phone, 'Add phone')}</div>
    <div class="form-section"><h3>${icon('mail')}Email</h3>${repeatHTML('email', c.emails, ROW_TPL.email, 'Add email')}</div>

    <div class="form-section"><h3>${icon('map')}Address</h3>
      <label class="field"><input name="street" value="${esc(c.address.street)}" placeholder="Street"></label>
      <div class="grid3">
        <label class="field"><input name="city" value="${esc(c.address.city)}" placeholder="City"></label>
        <label class="field"><input name="state" value="${esc(c.address.state)}" placeholder="State" maxlength="20"></label>
        <label class="field"><input name="zip" value="${esc(c.address.zip)}" placeholder="ZIP" inputmode="numeric"></label>
      </div>
    </div>

    <div class="form-section"><h3>${icon('linkedin')}Online</h3>
      <label class="field"><span>LinkedIn</span><input name="linkedin" value="${esc(c.linkedin)}" placeholder="linkedin.com/in/username" inputmode="url"></label>
      <label class="field"><span>Website</span><input name="website" value="${esc(c.website)}" placeholder="company.com" inputmode="url"></label>
    </div>

    <div class="form-section"><h3>${icon('clock')}How to reach them</h3>
      <div class="grid2">
        <label class="field"><span>Prefers</span><select name="method">${opt('', 'No preference', c.prefs.method)}${opt('call', 'Call', c.prefs.method)}${opt('text', 'Text', c.prefs.method)}${opt('email', 'Email', c.prefs.method)}</select></label>
        <label class="field"><span>Keep in touch</span><select name="cadence">${CADENCES.map(([v, l]) => opt(v, l, c.cadenceDays || '')).join('')}</select></label>
      </div>
      <label class="field"><span>Best time to reach</span><input name="bestTime" value="${esc(c.prefs.bestTime)}" placeholder="e.g. Mornings before 9"></label>
      <label class="field"><span>Time zone</span><select name="timezone">${opt('', 'Auto (from state)', c.prefs.timezone)}${TIMEZONES.map(([v, l]) => opt(v, l, c.prefs.timezone)).join('')}</select></label>
    </div>

    <div class="form-section"><h3>${icon('pin')}Don't forget</h3>
      <small class="muted" style="display:block;margin:-4px 0 8px;font-size:12.5px">Up to 3 things you must remember every time.</small>
      ${repeatHTML('pinned', c.pinned, ROW_TPL.pinned, 'Add a pinned fact')}
    </div>

    <div class="form-section" id="family"><h3>${icon('heart')}Family</h3>
      <div class="grid2">
        <label class="field"><span>Spouse / partner</span><input name="spouseName" value="${esc(c.spouse.name)}" placeholder="Name"></label>
        <label class="field"><span>About them</span><input name="spouseNotes" value="${esc(c.spouse.notes)}" placeholder="e.g. Teaches 3rd grade"></label>
      </div>
      <label class="field"><span>Anniversary</span>${mdInputHTML('anniversary', c.anniversary, true)}</label>
      <div class="field"><span>Kids</span><small>Just enter their age — Rolo keeps it current as the years go by.</small></div>
      ${repeatHTML('kid', c.kids, ROW_TPL.kid, 'Add a kid')}
      <div class="field" style="margin-top:12px"><span>Pets</span></div>
      ${repeatHTML('pet', c.pets, ROW_TPL.pet, 'Add a pet')}
    </div>

    <div class="form-section"><h3>${icon('gift')}Personal</h3>
      <label class="field"><span>Hobbies & interests</span><input name="hobbies" value="${esc(c.hobbies.join(', '))}" placeholder="Golf, bass fishing, OSU football"><small>Separate with commas</small></label>
      <label class="field"><span>Favorite treat / small gift</span><input name="favoriteTreat" value="${esc(c.favoriteTreat)}" placeholder="e.g. Peanut brittle, Diet Coke, IPA"></label>
      <div class="grid2">
        <label class="field"><span>Favorite lunch spot</span><input name="favoriteLunch" value="${esc(c.favoriteLunch)}" placeholder="e.g. Taco place on Main"></label>
        <label class="field"><span>Favorite dinner spot</span><input name="favoriteDinner" value="${esc(c.favoriteDinner)}" placeholder="e.g. Steakhouse downtown"></label>
      </div>
      <label class="field"><span>Gift ideas</span><input name="giftIdeas" value="${esc(c.giftIdeas)}" placeholder="Things they'd love"></label>
    </div>

    <div class="form-section" id="dates"><h3>${icon('calendar')}Key dates</h3>
      <label class="field"><span>Birthday</span>${mdInputHTML('birthday', c.birthday, true)}</label>
      <div class="field"><span>Other dates</span><small>Renewals, work anniversaries, contract end dates…</small></div>
      ${repeatHTML('date', c.keyDates, ROW_TPL.date, 'Add a date')}
    </div>

    <div class="form-section"><h3>${icon('link')}Relationship</h3>
      <label class="field"><span>How you met</span><input name="metAt" value="${esc(c.metAt)}" placeholder="e.g. Chamber breakfast, 2023"></label>
      <div class="field"><span>Referred by</span>
        <div style="display:flex;gap:8px;align-items:center"><button type="button" class="btn sm" data-act="referrer" id="ed-ref" data-ref="${esc(c.referredBy || '')}">${referrer ? esc(fullName(referrer)) : 'Choose contact…'}</button>${referrer ? `<button type="button" class="btn sm ghost" data-act="clear-ref">Clear</button>` : ''}</div></div>
      <label class="field"><span>Tags</span><input name="tags" value="${esc(c.tags.join(', '))}" placeholder="decision maker, golf, Q1 renewal"><small>Separate with commas</small></label>
    </div>

    <div class="form-section"><h3>${icon('briefcase')}Custom fields</h3>${repeatHTML('custom', c.custom, ROW_TPL.custom, 'Add a field')}</div>

    ${isNew ? `<div class="form-section"><h3>${icon('note')}First conversation</h3>
      <label class="field"><textarea name="firstNote" placeholder="What did you talk about? Rolo will log it as your first touch."></textarea></label></div>` : ''}

    <div class="form-foot">
      <button type="button" class="btn" data-act="cancel">Cancel</button>
      <button type="submit" class="btn primary">${icon('check')}${isNew ? 'Add to Rolo' : 'Save'}</button>
    </div>
  </form>`;

  const form = $('form', main);
  const anchor = location.hash.split('#')[2];
  if (anchor) setTimeout(() => { const t = $('#' + anchor, form); t && t.scrollIntoView({ block: 'start' }); }, 30);

  let photo = c.photo;
  let referredBy = c.referredBy;

  form.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const key = add.dataset.add, box = $(`[data-repeat="${key}"]`, form);
      if (key === 'pinned' && box.children.length >= 3) { toast('Keep it to 3 — that’s what makes them stick'); return; }
      box.insertAdjacentHTML('beforeend', ROW_TPL[key]());
      const last = box.lastElementChild; const f = last.querySelector('input'); f && f.focus();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) { (del.closest('[data-row]') || del.closest('.r')).remove(); return; }
    const g = e.target.closest('[data-g]');
    if (g) { g.classList.toggle('on'); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'cancel') { if (history.length > 1) history.back(); else location.hash = '#/rolo'; }
    if (act === 'photo') {
      const f = await pickFile('image/*'); if (!f) return;
      photo = await compressImage(f, { max: 400, square: true, quality: 0.82 });
      $('#ed-avatar', form).innerHTML = `<img src="${photo}" alt="">`;
    }
    if (act === 'rm-photo') { photo = null; $('#ed-avatar', form).textContent = initials(c); a.remove(); }
    if (act === 'referrer') {
      const o = await pickContact(c.id, 'Who referred them?');
      if (o) { referredBy = o.id; a.textContent = fullName(o); }
    }
    if (act === 'clear-ref') { referredBy = null; $('#ed-ref', form).textContent = 'Choose contact…'; a.remove(); }
    if (act === 'new-group') {
      const name = await promptText('New group', 'e.g. Golf league, Board members'); if (!name) return;
      const used = Store.groups.map((x) => x.color);
      const color = (GROUP_COLORS.find((x) => !used.includes(x.key)) || GROUP_COLORS[Store.groups.length % GROUP_COLORS.length]).key;
      const ng = { id: uid('g-'), name, color, cadence: 30 };
      Store.groups.push(ng); await Store.saveGroups();
      a.insertAdjacentHTML('beforebegin', `<button type="button" class="chip on" data-g="${ng.id}" style="--c:${colorHex(color)}"><span class="sw" style="background:${colorHex(color)}"></span>${esc(name)}</button>`);
    }
    if (act === 'phone-pick') { const added = await pickFromPhone(); if (added && added.length === 1) location.hash = `#/c/${added[0].id}/edit`; else if (added && added.length) location.hash = '#/rolo'; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
    const out = { ...c };
    out.firstName = v('firstName'); out.lastName = v('lastName'); out.nickname = v('nickname');
    out.company = v('company'); out.title = v('title');
    if (!out.firstName && !out.lastName && !out.company) { toast('Add a name or company'); form.elements.firstName.focus(); return; }
    out.photo = photo; out.referredBy = referredBy;
    out.favorite = form.elements.favorite.checked;
    out.groupIds = $$('#ed-groups [data-g].on', form).map((b) => b.dataset.g);
    const rows = (key) => $$(`[data-repeat="${key}"] > *`, form);
    const val = (el, k) => { const x = el.querySelector(`[data-k="${k}"]`); return x ? (x.type === 'checkbox' ? x.checked : x.value.trim()) : ''; };
    out.phones = rows('phone').map((r) => ({ label: val(r, 'label'), value: val(r, 'value') })).filter((p) => p.value);
    out.emails = rows('email').map((r) => ({ label: val(r, 'label'), value: val(r, 'value') })).filter((p) => p.value);
    out.address = { street: v('street'), city: v('city'), state: v('state'), zip: v('zip') };
    out.linkedin = v('linkedin'); out.website = v('website');
    out.prefs = { method: v('method'), bestTime: v('bestTime'), timezone: v('timezone') };
    out.cadenceDays = v('cadence') ? Number(v('cadence')) : null;
    out.pinned = rows('pinned').map((r) => val(r, 'value')).filter(Boolean).slice(0, 3);
    out.spouse = { name: v('spouseName'), notes: v('spouseNotes') };
    out.anniversary = readMd($('[data-md="anniversary"]', form));
    out.kids = rows('kid').map((r) => {
      const ageStr = val(r, 'age');
      const age = ageStr === '' ? '' : Math.max(0, parseInt(ageStr, 10) || 0);
      const old = c.kids.find((k) => k.id === r.dataset.id);
      // Only reset the "as of" date when the displayed age was changed
      const unchanged = old && old.age !== '' && old.age != null && String(kidAge(old)) === String(age);
      return { id: r.dataset.id, name: val(r, 'name'), age: unchanged ? old.age : age, ageAsOf: unchanged ? old.ageAsOf : ymd(), birthday: readMd($('[data-md="kidbday"]', r)) };
    }).filter((k) => k.name || k.age !== '');
    out.pets = rows('pet').map((r) => ({ id: uid('p'), name: val(r, 'name'), kind: val(r, 'kind') })).filter((p) => p.name || p.kind);
    out.hobbies = v('hobbies').split(',').map((s) => s.trim()).filter(Boolean);
    out.favoriteTreat = v('favoriteTreat'); out.giftIdeas = v('giftIdeas');
    out.favoriteLunch = v('favoriteLunch'); out.favoriteDinner = v('favoriteDinner');
    out.birthday = readMd($('[data-md="birthday"]', form));
    out.keyDates = rows('date').map((r) => ({ id: r.dataset.id, label: val(r, 'label'), date: val(r, 'date'), recurring: val(r, 'recurring') })).filter((d) => d.date);
    out.metAt = v('metAt');
    out.tags = v('tags').split(',').map((s) => s.trim()).filter(Boolean);
    out.custom = rows('custom').map((r) => ({ id: uid('f'), label: val(r, 'label'), value: val(r, 'value') })).filter((f) => f.label || f.value);
    if (isNew && v('firstNote')) out.touches = [{ id: uid('t'), type: 'meeting', date: new Date().toISOString(), note: v('firstNote') }];

    if (isNew) {
      const dup = findDuplicate(out);
      if (dup && !(await confirmDialog(`${fullName(dup)} looks like the same person. Add anyway?`, { ok: 'Add anyway' }))) return;
    }
    const saved = await Store.save(out);
    UI.roloFrontId = saved.id;
    toast(isNew ? `${fullName(saved)} added` : 'Saved');
    history.replaceState(null, '', `#/c/${saved.id}`);
    renderRoute();
  });
}
