/* Rolo — data model, store and derived logic */
'use strict';

const GROUP_COLORS = [
  { key: 'sapphire', hex: '#3a66b8', name: 'Sapphire' },
  { key: 'emerald', hex: '#2f8566', name: 'Emerald' },
  { key: 'garnet', hex: '#a3364a', name: 'Garnet' },
  { key: 'amber', hex: '#c4902f', name: 'Amber' },
  { key: 'plum', hex: '#7a4a8c', name: 'Plum' },
  { key: 'teal', hex: '#2a8190', name: 'Teal' },
  { key: 'copper', hex: '#b5683a', name: 'Copper' },
  { key: 'slate', hex: '#5e6a7d', name: 'Slate' }
];
const colorHex = (key) => (GROUP_COLORS.find((c) => c.key === key) || GROUP_COLORS[7]).hex;

const DEFAULT_GROUPS = [
  { id: 'g-clients', name: 'Clients', color: 'emerald', cadence: 45 },
  { id: 'g-prospects', name: 'Prospects', color: 'sapphire', cadence: 14 },
  { id: 'g-partners', name: 'Referral Partners', color: 'amber', cadence: 30 },
  { id: 'g-coi', name: 'Centers of Influence', color: 'plum', cadence: 30 },
  { id: 'g-vendors', name: 'Vendors & Carriers', color: 'teal', cadence: 90 },
  { id: 'g-personal', name: 'Personal', color: 'garnet', cadence: 60 }
];

const DEFAULT_SETTINGS = {
  theme: 'ledger', userName: '', pinHash: null, pinSalt: null, lastBackup: null,
  seeded: false, rolodexView: 'wheel', defaultCadence: 30, lockAfterMin: 5,
  installDismissed: false, createdAt: null
};

const TOUCH_TYPES = {
  call: { label: 'Call', icon: 'phone' },
  text: { label: 'Text', icon: 'message' },
  email: { label: 'Email', icon: 'mail' },
  meeting: { label: 'Meeting', icon: 'meeting' },
  note: { label: 'Note', icon: 'note' },
  gift: { label: 'Gift', icon: 'gift' }
};

const TIMEZONES = [
  ['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific'], ['America/Anchorage', 'Alaska'],
  ['Pacific/Honolulu', 'Hawaii'], ['Europe/London', 'London'], ['Europe/Paris', 'Central Europe'],
  ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney']
];
const STATE_TZ = (() => {
  const m = {};
  const set = (tz, list) => list.split(' ').forEach((s) => { m[s] = tz; });
  set('America/New_York', 'CT DE FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV DC');
  set('America/Chicago', 'AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI');
  set('America/Denver', 'CO ID MT NM UT WY');
  set('America/Phoenix', 'AZ');
  set('America/Los_Angeles', 'CA NV OR WA');
  set('America/Anchorage', 'AK');
  set('Pacific/Honolulu', 'HI');
  return m;
})();

/* ---------------- Store ---------------- */
const Store = {
  contacts: new Map(),
  groups: [],
  settings: { ...DEFAULT_SETTINGS },
  listeners: new Set(),

  async load() {
    const [list, groups, settings] = await Promise.all([DB.allContacts(), DB.getMeta('groups'), DB.getMeta('settings')]);
    this.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    this.groups = groups || DEFAULT_GROUPS.map((g) => ({ ...g }));
    this.contacts = new Map(list.map((c) => [c.id, normalizeContact(c)]));
    if (!settings) { this.settings.createdAt = new Date().toISOString(); await this.saveSettings(); }
    if (!groups) await DB.setMeta('groups', this.groups);
  },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(what) { this.listeners.forEach((fn) => fn(what)); },

  list() { return Array.from(this.contacts.values()); },
  sorted() { return this.list().sort((a, b) => sortKey(a).localeCompare(sortKey(b))); },
  get(id) { return this.contacts.get(id); },

  async save(c) {
    c = normalizeContact(c);
    c.updatedAt = new Date().toISOString();
    this.contacts.set(c.id, c);
    await DB.putContact(c);
    this.emit('contacts');
    return c;
  },
  async saveMany(list) {
    list = list.map(normalizeContact);
    list.forEach((c) => this.contacts.set(c.id, c));
    await DB.putContacts(list);
    this.emit('contacts');
  },
  async remove(id) {
    this.contacts.delete(id);
    // remove dangling links
    const touched = [];
    this.contacts.forEach((c) => {
      const before = c.connections.length;
      let changed = false;
      c.connections = c.connections.filter((x) => x.contactId !== id);
      if (c.referredBy === id) { c.referredBy = null; changed = true; }
      if (changed || before !== c.connections.length) touched.push(c);
    });
    await DB.deleteContact(id);
    if (touched.length) await DB.putContacts(touched);
    this.emit('contacts');
  },
  async clearAll() { this.contacts.clear(); await DB.clearContacts(); this.emit('contacts'); },
  async saveGroups() { await DB.setMeta('groups', this.groups); this.emit('groups'); },
  async saveSettings() { await DB.setMeta('settings', this.settings); this.emit('settings'); },
  group(id) { return this.groups.find((g) => g.id === id); }
};

function blankContact() {
  return {
    id: uid('c'), firstName: '', lastName: '', nickname: '', company: '', title: '',
    photo: null, phones: [], emails: [], address: { street: '', city: '', state: '', zip: '' },
    linkedin: '', website: '', groupIds: [], tags: [],
    prefs: { method: '', bestTime: '', timezone: '' }, cadenceDays: null,
    nextStep: { text: '', due: '' }, pinned: [],
    spouse: { name: '', notes: '' }, anniversary: '', kids: [], pets: [],
    hobbies: [], favoriteTreat: '', giftIdeas: '', gifts: [],
    birthday: '', keyDates: [], touches: [], photos: [], connections: [],
    referredBy: null, metAt: '', custom: [], favorite: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}
function normalizeContact(c) {
  const b = blankContact();
  const out = { ...b, ...c };
  out.address = { ...b.address, ...(c.address || {}) };
  out.prefs = { ...b.prefs, ...(c.prefs || {}) };
  out.nextStep = { ...b.nextStep, ...(c.nextStep || {}) };
  out.spouse = { ...b.spouse, ...(c.spouse || {}) };
  ['phones', 'emails', 'groupIds', 'tags', 'pinned', 'kids', 'pets', 'hobbies', 'gifts', 'keyDates', 'touches', 'photos', 'connections', 'custom']
    .forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
  return out;
}

/* ---------------- Names & sorting ---------------- */
function fullName(c) { return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.company || 'Unnamed'; }
function sortKey(c) { return ((c.lastName || c.firstName || c.company || '~') + ' ' + (c.firstName || '')).trim().toLowerCase(); }
function letterOf(c) {
  const ch = (c.lastName || c.firstName || c.company || '#').trim()[0] || '#';
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : '#';
}
function primaryPhone(c) { return (c.phones.find((p) => /mobile|cell/i.test(p.label)) || c.phones[0] || {}).value || ''; }
function mobilePhone(c) { return (c.phones.find((p) => /mobile|cell/i.test(p.label)) || {}).value || ''; }
function primaryEmail(c) { return (c.emails[0] || {}).value || ''; }
function addressLine(c) {
  const a = c.address;
  return [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(' ').trim();
}
function linkedinUrl(v) {
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/linkedin\.com/i.test(v)) return 'https://' + v.replace(/^\/+/, '');
  return 'https://www.linkedin.com/in/' + v.replace(/^@/, '');
}
function webUrl(v) { return !v ? '' : /^https?:\/\//i.test(v) ? v : 'https://' + v; }
function contactGroups(c) { return c.groupIds.map((id) => Store.group(id)).filter(Boolean); }
function contactColor(c) { const g = contactGroups(c)[0]; return g ? colorHex(g.color) : colorHex('slate'); }

/* ---------------- Ages ----------------
   Users enter an age (not a birthday). We remember the date it was entered
   and add a year for every year that passes. If a birthday is known, use it. */
function kidAge(k, now = new Date()) {
  if (k.birthYear && k.birthday) {
    const [m, d] = k.birthday.split('-').map(Number);
    let a = now.getFullYear() - k.birthYear;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
    return a;
  }
  if (k.age === '' || k.age == null) return null;
  const asOf = parseYmd(k.ageAsOf) || now;
  if (k.birthday) {
    // Age known + birthday known: count birthdays passed since asOf
    const [m, d] = k.birthday.split('-').map(Number);
    let n = 0;
    for (let y = asOf.getFullYear(); y <= now.getFullYear(); y++) {
      const bd = new Date(y, m - 1, d);
      if (bd > asOf && bd <= now) n++;
    }
    return Number(k.age) + n;
  }
  const yrs = Math.floor((now - asOf) / (365.2425 * DAY));
  return Number(k.age) + Math.max(0, yrs);
}
function ageLabel(a) { if (a == null) return ''; if (a < 1) return 'baby'; return String(a); }

/* ---------------- Touches & warmth ---------------- */
function lastTouch(c) {
  let best = null;
  c.touches.forEach((t) => { if (t.type !== 'note' && (!best || t.date > best.date)) best = t; });
  return best;
}
function lastAnyTouch(c) {
  let best = null;
  c.touches.forEach((t) => { if (!best || t.date > best.date) best = t; });
  return best;
}
function cadenceOf(c) {
  if (c.cadenceDays) return Number(c.cadenceDays);
  const gs = contactGroups(c).map((g) => g.cadence).filter(Boolean);
  return gs.length ? Math.min(...gs) : Store.settings.defaultCadence || 30;
}
const WARMTH = {
  hot: { label: 'Hot', level: 4 },
  warm: { label: 'Warm', level: 3 },
  cooling: { label: 'Cooling', level: 2 },
  cold: { label: 'Going cold', level: 1 },
  new: { label: 'New', level: 0 }
};
function warmth(c) {
  const t = lastTouch(c);
  const cad = cadenceOf(c);
  if (!t) return { key: 'new', ...WARMTH.new, days: null, cadence: cad, ratio: 0 };
  const days = Math.max(0, daysBetween(new Date(t.date), new Date()));
  const ratio = days / cad;
  const key = ratio <= 0.5 ? 'hot' : ratio <= 1 ? 'warm' : ratio <= 1.6 ? 'cooling' : 'cold';
  return { key, ...WARMTH[key], days, cadence: cad, ratio };
}

/* ---------------- Dates ---------------- */
/** dateStr: 'YYYY-MM-DD' or 'MM-DD'. Returns next occurrence on/after today. */
function nextOccurrence(dateStr, recurring = true) {
  if (!dateStr) return null;
  const today = startOfDay();
  let m, d, y = null;
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const md = /^(\d{2})-(\d{2})$/.exec(dateStr);
  if (full) { y = +full[1]; m = +full[2]; d = +full[3]; }
  else if (md) { m = +md[1]; d = +md[2]; }
  else return null;
  if (!recurring && y) { const dt = new Date(y, m - 1, d); return dt >= today ? dt : null; }
  let dt = new Date(today.getFullYear(), m - 1, d);
  if (dt < today) dt = new Date(today.getFullYear() + 1, m - 1, d);
  return dt;
}
function fmtMonthDay(s) {
  if (!s) return '';
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const md = /^(\d{2})-(\d{2})$/.exec(s);
  if (full) return `${MONTHS[+full[2] - 1]} ${+full[3]}, ${full[1]}`;
  if (md) return `${MONTHS[+md[1] - 1]} ${+md[2]}`;
  return s;
}
/** All upcoming recurring dates for a contact within `days`. */
function contactDates(c, days = 30) {
  const out = [];
  const push = (label, dateStr, kind, recurring = true, extra = {}) => {
    const dt = nextOccurrence(dateStr, recurring);
    if (!dt) return;
    const inDays = daysBetween(new Date(), dt);
    if (inDays <= days) out.push({ contact: c, label, date: dt, inDays, kind, ...extra });
  };
  if (c.birthday) {
    const y = /^(\d{4})-/.exec(c.birthday);
    const turning = y ? nextOccurrence(c.birthday).getFullYear() - +y[1] : null;
    push('Birthday', c.birthday, 'birthday', true, { turning });
  }
  if (c.anniversary) push(c.spouse.name ? `Anniversary with ${c.spouse.name}` : 'Anniversary', c.anniversary, 'anniversary');
  c.kids.forEach((k) => { if (k.birthday) push(`${k.name || 'Kid'}'s birthday`, k.birthday, 'kid', true, { turning: (kidAge(k) ?? 0) + 1 }); });
  c.keyDates.forEach((k) => push(k.label || 'Key date', k.date, 'custom', k.recurring !== false));
  return out;
}
function upcomingDates(days = 30) {
  return Store.list().flatMap((c) => contactDates(c, days)).sort((a, b) => a.date - b.date);
}
function followUps() {
  const today = startOfDay();
  return Store.list().filter((c) => c.nextStep && c.nextStep.due)
    .map((c) => ({ contact: c, due: parseYmd(c.nextStep.due), text: c.nextStep.text, inDays: daysBetween(today, parseYmd(c.nextStep.due)) }))
    .sort((a, b) => a.due - b.due);
}

/* ---------------- Time zones ---------------- */
function contactTz(c) {
  if (c.prefs.timezone) return c.prefs.timezone;
  const st = (c.address.state || '').trim().toUpperCase();
  return STATE_TZ[st] || '';
}
function localTimeFor(c) {
  const tz = contactTz(c);
  if (!tz) return null;
  try {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz });
    const hour = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(now);
    const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzName = (TIMEZONES.find((t) => t[0] === tz) || [0, tz.split('/').pop().replace('_', ' ')])[1];
    return { time, hour, tz, tzName, same: mine === tz, awake: hour >= 8 && hour < 20 };
  } catch { return null; }
}

/* ---------------- Search ---------------- */
function searchFields(c) {
  const f = [
    ['Name', fullName(c)], ['Nickname', c.nickname], ['Company', c.company], ['Title', c.title],
    ...c.phones.map((p) => ['Phone', p.value]), ...c.emails.map((e) => ['Email', e.value]),
    ['City', [c.address.city, c.address.state].filter(Boolean).join(', ')],
    ['Spouse', c.spouse.name], ...c.kids.map((k) => ['Kid', k.name]), ...c.pets.map((p) => ['Pet', `${p.name} ${p.kind ? '(' + p.kind + ')' : ''}`]),
    ...c.hobbies.map((h) => ['Hobby', h]), ['Favorite treat', c.favoriteTreat], ['Gift ideas', c.giftIdeas],
    ...c.tags.map((t) => ['Tag', t]), ...contactGroups(c).map((g) => ['Group', g.name]),
    ...c.pinned.map((p) => ['Pinned', p]), ['Next step', c.nextStep.text], ['Met', c.metAt],
    ...c.custom.map((x) => [x.label || 'Field', x.value]), ...c.gifts.map((g) => ['Gift', g.item]),
    ...c.touches.map((t) => ['Note', t.note]), ...c.photos.map((p) => ['Photo', p.caption])
  ];
  return f.filter(([, v]) => v && String(v).trim());
}
function searchContacts(q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const results = [];
  Store.list().forEach((c) => {
    const fields = searchFields(c);
    const hay = fields.map(([, v]) => String(v).toLowerCase()).join(' \u0001 ');
    if (!tokens.every((t) => hay.includes(t))) return;
    let score = 0;
    const name = fullName(c).toLowerCase();
    tokens.forEach((t) => { if (name.startsWith(t)) score += 10; else if (name.includes(t)) score += 6; else score += 1; });
    // best non-name snippet
    let snippet = null;
    if (!tokens.every((t) => name.includes(t))) {
      const hit = fields.find(([l, v]) => l !== 'Name' && tokens.some((t) => String(v).toLowerCase().includes(t)));
      if (hit) snippet = { label: hit[0], text: makeSnippet(String(hit[1]), tokens) };
    }
    results.push({ contact: c, score, snippet });
  });
  return results.sort((a, b) => b.score - a.score || sortKey(a.contact).localeCompare(sortKey(b.contact)));
}
function makeSnippet(text, tokens) {
  const lower = text.toLowerCase();
  let idx = -1;
  tokens.some((t) => { idx = lower.indexOf(t); return idx >= 0; });
  let start = Math.max(0, idx - 30);
  let s = (start > 0 ? '…' : '') + text.slice(start, start + 110) + (text.length > start + 110 ? '…' : '');
  return s;
}
function highlight(text, q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  let out = esc(text);
  tokens.forEach((t) => {
    const re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(re, '<mark>$1</mark>');
  });
  return out;
}

/* ---------------- Duplicate detection ---------------- */
function digits(s) { return String(s || '').replace(/\D/g, '').slice(-10); }
function findDuplicate(c, pool = Store.list()) {
  const em = new Set(c.emails.map((e) => e.value.toLowerCase()).filter(Boolean));
  const ph = new Set(c.phones.map((p) => digits(p.value)).filter((d) => d.length >= 7));
  const nm = fullName(c).toLowerCase();
  return pool.find((o) => o.id !== c.id && (
    o.emails.some((e) => em.has(e.value.toLowerCase())) ||
    o.phones.some((p) => ph.has(digits(p.value))) ||
    (nm !== 'unnamed' && fullName(o).toLowerCase() === nm && (o.company || '').toLowerCase() === (c.company || '').toLowerCase())
  ));
}
