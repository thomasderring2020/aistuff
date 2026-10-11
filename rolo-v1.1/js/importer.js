/* Rolo — import (phone, vCard, CSV, Excel), export and backup */
'use strict';

/* ---------------- Parsers ---------------- */
function parseVCF(text) {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const qp = (s) => s.replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const unesc = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  return cards.map((raw) => {
    const c = blankContact();
    raw.split('\n').forEach((line) => {
      const i = line.indexOf(':'); if (i < 0) return;
      let key = line.slice(0, i), val = line.slice(i + 1).trim();
      const params = key.toUpperCase();
      key = params.split(';')[0].replace(/^ITEM\d+\./, '');
      if (/ENCODING=QUOTED-PRINTABLE/.test(params)) { try { val = decodeURIComponent(escape(qp(val))); } catch { val = qp(val); } }
      const type = (params.match(/TYPE=([^;:]+)/g) || []).join(',').toLowerCase();
      switch (key) {
        case 'N': { const [l, f] = val.split(';').map(unesc); c.lastName = l || ''; c.firstName = f || ''; break; }
        case 'FN': if (!c.firstName && !c.lastName) { const p = unesc(val).split(' '); c.firstName = p.shift() || ''; c.lastName = p.join(' '); } break;
        case 'NICKNAME': c.nickname = unesc(val); break;
        case 'ORG': c.company = unesc(val.split(';')[0]); break;
        case 'TITLE': c.title = unesc(val); break;
        case 'TEL': c.phones.push({ label: /cell|mobile|iphone/.test(type) ? 'Mobile' : /home/.test(type) ? 'Home' : /work/.test(type) ? 'Work' : 'Mobile', value: val.replace(/^tel:/i, '') }); break;
        case 'EMAIL': c.emails.push({ label: /home|personal/.test(type) ? 'Personal' : 'Work', value: val }); break;
        case 'ADR': if (!c.address.city && !c.address.street) { const p = val.split(';').map(unesc); c.address = { street: p[2] || '', city: p[3] || '', state: p[4] || '', zip: p[5] || '' }; } break;
        case 'URL': if (/linkedin/i.test(val)) c.linkedin = val; else if (!c.website) c.website = val; break;
        case 'X-SOCIALPROFILE': if (/linkedin/i.test(val + type)) c.linkedin = val.replace(/^x-apple:/, ''); break;
        case 'BDAY': c.birthday = normBirthday(val); break;
        case 'NOTE': if (val) c.touches.push({ id: uid('t'), type: 'note', date: new Date().toISOString(), note: unesc(val) }); break;
        case 'PHOTO': if (/ENCODING=B|BASE64/.test(params)) { const t = /PNG/.test(params) ? 'png' : 'jpeg'; c.photo = `data:image/${t};base64,${val}`; } else if (/^data:image/.test(val)) c.photo = val; break;
        case 'CATEGORIES': c.tags = val.split(',').map((s) => s.trim()).filter(Boolean); break;
      }
    });
    return c;
  }).filter((c) => c.firstName || c.lastName || c.company || c.phones.length || c.emails.length);
}

function normBirthday(v) {
  v = String(v || '').trim();
  let m;
  if ((m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(v))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^--(\d{2})-?(\d{2})/.exec(v))) return `${m[1]}-${m[2]}`;
  if ((m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(v))) {
    const mm = m[1].padStart(2, '0'), dd = m[2].padStart(2, '0');
    let y = m[3]; if (y && y.length === 2) y = (+y > 30 ? '19' : '20') + y;
    return y ? `${y}-${mm}-${dd}` : `${mm}-${dd}`;
  }
  const d = new Date(v);
  if (!isNaN(d) && /\d{4}/.test(v)) return ymd(d);
  return '';
}

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  const delim = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim()));
}

/* ---------------- Column mapping ---------------- */
const MAP_FIELDS = [
  ['', '— Skip —'], ['fullName', 'Full name'], ['firstName', 'First name'], ['lastName', 'Last name'], ['nickname', 'Nickname'],
  ['company', 'Company'], ['title', 'Title'], ['phone_mobile', 'Mobile phone'], ['phone_work', 'Work phone'], ['phone_home', 'Home phone'],
  ['email', 'Email (work)'], ['email_personal', 'Email (personal)'], ['street', 'Street'], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP'],
  ['linkedin', 'LinkedIn'], ['website', 'Website'], ['birthday', 'Birthday'], ['spouse', 'Spouse'], ['hobbies', 'Hobbies'], ['favoriteLunch', 'Lunch spot'], ['favoriteDinner', 'Dinner spot'],
  ['tags', 'Tags'], ['group', 'Group'], ['notes', 'Notes'], ['metAt', 'How you met']
];
function guessField(h) {
  const s = h.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const rules = [
    [/^(first|given)( name)?$|first name|given name/, 'firstName'], [/^(last|family|sur)( ?name)?$|last name|family name|surname/, 'lastName'],
    [/^(full )?name$|display name|contact name/, 'fullName'], [/nick/, 'nickname'],
    [/compan|organi[sz]ation.*name|^organi[sz]ation$|employer|business name|account/, 'company'], [/title|position|role/, 'title'],
    [/mobile|cell/, 'phone_mobile'], [/home phone/, 'phone_home'], [/(work|business|office) phone|phone 1|^phone$|telephone/, 'phone_work'],
    [/personal e ?mail|home e ?mail|e ?mail 2/, 'email_personal'], [/e ?mail/, 'email'],
    [/street|address 1|address line|^address$/, 'street'], [/city|town/, 'city'], [/state|province|region/, 'state'], [/zip|postal/, 'zip'],
    [/linkedin/, 'linkedin'], [/web|url|site/, 'website'], [/birth/, 'birthday'], [/spouse|partner|wife|husband/, 'spouse'],
    [/lunch/, 'favoriteLunch'], [/dinner|restaurant/, 'favoriteDinner'], [/hobb|interest/, 'hobbies'], [/tag|categor|label/, 'tags'], [/group|segment|type/, 'group'], [/note|comment/, 'notes'], [/met|source|lead source/, 'metAt']
  ];
  const hit = rules.find(([re]) => re.test(s));
  return hit ? hit[1] : '';
}
function rowsToContacts(header, rows, map) {
  return rows.map((r) => {
    const c = blankContact();
    header.forEach((_, i) => {
      const f = map[i]; const v = String(r[i] ?? '').trim(); if (!f || !v) return;
      switch (f) {
        case 'fullName': { const p = v.split(/\s+/); if (!c.firstName) c.firstName = p.shift(); if (!c.lastName) c.lastName = p.join(' '); break; }
        case 'phone_mobile': c.phones.push({ label: 'Mobile', value: v }); break;
        case 'phone_work': c.phones.push({ label: 'Work', value: v }); break;
        case 'phone_home': c.phones.push({ label: 'Home', value: v }); break;
        case 'email': c.emails.push({ label: 'Work', value: v }); break;
        case 'email_personal': c.emails.push({ label: 'Personal', value: v }); break;
        case 'street': case 'city': case 'state': case 'zip': c.address[f] = v; break;
        case 'birthday': c.birthday = normBirthday(v); break;
        case 'spouse': c.spouse.name = v; break;
        case 'hobbies': c.hobbies = v.split(/[,;]/).map((s) => s.trim()).filter(Boolean); break;
        case 'tags': c.tags = v.split(/[,;]/).map((s) => s.trim()).filter(Boolean); break;
        case 'group': {
          v.split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((name) => {
            let g = Store.groups.find((x) => x.name.toLowerCase() === name.toLowerCase());
            if (!g) { g = { id: uid('g-'), name, color: GROUP_COLORS[Store.groups.length % GROUP_COLORS.length].key, cadence: 30 }; Store.groups.push(g); }
            if (!c.groupIds.includes(g.id)) c.groupIds.push(g.id);
          });
          break;
        }
        case 'notes': c.touches.push({ id: uid('t'), type: 'note', date: new Date().toISOString(), note: v }); break;
        default: c[f] = v;
      }
    });
    return c;
  }).filter((c) => c.firstName || c.lastName || c.company || c.phones.length || c.emails.length);
}

/* ---------------- Flows ---------------- */
async function importFile() {
  const f = await pickFile('.vcf,.vcard,.csv,.tsv,.txt,.xlsx,.xls,text/vcard,text/csv');
  if (!f) return;
  const name = f.name.toLowerCase();
  try {
    if (/\.(vcf|vcard)$/.test(name)) return previewImport(parseVCF(await readFileAs(f)), 'contact file');
    if (/\.(xlsx|xls)$/.test(name)) {
      toast('Reading spreadsheet…');
      await loadScript('vendor/xlsx.full.min.js');
      const wb = XLSX.read(await readFileAs(f, 'arrayBuffer'), { type: 'array', cellDates: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
      return mapColumns(rows.filter((r) => r.some((x) => String(x).trim())));
    }
    const text = await readFileAs(f);
    if (/BEGIN:VCARD/i.test(text)) return previewImport(parseVCF(text), 'contact file');
    return mapColumns(parseCSV(text));
  } catch (err) {
    console.error(err); toast('Couldn’t read that file');
  }
}

function mapColumns(rows) {
  if (rows.length < 2) { toast('No rows found in that file'); return; }
  const header = rows[0].map(String), data = rows.slice(1);
  const map = header.map(guessField);
  // avoid double first-name guesses etc.
  const seen = new Set(); map.forEach((m, i) => { if (m && seen.has(m) && !/phone|email|tags|notes/.test(m)) map[i] = ''; seen.add(m); });
  const s = openSheet(`
    <p class="muted" style="font-size:13.5px;margin-bottom:10px">${data.length} rows found. Match your columns to Rolo fields — we guessed what we could.</p>
    <table class="map-table"><tbody>${header.map((h, i) => `<tr><td>${esc(h || 'Column ' + (i + 1))}<small>${esc(data.find((r) => String(r[i] || '').trim())?.[i] || '')}</small></td>
      <td><select data-col="${i}">${MAP_FIELDS.map(([v, l]) => opt(v, l, map[i])).join('')}</select></td></tr>`).join('')}</tbody></table>
    <div class="row-btns"><button class="btn ghost" data-sheet-close>Cancel</button><button class="btn primary" id="map-next">Preview</button></div>`, { title: 'Match columns' });
  $('#map-next', s.el).onclick = () => {
    $$('[data-col]', s.el).forEach((sel) => { map[+sel.dataset.col] = sel.value; });
    if (!map.some((m) => /firstName|lastName|fullName|company/.test(m))) { toast('Pick at least a name or company column'); return; }
    s.close();
    previewImport(rowsToContacts(header, data, map), 'spreadsheet');
  };
}

function previewImport(list, source) {
  if (!list.length) { toast('No contacts found'); return; }
  const pool = Store.list();
  const items = list.map((c) => ({ c, dup: findDuplicate(c, pool) }));
  const dupCount = items.filter((x) => x.dup).length;
  const s = openSheet(`
    <p class="muted" style="font-size:13.5px">${list.length} contact${list.length === 1 ? '' : 's'} from your ${esc(source)}.${dupCount ? ` ${dupCount} look like people you already have — they're unchecked.` : ''}</p>
    <label class="field" style="margin-top:12px"><span>Add everyone to a group</span><select id="imp-group">${opt('', 'No group', '')}${Store.groups.map((g) => opt(g.id, g.name, '')).join('')}</select></label>
    <div style="display:flex;gap:14px;margin:4px 0 6px"><button class="link-btn" data-all="1">Select all</button><button class="link-btn" data-all="0">Select none</button></div>
    <div id="imp-list">${items.map((x, i) => `<label class="imp-row"><input type="checkbox" data-i="${i}" ${x.dup ? '' : 'checked'}>
      ${avatarHTML(x.c, 34)}<div style="flex:1;min-width:0"><div style="font-weight:600">${esc(fullName(x.c))}</div>
      <div class="t2">${esc([roleLine(x.c), fmtPhone(primaryPhone(x.c)), primaryEmail(x.c)].filter(Boolean).join(' · '))}</div>
      ${x.dup ? `<div class="dup">Possible duplicate of ${esc(fullName(x.dup))}</div>` : ''}</div></label>`).join('')}</div>
    <div class="row-btns" style="position:sticky;bottom:0;background:var(--bg-2);padding-top:10px"><button class="btn ghost" data-sheet-close>Cancel</button><button class="btn primary" id="imp-go">Import</button></div>`, { title: 'Review import' });
  const upd = () => { const n = $$('[data-i]:checked', s.el).length; $('#imp-go', s.el).textContent = `Import ${n}`; $('#imp-go', s.el).disabled = !n; };
  upd();
  s.el.addEventListener('change', upd);
  s.el.addEventListener('click', (e) => { const a = e.target.closest('[data-all]'); if (a) { $$('[data-i]', s.el).forEach((cb) => { cb.checked = a.dataset.all === '1'; }); upd(); } });
  $('#imp-go', s.el).onclick = async () => {
    const g = $('#imp-group', s.el).value;
    const chosen = $$('[data-i]:checked', s.el).map((cb) => items[+cb.dataset.i].c);
    chosen.forEach((c) => { if (g && !c.groupIds.includes(g)) c.groupIds.push(g); });
    await Store.saveGroups();
    await Store.saveMany(chosen);
    s.close();
    toast(`${chosen.length} contact${chosen.length === 1 ? '' : 's'} added to Rolo`);
    location.hash = '#/rolo';
  };
}

/** Android Chrome: open the phone's own contact picker. */
async function pickFromPhone() {
  if (!('contacts' in navigator)) { showPhoneImportHelp(); return []; }
  try {
    const props = await navigator.contacts.getProperties();
    const picked = await navigator.contacts.select(props.filter((p) => ['name', 'email', 'tel', 'address'].includes(p)), { multiple: true });
    const list = picked.map((p) => {
      const c = blankContact();
      const nm = (p.name && p.name[0]) || ''; const parts = nm.split(' ');
      c.firstName = parts.shift() || ''; c.lastName = parts.join(' ');
      c.phones = (p.tel || []).map((t, i) => ({ label: i === 0 ? 'Mobile' : 'Other', value: t }));
      c.emails = (p.email || []).map((e) => ({ label: 'Work', value: e }));
      const a = p.address && p.address[0];
      if (a) c.address = { street: (a.addressLine || []).join(' '), city: a.city || '', state: a.region || '', zip: a.postalCode || '' };
      return c;
    });
    if (!list.length) return [];
    if (list.length === 1) { await Store.save(list[0]); toast(`${fullName(list[0])} added`); return list; }
    previewImport(list, 'phone');
    return [];
  } catch (e) { if (e.name !== 'AbortError') toast('Couldn’t open your contacts'); return []; }
}

function showPhoneImportHelp() {
  openSheet(`
    <p style="font-size:14px">Browsers can't read your phone's address book directly on every device, so here's the quick way in:</p>
    <h3 style="margin-top:16px;font-size:15px">iPhone</h3>
    <ol class="steps"><li>Open the <b>Contacts</b> app and tap <b>Lists</b> (top left).</li><li>Press and hold <b>All Contacts</b> (or any list) → <b>Export</b>.</li><li>Choose <b>Save to Files</b>.</li><li>Come back here → <b>Import a file</b> → pick that .vcf.</li></ol>
    <h3 style="margin-top:16px;font-size:15px">Android</h3>
    <ol class="steps"><li>In Chrome, tap <b>From phone contacts</b> to pick people directly.</li><li>Or in the Contacts app: <b>Fix & manage → Export to file</b>, then import the .vcf here.</li></ol>
    <h3 style="margin-top:16px;font-size:15px">Outlook, Google or a CRM</h3>
    <ol class="steps"><li>Export contacts as <b>CSV</b> or <b>Excel</b>.</li><li>Import it here — Rolo will match the columns for you.</li></ol>
    <div class="row-btns"><button class="btn primary" data-sheet-close>Got it</button></div>`, { title: 'Bring in your contacts' });
}

/* ---------------- Export & backup ---------------- */
function csvCell(v) { v = String(v ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
function exportCSV() {
  const head = ['First Name', 'Last Name', 'Nickname', 'Company', 'Title', 'Mobile Phone', 'Work Phone', 'Email', 'Street', 'City', 'State', 'ZIP', 'LinkedIn', 'Website', 'Birthday', 'Spouse', 'Kids', 'Pets', 'Hobbies', 'Favorite Treat', 'Lunch Spot', 'Dinner Spot', 'Groups', 'Tags', 'Next Step', 'Next Step Due', 'Last Touch', 'Met'];
  const rows = Store.sorted().map((c) => [
    c.firstName, c.lastName, c.nickname, c.company, c.title,
    (c.phones.find((p) => /mobile|cell/i.test(p.label)) || {}).value, (c.phones.find((p) => !/mobile|cell/i.test(p.label)) || {}).value,
    primaryEmail(c), c.address.street, c.address.city, c.address.state, c.address.zip, c.linkedin, c.website, c.birthday, c.spouse.name,
    c.kids.map((k) => `${k.name} (${kidAge(k) ?? '?'})`).join('; '), c.pets.map((p) => `${p.name}${p.kind ? ' - ' + p.kind : ''}`).join('; '),
    c.hobbies.join('; '), c.favoriteTreat, c.favoriteLunch, c.favoriteDinner, contactGroups(c).map((g) => g.name).join('; '), c.tags.join('; '),
    c.nextStep.text, c.nextStep.due, lastAnyTouch(c) ? lastAnyTouch(c).date.slice(0, 10) : '', c.metAt
  ]);
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), `rolo-contacts-${ymd()}.csv`);
}
function exportVCards() {
  const all = Store.sorted().map((c) => toVCard(c, { phone: true, email: true, work: true, address: true, linkedin: true, photo: true, birthday: true, notes: true })).join('');
  downloadBlob(new Blob([all], { type: 'text/vcard' }), `rolo-contacts-${ymd()}.vcf`);
}
async function exportBackup() {
  const { pinHash, pinSalt, ...settings } = Store.settings;
  const data = { app: 'rolo', version: 1, exportedAt: new Date().toISOString(), settings, groups: Store.groups, contacts: Store.list() };
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `rolo-backup-${ymd()}.json`);
  Store.settings.lastBackup = new Date().toISOString();
  await Store.saveSettings();
  toast('Backup saved — keep it somewhere safe (iCloud, Drive, email)');
}
async function restoreBackup() {
  const f = await pickFile('.json,application/json'); if (!f) return;
  try {
    const data = JSON.parse(await readFileAs(f));
    if (data.app !== 'rolo' || !Array.isArray(data.contacts)) throw new Error('not a rolo backup');
    if (!(await confirmDialog(`Restore ${data.contacts.length} contacts from ${fmtDate(data.exportedAt, { year: true })}? Matching contacts will be overwritten; others are kept.`, { ok: 'Restore' }))) return;
    (data.groups || []).forEach((g) => { if (!Store.group(g.id)) Store.groups.push(g); });
    await Store.saveGroups();
    await Store.saveMany(data.contacts);
    toast(`Restored ${data.contacts.length} contacts`);
    location.hash = '#/rolo';
  } catch { toast('That file isn’t a Rolo backup'); }
}
function downloadTemplate() {
  const csv = 'First Name,Last Name,Company,Title,Mobile Phone,Work Phone,Email,City,State,LinkedIn,Birthday,Spouse,Hobbies,Group,Tags,Notes\r\nJane,Example,Acme Co,Owner,918-555-0100,,jane@acme.example,Tulsa,OK,linkedin.com/in/jane,03/14,Sam,"Golf, Fishing",Prospects,hot lead,Met at chamber lunch\r\n';
  downloadBlob(new Blob([csv], { type: 'text/csv' }), 'rolo-import-template.csv');
}

/* ---------------- Import page ---------------- */
function renderImport(main) {
  const canPick = 'contacts' in navigator && 'ContactsManager' in window;
  main.innerHTML = `<div class="fade-in">
    <div class="page-head"><a class="icon-btn" href="#/settings" aria-label="Back">${icon('back')}</a><div style="flex:1"><h1>Import & export</h1><div class="sub">Bring contacts in, take them with you.</div></div></div>

    <section class="section"><div class="section-head"><h2>${icon('upload')}Bring contacts in</h2></div>
      <div class="menu-list settings-list">
        <button class="menu-item" data-x="phone">${icon('smartphone')}<span class="tx"><b>From your phone</b><small>${canPick ? 'Pick people from your contacts' : 'iPhone & Android steps'}</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-x="file">${icon('cards')}<span class="tx"><b>Import a file</b><small>.vcf contact file, .csv or Excel (.xlsx)</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-x="template">${icon('download')}<span class="tx"><b>Download a spreadsheet template</b><small>Fill it in, then import it</small></span>${icon('chevron')}</button>
      </div>
    </section>

    <section class="section"><div class="section-head"><h2>${icon('download')}Take them with you</h2></div>
      <div class="menu-list settings-list">
        <button class="menu-item" data-x="backup">${icon('lock')}<span class="tx"><b>Full backup</b><small>Everything, including photos and notes · ${Store.settings.lastBackup ? 'last ' + esc(relDay(Store.settings.lastBackup)) : 'never backed up'}</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-x="restore">${icon('refer')}<span class="tx"><b>Restore from backup</b><small>Load a Rolo .json backup</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-x="csv">${icon('list')}<span class="tx"><b>Export spreadsheet</b><small>CSV for Excel, Google Sheets or a CRM</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-x="vcf">${icon('smartphone')}<span class="tx"><b>Export to phone contacts</b><small>One .vcf with everyone</small></span>${icon('chevron')}</button>
        <button class="menu-item" data-x="print">${icon('printer')}<span class="tx"><b>Print all cards</b><small>Old-school rotary card format</small></span>${icon('chevron')}</button>
      </div>
    </section>
  </div>`;
  main.onclick = (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    ({ phone: () => (canPick ? pickFromPhone() : showPhoneImportHelp()), file: importFile, template: downloadTemplate, backup: exportBackup, restore: restoreBackup, csv: exportCSV, vcf: exportVCards, print: () => printCards(Store.sorted()) })[b.dataset.x]();
  };
}
