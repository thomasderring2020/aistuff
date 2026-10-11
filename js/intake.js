/* Rolo — Quick Intake: talk about a contact, Rolo files it where it belongs.
   1) Dictate (Web Speech API, or the keyboard mic as a fallback)
   2) Parse: AI via /api/intake when configured on Vercel, else the on-device parser below
   3) Review every proposed change, then apply */
'use strict';

/* ---------------- On-device parser ---------------- */
const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, couple: 2, 'a couple': 2, three: 3, few: 3, 'a few': 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DUE_RE = /\b(today|tonight|tomorrow|this week|next week|next month|end of (?:the )?(?:week|month)|after the holidays|in (?:a couple(?: of)?|a few|an?|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) (?:days?|weeks?|months?)|(?:on |next |this )?(?:mon|tues|wednes|thurs|fri|satur|sun)day|(?:on )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}(?:st|nd|rd|th)?)\b/i;

function parseDue(text, now = new Date()) {
  const m = DUE_RE.exec(text || '');
  if (!m) return null;
  const p = m[1].toLowerCase();
  const d = startOfDay(now);
  if (p === 'today' || p === 'tonight') return { date: d, phrase: m[0] };
  if (p === 'tomorrow') return { date: addDays(d, 1), phrase: m[0] };
  if (p === 'this week') return { date: addDays(d, Math.max(1, 5 - d.getDay())), phrase: m[0] };
  if (p === 'next week') return { date: addDays(d, ((8 - d.getDay()) % 7) || 7), phrase: m[0] }; // next Monday
  if (p === 'next month') return { date: new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)), phrase: m[0] };
  if (/end of (the )?week/.test(p)) return { date: addDays(d, (5 - d.getDay() + 7) % 7), phrase: m[0] };
  if (/end of (the )?month/.test(p)) return { date: new Date(d.getFullYear(), d.getMonth() + 1, 0), phrase: m[0] };
  if (p === 'after the holidays') return { date: new Date(d.getMonth() === 0 && d.getDate() < 6 ? d.getFullYear() : d.getFullYear() + 1, 0, 6), phrase: m[0] };
  let r = /^in (a couple(?: of)?|a few|an?|\d+|\w+) (day|week|month)s?$/.exec(p);
  if (r) {
    const n = /^\d+$/.test(r[1]) ? +r[1] : NUM_WORDS[r[1].replace(' of', '')] || 1;
    if (r[2] === 'day') return { date: addDays(d, n), phrase: m[0] };
    if (r[2] === 'week') return { date: addDays(d, n * 7), phrase: m[0] };
    return { date: new Date(d.getFullYear(), d.getMonth() + n, d.getDate()), phrase: m[0] };
  }
  r = /(mon|tues|wednes|thurs|fri|satur|sun)day/.exec(p);
  if (r) {
    const target = WEEKDAYS.findIndex((w) => w.startsWith(r[1]));
    let diff = (target - d.getDay() + 7) % 7 || 7;
    if (/^next /.test(p) && diff < 3) diff += 7;
    return { date: addDays(d, diff), phrase: m[0] };
  }
  r = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})/.exec(p);
  if (r) {
    let dt = new Date(d.getFullYear(), MONTH_NAMES.indexOf(r[1]), +r[2]);
    if (dt < d) dt = new Date(d.getFullYear() + 1, MONTH_NAMES.indexOf(r[1]), +r[2]);
    return { date: dt, phrase: m[0] };
  }
  return null;
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tidy = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s,;:-]+|[\s,;:.!-]+$/g, '').trim();
const HOBBY_NOUN = { golf: 'Golf', golfing: 'Golf', fish: 'Fishing', fishing: 'Fishing', hunt: 'Hunting', hunting: 'Hunting', run: 'Running', running: 'Running', hike: 'Hiking', hiking: 'Hiking', bike: 'Cycling', biking: 'Cycling', cycle: 'Cycling', ski: 'Skiing', skiing: 'Skiing', camp: 'Camping', camping: 'Camping', cook: 'Cooking', cooking: 'Cooking', travel: 'Travel', traveling: 'Travel', read: 'Reading', reading: 'Reading', boat: 'Boating', boating: 'Boating', swim: 'Swimming', bowl: 'Bowling', garden: 'Gardening', gardening: 'Gardening' };
const FOOD_WORDS = /\b(eat|eating|food|lunch|dinner|breakfast|restaurant|spot|place|steak|bbq|coffee|drink|beer|wine)\b/i;

function parseIntakeLocal(note, c, now = new Date()) {
  const out = { source: 'local', summary: tidy(note), touchType: 'call', hobbies: [], pinned: [], kids: [], pets: [], tags: [] };
  const first = (c.firstName || '').toLowerCase();
  // sentences → clauses
  const sentences = note.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+|\n+/).map(tidy).filter(Boolean);
  const clauses = sentences.flatMap((s) => s.split(/,?\s+(?:and|but|plus|also)\s+(?=(?:he|she|they|his|her|their|wants|asked|needs|said|told|is|was|likes|loves|enjoys|has|plays|i)\b)/i).map(tidy)).filter(Boolean);
  const stripSubject = (s) => tidy(s.replace(/^(?:[A-Z][a-z]+|he|she|they)(?:'s| is| was| are| seems| sounds| feels)\s+/i, '').replace(/^(?:he|she|they)\s+/i, ''));

  if (/\b(texted|text(?:ed)? me|over text)\b/i.test(note)) out.touchType = 'text';
  else if (/\b(lunch with|coffee with|met with|meeting|met at|stopped by|visited)\b/i.test(note)) out.touchType = 'meeting';
  else if (/\b(emailed|email from|replied)\b/i.test(note)) out.touchType = 'email';

  clauses.forEach((cl) => {
    const low = cl.toLowerCase();
    // ---- next step
    const lead = /(?:wants|asked|told|needs|would like|wanted)\s+(?:me|us)\s+to\s+(.+)|(?:i\s+(?:need|have|want|should|will|'ll|am going|'m going)\s+to|remind me to|i'll|need to|follow up|follow-up)\s*(.*)/i.exec(cl);
    const due = parseDue(cl, now);
    const actionVerb = /\b(call|follow up|circle back|reach out|check in|touch base|send|email|text|schedule|set up|meet|quote|drop off|get back)\b/i.test(cl);
    if ((lead && actionVerb) || (due && actionVerb)) {
      let text = lead ? (lead[1] || lead[2] || cl) : cl;
      if (due) text = text.replace(due.phrase, '');
      text = text.replace(/\b(him|her|them)\s+back\b/i, 'back').replace(/\bme\b/g, 'me');
      text = cap(tidy(text.replace(/^(?:to|and)\s+/i, '').replace(/\s+(?:by|on|before|around|until|sometime|about)\s*$/i, '')));
      if (/^follow/i.test(cl) && !/^follow/i.test(text)) text = 'Follow up ' + text.charAt(0).toLowerCase() + text.slice(1);
      if (text && !out.nextStep) out.nextStep = { text: text.length < 4 ? 'Follow up' : text, due: due ? ymd(due.date) : '' };
      return;
    }
    // ---- pain points / strong preferences → Don't forget
    if (/\b(unhappy|frustrated|upset|annoyed|not happy|disappointed|concerned|worried|fed up|hates|can't stand|cannot stand|doesn't like|does not like|don't mention|never mention|allergic|prefers)\b/i.test(cl)) {
      out.pinned.push(cap(stripSubject(cl)));
      if (/\b(broker|agent|carrier|vendor)\b/i.test(cl)) out.tags.push('unhappy with current ' + /\b(broker|agent|carrier|vendor)\b/i.exec(cl)[1].toLowerCase());
    }
    // ---- food spots
    let m = /(?:favorite|favourite|fav|go-to)\s+(?:spot|place|restaurant|joint)?\s*(?:to eat|to grab (lunch|dinner)|for (lunch|dinner))?\s*(?:is|=)\s+(.+)/i.exec(cl)
      || /\b(?:loves|likes|enjoys)\s+(lunch|dinner)\s+at\s+(.+)/i.exec(cl)
      || /\b(lunch|dinner)\s+spot\s+is\s+(.+)/i.exec(cl);
    if (m && !/\b(drink|snack|candy|treat|dessert|coffee|beer|wine|whiskey|bourbon|cocktail|team|color|show|movie|book)\b/i.test(cl.split(/is/i)[0])) {
      const meal = (m[1] || m[2] || '').toLowerCase();
      const place = tidy(m[m.length - 1].replace(/\s+(?:for (?:lunch|dinner)|downtown)$/i, ''));
      if (/lunch/.test(meal) || /\blunch\b/i.test(cl)) out.favoriteLunch = place; else out.favoriteDinner = place;
      return;
    }
    // ---- treat
    m = /(?:favorite|favourite|fav)\s+(drink|snack|candy|treat|dessert|coffee|beer|wine|whiskey|bourbon|cocktail)\s+is\s+(.+)/i.exec(cl);
    if (m) { out.favoriteTreat = cap(tidy(m[2])); return; }
    // ---- spouse
    m = /\b(?:wife|husband|spouse|partner|fianc[ée]e?)(?:'s name is|,|\s+is named|\s+named|\s+is)?\s+([A-Z][a-z]+)\b/.exec(cl);
    if (m && !['Unhappy', 'Upset', 'Happy'].includes(m[1])) out.spouseName = m[1];
    // ---- kids
    const kidRes = [
      /\b(?:son|daughter|boy|girl|kid|child)\s*(?:named|is named|,)?\s*([A-Z][a-z]+)\s*(?:,|\(|is|who is|who's|turned|just turned)?\s*(\d{1,2})\b/g,
      /\b(?:an?|his|her|their)\s+(\d{1,2})[- ]year[- ]old\s+(?:son|daughter|boy|girl|kid)\s*(?:named\s+)?([A-Z][a-z]+)/g,
      /\b([A-Z][a-z]+)\s*\((\d{1,2})\)/g
    ];
    kidRes.forEach((re, i) => {
      let k;
      while ((k = re.exec(cl))) {
        const name = i === 1 ? k[2] : k[1]; const age = +(i === 1 ? k[1] : k[2]);
        if (i === 2 && !/\b(kids?|son|daughter|children|boys|girls)\b/i.test(note)) continue;
        if (age <= 30 && !out.kids.some((x) => x.name === name)) out.kids.push({ name, age });
      }
    });
    // ---- pets
    m = /\b(dog|cat|puppy|kitten|lab|labrador|retriever|golden|heeler|beagle|poodle|doodle|shepherd|horse|bulldog|terrier)\s+(?:named|called)\s+([A-Z][a-z]+)/i.exec(cl)
      || /\b([A-Z][a-z]+)\s+the\s+(dog|cat|puppy|lab|retriever|golden|heeler|beagle|doodle|horse)\b/.exec(cl);
    if (m) { const named = /named|called/i.test(cl); out.pets.push(named ? { name: m[2], kind: cap(m[1]) } : { name: m[1], kind: cap(m[2]) }); }
    // ---- birthday
    m = /birthday(?:'s| is)?(?: on)?\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\.?\s+(\d{1,2})/i.exec(cl);
    if (m) out.birthday = `${String(MONTH_NAMES.indexOf(m[1].slice(0, 3).toLowerCase()) + 1).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`;
    // ---- company / title
    m = /\b(?:works|working)\s+(?:at|for)\s+([A-Z][\w&.'\- ]+?)(?:\s+(?:as|now|and)\b|$)/.exec(cl);
    if (m && !c.company) out.company = tidy(m[1]);
    // ---- hobbies
    m = /\b(?:likes|loves|enjoys|is into|is really into|really likes|really loves|big into|plays|goes)\s+(?:to\s+)?(.+)/i.exec(cl);
    if (m && !FOOD_WORDS.test(m[1]) && !/^(me|us|it|that|this|the idea)\b/i.test(m[1])) {
      m[1].split(/,\s*|\s+and\s+|\s*&\s*/).map(tidy).filter((h) => h && h.split(' ').length <= 4).forEach((h) => {
        const k = h.toLowerCase().replace(/^(to|go|going)\s+/, '');
        out.hobbies.push(HOBBY_NOUN[k] || cap(k));
      });
    }
    m = /\b(?:huge|big|die-hard|diehard)\s+([A-Z][\w.&' ]+?)\s+fan\b/.exec(cl);
    if (m) out.hobbies.push(`${tidy(m[1])} fan`);
  });
  out.hobbies = [...new Set(out.hobbies)];
  out.pinned = [...new Set(out.pinned)];
  out.tags = [...new Set(out.tags)];
  return out;
}

/* ---------------- AI (optional, via Vercel function) ---------------- */
let aiAvailable = null; // null = unknown
async function checkAI() {
  if (aiAvailable !== null) return aiAvailable;
  try {
    const r = await fetch('api/intake', { method: 'GET' });
    aiAvailable = r.ok && (await r.json()).ai === true;
  } catch { aiAvailable = false; }
  return aiAvailable;
}
async function parseIntake(note, c) {
  if (await checkAI()) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
      const now = new Date();
      const r = await fetch('api/intake', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({
          note, today: `${now.toLocaleDateString('en-US', { weekday: 'long' })} ${ymd(now)}`,
          contact: { name: fullName(c), company: c.company, title: c.title, spouse: c.spouse.name, kids: c.kids.map((k) => k.name), hobbies: c.hobbies, nextStep: c.nextStep.text }
        })
      });
      clearTimeout(t);
      if (r.ok) {
        const d = await r.json();
        return { hobbies: [], pinned: [], kids: [], pets: [], tags: [], ...d, source: 'ai' };
      }
    } catch { /* fall through to local */ }
  }
  return parseIntakeLocal(note, c);
}

/* ---------------- UI ---------------- */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

function openIntake(c) {
  const canSpeak = !!SpeechRec;
  const s = openSheet(`
    <p class="muted" style="font-size:13.5px;margin-bottom:12px">Talk like you would to an assistant. Rolo pulls out next steps, family, hobbies, favorite spots and things to remember — you approve before anything changes.</p>
    ${canSpeak ? `<div class="mic-wrap"><button class="mic-btn" id="in-mic" aria-label="Start dictating">${icon('mic')}</button><div class="mic-state" id="in-state">Tap to talk</div></div>` : ''}
    <label class="field"><span>${canSpeak ? 'Or type it' : 'Tap the microphone on your keyboard to dictate'}</span>
      <textarea id="in-text" rows="5" placeholder="e.g. ${esc(c.firstName || 'Bob')} is unhappy with his broker and wants me to call back next week. He likes to golf and his favorite spot to eat is STK."></textarea></label>
    <div class="row-btns"><button class="btn ghost" data-sheet-close>Cancel</button><button class="btn primary" id="in-go">${icon('sparkle')}Sort it</button></div>`,
    { title: `Quick intake · ${c.firstName || fullName(c)}`, onClose: () => stop() });

  const ta = $('#in-text', s.el), state = $('#in-state', s.el), mic = $('#in-mic', s.el);
  let rec = null, base = '';
  function stop() { if (rec) { try { rec.stop(); } catch {} rec = null; } if (mic) mic.classList.remove('on'); if (state) state.textContent = 'Tap to talk'; }
  if (mic) mic.onclick = () => {
    if (rec) return stop();
    rec = new SpeechRec();
    rec.lang = navigator.language || 'en-US'; rec.continuous = true; rec.interimResults = true;
    base = ta.value ? ta.value.trim() + ' ' : '';
    rec.onresult = (e) => {
      let finalTxt = '', interim = '';
      for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finalTxt += t; else interim += t; }
      ta.value = (base + finalTxt + interim).replace(/\s+/g, ' ');
    };
    rec.onerror = (e) => { stop(); if (e.error === 'not-allowed') toast('Allow microphone access to dictate'); };
    rec.onend = () => { if (rec) stop(); };
    try { rec.start(); mic.classList.add('on'); state.textContent = 'Listening… tap to stop'; } catch { stop(); }
  };
  if (!canSpeak) setTimeout(() => ta.focus(), 300);

  $('#in-go', s.el).onclick = async () => {
    const note = ta.value.trim();
    if (!note) { toast('Say or type a few details first'); return; }
    stop();
    const btn = $('#in-go', s.el); btn.disabled = true; btn.innerHTML = `${icon('sparkle')}Sorting…`;
    const result = await parseIntake(note, c);
    s.close();
    openIntakeReview(c, note, result);
  };
}

function openIntakeReview(c, note, r) {
  const items = [];
  const add = (key, label, ic, html) => items.push({ key, label, ic, html });
  const inp = (k, v, ph = '') => `<input class="input" data-k="${k}" value="${esc(v || '')}" placeholder="${esc(ph)}">`;

  add('touch', 'Conversation history', 'note', `<div class="type-chips" data-touch-type>${['call', 'text', 'email', 'meeting', 'note'].map((t) => `<button class="chip sm ${t === (r.touchType || 'call') ? 'on' : ''}" data-type="${t}">${TOUCH_TYPES[t].label}</button>`).join('')}</div><textarea class="input" data-k="summary" rows="3">${esc(r.summary || note)}</textarea>`);
  if (r.nextStep && (r.nextStep.text || r.nextStep.due)) add('next', 'Next step', 'bell', `${inp('nsText', r.nextStep.text)}<input class="input" type="date" data-k="nsDue" value="${esc(r.nextStep.due || '')}" style="margin-top:8px">${c.nextStep.text ? `<small class="muted">Replaces: ${esc(c.nextStep.text)}</small>` : ''}`);
  const newHobbies = (r.hobbies || []).filter((h) => !c.hobbies.some((x) => x.toLowerCase() === h.toLowerCase()));
  if (newHobbies.length) add('hobbies', 'Add hobbies', 'heart', inp('hobbies', newHobbies.join(', ')));
  if (r.favoriteLunch) add('lunch', 'Lunch spot', 'utensils', `${inp('lunch', r.favoriteLunch)}${c.favoriteLunch ? `<small class="muted">Replaces: ${esc(c.favoriteLunch)}</small>` : ''}`);
  if (r.favoriteDinner) add('dinner', 'Favorite spot (dinner)', 'utensils', `${inp('dinner', r.favoriteDinner)}<label class="toggle" style="font-size:13px;margin-top:6px"><input type="checkbox" data-k="dinnerIsLunch"> It's a lunch spot</label>${c.favoriteDinner ? `<small class="muted">Replaces: ${esc(c.favoriteDinner)}</small>` : ''}`);
  if (r.favoriteTreat) add('treat', 'Favorite treat / small gift', 'gift', inp('treat', r.favoriteTreat));
  if (r.giftIdeas) add('gifts', 'Gift ideas', 'sparkle', inp('giftIdeas', r.giftIdeas));
  (r.pinned || []).forEach((p, i) => add('pin' + i, 'Don’t forget', 'pin', inp('pin', p)));
  if (r.spouseName && r.spouseName !== c.spouse.name) add('spouse', 'Spouse / partner', 'heart', inp('spouse', r.spouseName));
  (r.kids || []).forEach((k, i) => add('kid' + i, c.kids.some((x) => x.name.toLowerCase() === (k.name || '').toLowerCase()) ? 'Update kid' : 'Add kid', 'users', `<div class="grid2">${inp('kidName', k.name, 'Name')}<input class="input" data-k="kidAge" inputmode="numeric" value="${esc(k.age ?? '')}" placeholder="Age"></div>`));
  (r.pets || []).forEach((p, i) => add('pet' + i, 'Add pet', 'paw', `<div class="grid2">${inp('petName', p.name, 'Name')}${inp('petKind', p.kind, 'Kind')}</div>`));
  if (r.birthday) add('bday', 'Birthday', 'calendar', inp('bday', fmtMonthDay(r.birthday)));
  if (r.company && r.company !== c.company) add('company', 'Company', 'briefcase', inp('company', r.company));
  if (r.title && r.title !== c.title) add('title', 'Title', 'briefcase', inp('title', r.title));
  const newTags = (r.tags || []).filter((t) => !c.tags.includes(t));
  if (newTags.length) add('tags', 'Add tags', 'tag', inp('tags', newTags.join(', ')));

  const s = openSheet(`
    <p class="muted" style="font-size:13px;margin-bottom:12px">${r.source === 'ai' ? 'Sorted with AI.' : 'Sorted on your device.'} Uncheck anything that's wrong, or edit it before saving.</p>
    <div class="intake-list">${items.map((it) => `<div class="intake-item" data-item="${it.key}">
      <label class="intake-head"><input type="checkbox" checked data-on>${icon(it.ic)}<b>${esc(it.label)}</b></label>
      <div class="intake-body">${it.html}</div></div>`).join('')}</div>
    ${items.length === 1 ? `<p class="muted" style="font-size:13px;margin-top:8px">Nothing else to file — this will be saved as a note.</p>` : ''}
    <div class="row-btns"><button class="btn ghost" data-sheet-close>Cancel</button><button class="btn primary" id="rv-save">${icon('check')}Update record</button></div>`,
    { title: 'Review & file' });

  s.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-touch-type] [data-type]');
    if (b) { $$('[data-touch-type] .chip', s.el).forEach((x) => x.classList.toggle('on', x === b)); }
  });
  $('#rv-save', s.el).onclick = async () => {
    const on = (key) => { const el = $(`[data-item="${key}"]`, s.el); return el && $('[data-on]', el).checked ? el : null; };
    const val = (el, k) => { const x = $(`[data-k="${k}"]`, el); return x ? (x.type === 'checkbox' ? x.checked : x.value.trim()) : ''; };
    let el;
    const changes = [];
    if ((el = on('touch'))) {
      const type = ($('[data-touch-type] .chip.on', el) || {}).dataset?.type || 'call';
      const recent = c.touches.find((t) => t.type === type && !t.note && Date.now() - new Date(t.date).getTime() < 60 * 60000);
      if (recent) recent.note = val(el, 'summary'); // fill in the auto-logged call instead of duplicating
      else c.touches.push({ id: uid('t'), type, date: new Date().toISOString(), note: val(el, 'summary') });
      changes.push('note');
    }
    if ((el = on('next'))) { c.nextStep = { text: val(el, 'nsText'), due: val(el, 'nsDue') }; changes.push('next step'); }
    if ((el = on('hobbies'))) { val(el, 'hobbies').split(',').map(tidy).filter(Boolean).forEach((h) => { if (!c.hobbies.some((x) => x.toLowerCase() === h.toLowerCase())) c.hobbies.push(h); }); changes.push('hobbies'); }
    if ((el = on('lunch'))) { c.favoriteLunch = val(el, 'lunch'); changes.push('lunch spot'); }
    if ((el = on('dinner'))) { if (val(el, 'dinnerIsLunch')) c.favoriteLunch = val(el, 'dinner'); else c.favoriteDinner = val(el, 'dinner'); changes.push('favorite spot'); }
    if ((el = on('treat'))) { c.favoriteTreat = val(el, 'treat'); changes.push('treat'); }
    if ((el = on('gifts'))) { c.giftIdeas = [c.giftIdeas, val(el, 'giftIdeas')].filter(Boolean).join('; '); changes.push('gift ideas'); }
    items.filter((it) => it.key.startsWith('pin')).forEach((it) => {
      const e2 = on(it.key); if (!e2) return;
      const v = val(e2, 'pin'); if (!v || c.pinned.includes(v)) return;
      if (c.pinned.length >= 3) c.pinned.shift(); // keep the 3 most recent
      c.pinned.push(v); changes.push('don’t forget');
    });
    if ((el = on('spouse'))) { c.spouse.name = val(el, 'spouse'); changes.push('spouse'); }
    items.filter((it) => it.key.startsWith('kid')).forEach((it) => {
      const e2 = on(it.key); if (!e2) return;
      const name = val(e2, 'kidName'), age = val(e2, 'kidAge');
      const ex = c.kids.find((k) => k.name.toLowerCase() === name.toLowerCase());
      if (ex) { if (age !== '') { ex.age = +age; ex.ageAsOf = ymd(); } } else c.kids.push({ id: uid('k'), name, age: age === '' ? '' : +age, ageAsOf: ymd(), birthday: '' });
      changes.push('kids');
    });
    items.filter((it) => it.key.startsWith('pet')).forEach((it) => {
      const e2 = on(it.key); if (!e2) return;
      const name = val(e2, 'petName'); if (!name || c.pets.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
      c.pets.push({ id: uid('p'), name, kind: val(e2, 'petKind') }); changes.push('pets');
    });
    if (on('bday')) { c.birthday = r.birthday; changes.push('birthday'); }
    if ((el = on('company'))) { c.company = val(el, 'company'); changes.push('company'); }
    if ((el = on('title'))) { c.title = val(el, 'title'); changes.push('title'); }
    if ((el = on('tags'))) { val(el, 'tags').split(',').map(tidy).filter(Boolean).forEach((t) => { if (!c.tags.includes(t)) c.tags.push(t); }); changes.push('tags'); }
    await Store.save(c);
    s.close();
    const uniq = [...new Set(changes)];
    toast(uniq.length ? `Updated ${uniq.slice(0, 3).join(', ')}${uniq.length > 3 ? ` +${uniq.length - 3} more` : ''}` : 'Nothing changed');
  };
}
