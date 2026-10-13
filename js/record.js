/* Rolo — contact record page */
'use strict';

function section(title, ic, body, { action = '', id = '' } = {}) {
  return `<section class="section" ${id ? `id="${id}"` : ''}>
    <div class="section-head"><h2>${icon(ic)}${esc(title)}</h2>${action}</div>
    ${body}
  </section>`;
}

function briefHTML(c) {
  const items = [];
  const lt = lastAnyTouch(c);
  if (lt) items.push(['clock', `<b>Last ${esc((TOUCH_TYPES[lt.type]?.label || 'note').toLowerCase())} ${esc(relDay(lt.date))}</b>${lt.note ? ': ' + esc(lt.note) : ' <span class="muted">· no notes</span>'}`]);
  const fam = [];
  if (c.spouse.name) fam.push(`Spouse <b>${esc(c.spouse.name)}</b>`);
  if (c.kids.length) fam.push(c.kids.map((k) => { const a = kidAge(k); return `<b>${esc(k.name || 'Kid')}</b>${a != null ? ` (${ageLabel(a)})` : ''}`; }).join(', '));
  if (c.pets.length) fam.push(c.pets.map((p) => `<b>${esc(p.name)}</b>${p.kind ? ` the ${esc(p.kind.toLowerCase())}` : ''}`).join(', '));
  if (fam.length) items.push(['users', fam.join(' · ')]);
  const likes = [];
  if (c.hobbies.length) likes.push(esc(c.hobbies.slice(0, 3).join(', ')));
  if (c.favoriteTreat) likes.push(`loves <b>${esc(c.favoriteTreat)}</b>`);
  if (likes.length) items.push(['heart', likes.join(' · ')]);
  const spots = [c.favoriteLunch && `lunch at <b>${esc(c.favoriteLunch)}</b>`, c.favoriteDinner && `dinner at <b>${esc(c.favoriteDinner)}</b>`].filter(Boolean);
  if (spots.length) items.push(['utensils', 'Likes ' + spots.join(', ')]);
  const up = contactDates(c, 30)[0];
  if (up) items.push(['calendar', `<b>${esc(up.label)}</b> ${up.inDays === 0 ? 'is today' : esc(relDay(up.date))}${up.turning ? ` (turns ${up.turning})` : ''}`]);
  if (c.nextStep.text) items.push(['bell', `<b>Next step:</b> ${esc(c.nextStep.text)}`]);
  const lt2 = localTimeFor(c);
  if (lt2 && !lt2.same) items.push(['globe', `It's <b>${esc(lt2.time)}</b> for them (${esc(lt2.tzName)})${lt2.awake ? '' : ' — maybe text instead'}`]);
  if (!items.length) return `<div class="brief ticks"><h3>${icon('sparkle')}Before you call</h3><ul><li>${icon('edit')}<span>Add family, hobbies and call notes — Rolo will turn them into a 10-second brief right here.</span></li></ul></div>`;
  return `<div class="brief ticks"><h3>${icon('sparkle')}Before you call</h3><ul>${items.map(([i, t]) => `<li>${icon(i)}<span>${t}</span></li>`).join('')}</ul></div>`;
}

function renderRecord(container, id) {
  const c = Store.get(id);
  if (!c) { container.innerHTML = `<div class="panel empty" style="margin-top:30px">${icon('cards')}This contact no longer exists.<div class="row-btns" style="justify-content:center"><a class="btn" href="#/rolo">Back to Rolo</a></div></div>`; return; }

  const ph = primaryPhone(c), mob = mobilePhone(c) || ph, em = primaryEmail(c), addr = addressLine(c), li = linkedinUrl(c.linkedin);
  const pref = c.prefs.method || 'call';
  const lt = localTimeFor(c);
  const referredBy = c.referredBy && Store.get(c.referredBy);
  const referrals = Store.list().filter((o) => o.referredBy === c.id);
  const linked = c.connections.map((x) => ({ ...x, c: Store.get(x.contactId) })).filter((x) => x.c);
  const linkedBack = Store.list().filter((o) => o.id !== c.id && o.connections.some((x) => x.contactId === c.id) && !c.connections.some((x) => x.contactId === o.id))
    .map((o) => ({ c: o, relation: o.connections.find((x) => x.contactId === c.id).relation }));
  const touches = [...c.touches].sort((a, b) => b.date.localeCompare(a.date));
  const showAll = container.dataset.allTouches === c.id;

  container.innerHTML = `<div class="fade-in record" data-id="${c.id}">
    <div class="rec-top">
      <button class="icon-btn back-btn" data-act="back" aria-label="Back">${icon('back')}</button>
      <span class="sp"></span>
      <button class="icon-btn" data-act="fav" aria-label="Favorite"><span class="fav ${c.favorite ? 'on' : ''}" style="color:${c.favorite ? '#d6a53a' : 'var(--ink-2)'}">${icon('star')}</span></button>
      <button class="icon-btn" data-act="share" aria-label="Share card">${icon('share')}</button>
      <a class="icon-btn" href="#/c/${c.id}/edit" aria-label="Edit">${icon('edit')}</a>
      <button class="icon-btn" data-act="more" aria-label="More">${icon('dots')}</button>
    </div>

    <div class="rec-hero paper ticks">
      <div class="top">
        <button class="avatar" data-act="photo" style="--s:74px;--c:${contactColor(c)};border:0;padding:0" aria-label="Change photo">${c.photo ? `<img src="${c.photo}" alt="">` : esc(initials(c))}</button>
        <div style="min-width:0">
          <h1>${esc(fullName(c))}${c.nickname ? ` <span class="nick">“${esc(c.nickname)}”</span>` : ''}</h1>
          ${roleLine(c) ? `<div class="role">${esc(roleLine(c))}</div>` : ''}
          <div class="chips" style="margin-top:8px;gap:5px">${groupTagsHTML(c)}</div>
        </div>
      </div>
      <div class="meta">
        ${warmthHTML(c)}
        ${lt ? `<span>${icon('clock')}${esc(lt.time)} local${lt.same ? '' : ` · ${esc(lt.tzName)}`}</span>` : ''}
        ${c.prefs.method ? `<span>${icon(c.prefs.method === 'text' ? 'message' : c.prefs.method === 'email' ? 'mail' : 'phone')}Prefers ${esc(c.prefs.method)}</span>` : ''}
      </div>
    </div>

    <div class="actions">
      <a class="action ${!ph ? 'off' : ''} ${pref === 'call' ? 'primary' : ''}" href="${ph ? telHref(ph) : '#'}" data-log="call" data-id="${c.id}">${icon('phone')}Call</a>
      <a class="action ${!mob ? 'off' : ''} ${pref === 'text' ? 'primary' : ''}" href="${mob ? smsHref(mob) : '#'}" data-log="text" data-id="${c.id}">${icon('message')}Text</a>
      <a class="action ${!em ? 'off' : ''} ${pref === 'email' ? 'primary' : ''}" href="${em ? 'mailto:' + esc(em) : '#'}" data-log="email" data-id="${c.id}">${icon('mail')}Email</a>
      <a class="action ${!addr ? 'off' : ''}" href="${addr ? 'https://maps.google.com/?q=' + encodeURIComponent(addr) : '#'}" target="_blank" rel="noopener">${icon('map')}Map</a>
      <a class="action ${!li ? 'off' : ''}" href="${li ? esc(li) : '#'}" target="_blank" rel="noopener">${icon('linkedin')}LinkedIn</a>
    </div>

    <button class="btn intake-btn" data-act="intake">${icon('mic')}Quick intake<small>Talk — Rolo files it</small></button>

    ${briefHTML(c)}

    <div class="rec-grid">
    <div>
    ${section('Next step', 'bell', `<div class="panel nextstep">
        ${c.nextStep.text || c.nextStep.due ? `
          <button class="check-btn" data-act="done" aria-label="Mark done">${icon('check')}</button>
          <div class="txt" data-act="next" style="cursor:pointer"><div class="t">${esc(c.nextStep.text || 'Follow up')}</div>
            <div class="d">${c.nextStep.due ? `${fmtDate(c.nextStep.due)} · ${dueLabel(daysBetween(new Date(), parseYmd(c.nextStep.due)))}` : 'No date'}</div></div>
          <button class="icon-btn" data-act="next" aria-label="Edit next step">${icon('edit')}</button>`
        : `<div class="txt muted">No next step. Every relationship should have one.</div><button class="btn sm" data-act="next">${icon('plus')}Set</button>`}
      </div>`)}

    ${c.pinned.length ? section('Don’t forget', 'pin', `<div class="pinned">${c.pinned.map((p) => `<div class="p">${icon('pin')}<span>${esc(p)}</span></div>`).join('')}</div>`) : ''}

    ${section('Conversations', 'note', `<div class="panel">
        <button class="btn block primary" data-act="log" style="margin-bottom:${touches.length ? 16 : 0}px">${icon('plus')}Log a call, text or note</button>
        ${touches.length ? `<div class="timeline">${(showAll ? touches : touches.slice(0, 5)).map((t) => `
          <div class="tl-item">
            <div class="tl-ic">${icon(TOUCH_TYPES[t.type]?.icon || 'note')}</div>
            <div class="tl-body">
              <div class="tl-meta"><b>${esc(TOUCH_TYPES[t.type]?.label || 'Note')}</b><span>${esc(fmtDate(t.date))} · ${esc(relDay(t.date))}</span>
                <button class="icon-btn tl-del" data-act="del-touch" data-tid="${t.id}" aria-label="Delete entry" style="width:28px;height:28px">${icon('trash')}</button></div>
              ${t.note ? `<div class="tl-note">${esc(t.note)}</div>` : ''}
            </div>
          </div>`).join('')}</div>
          ${touches.length > 5 && !showAll ? `<button class="link-btn" data-act="all-touches">Show all ${touches.length}</button>` : ''}` : ''}
      </div>`, { id: 'conversations' })}

    ${section('Family', 'users', `<div class="panel">
        ${c.spouse.name || c.kids.length || c.pets.length || c.anniversary ? `<div class="family">
          ${c.spouse.name ? `<div class="person"><span class="avatar" style="--s:36px;--c:var(--surface-3)">${icon('heart')}</span><div class="nm">${esc(c.spouse.name)}<small>Spouse / partner${c.spouse.notes ? ' · ' + esc(c.spouse.notes) : ''}</small></div>
            ${c.anniversary ? `<div class="age-pill" style="font-size:13px">${esc(fmtMonthDay(c.anniversary))}<small>Anniv.</small></div>` : ''}</div>` : ''}
          ${!c.spouse.name && c.anniversary ? `<div class="person"><span class="avatar" style="--s:36px;--c:var(--surface-3)">${icon('heart')}</span><div class="nm">Anniversary<small>${esc(fmtMonthDay(c.anniversary))}</small></div></div>` : ''}
          ${c.kids.map((k) => { const a = kidAge(k); return `<div class="person"><span class="avatar" style="--s:36px;--c:var(--surface-3)">${esc((k.name || '?')[0])}</span>
            <div class="nm">${esc(k.name || 'Kid')}<small>${k.birthday ? 'Birthday ' + esc(fmtMonthDay(k.birthday)) : k.notes ? esc(k.notes) : 'Child'}</small></div>
            ${a != null ? `<div class="age-pill">${ageLabel(a)}<small>${a === 1 ? 'yr' : 'yrs'}</small></div>` : ''}</div>`; }).join('')}
          ${c.pets.map((p) => `<div class="person"><span class="avatar" style="--s:36px;--c:var(--surface-3)">${icon('paw')}</span><div class="nm">${esc(p.name)}<small>${esc(p.kind || 'Pet')}</small></div></div>`).join('')}
        </div>` : `<div class="empty" style="padding:8px">Spouse, kids and pets — the details people love that you remember.<br><a class="link-btn" href="#/c/${c.id}/edit#family">Add family</a></div>`}
      </div>`)}
    </div>
    <div>
    ${section('Personal', 'heart', `<div class="panel kv-grid">
        ${c.hobbies.length ? `<div><div class="kv"><div style="flex:1"><div class="k">Hobbies & interests</div><div class="pill-list" style="margin-top:6px">${c.hobbies.map((h) => `<span class="pill">${esc(h)}</span>`).join('')}</div></div></div></div>` : ''}
        ${c.favoriteTreat ? `<div class="kv">${icon('coffee')}<div><div class="k">Favorite treat / small gift</div><div class="v">${esc(c.favoriteTreat)}</div></div></div>` : ''}
        ${c.favoriteLunch || c.favoriteDinner ? `<div class="grid2" style="gap:10px">
          ${c.favoriteLunch ? `<div class="kv">${icon('utensils')}<div><div class="k">Lunch spot</div><div class="v">${esc(c.favoriteLunch)}</div></div></div>` : ''}
          ${c.favoriteDinner ? `<div class="kv">${icon('moon')}<div><div class="k">Dinner spot</div><div class="v">${esc(c.favoriteDinner)}</div></div></div>` : ''}
        </div>` : ''}
        ${c.giftIdeas ? `<div class="kv">${icon('sparkle')}<div><div class="k">Gift ideas</div><div class="v">${esc(c.giftIdeas)}</div></div></div>` : ''}
        <div class="kv">${icon('gift')}<div style="flex:1"><div class="k" style="display:flex;justify-content:space-between">Gift log <button class="link-btn" data-act="add-gift">+ Add</button></div>
          ${c.gifts.length ? `<div style="margin-top:4px">${[...c.gifts].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((g) => `<div class="v" style="font-size:14px;display:flex;gap:8px;align-items:baseline"><span class="muted tnum" style="font-size:12px;min-width:84px">${esc(fmtDate(g.date, { year: true }))}</span><span style="flex:1">${esc(g.item)}${g.occasion ? ` <span class="muted">· ${esc(g.occasion)}</span>` : ''}</span><button class="icon-btn" data-act="del-gift" data-gid="${g.id}" style="width:28px;height:28px" aria-label="Remove">${icon('x')}</button></div>`).join('')}</div>` : `<div class="v muted" style="font-size:13.5px">Track what you've given so you never repeat a gift.</div>`}
        </div></div>
      </div>`)}

    ${section('Key dates', 'calendar', `<div class="panel kv-grid">
        ${c.birthday ? `<div class="kv">${icon('gift')}<div style="flex:1"><div class="k">Birthday</div><div class="v">${esc(fmtMonthDay(c.birthday))} <span class="muted">· ${esc(relDay(nextOccurrence(c.birthday)))}</span></div></div></div>` : ''}
        ${c.keyDates.map((d) => { const n = nextOccurrence(d.date, d.recurring !== false); return `<div class="kv">${icon('calendar')}<div style="flex:1"><div class="k">${esc(d.label || 'Date')}</div><div class="v">${esc(fmtMonthDay(d.date))}${n ? ` <span class="muted">· ${esc(relDay(n))}</span>` : ' <span class="muted">· passed</span>'}${d.recurring !== false ? ' <span class="muted">· yearly</span>' : ''}</div></div></div>`; }).join('')}
        ${!c.birthday && !c.keyDates.length ? `<div class="empty" style="padding:8px">Birthdays, renewals, work anniversaries.<br><a class="link-btn" href="#/c/${c.id}/edit#dates">Add a date</a></div>` : ''}
      </div>`)}

    ${section('Memory photos', 'camera', `<div class="photos">
        ${c.photos.map((p) => `<button class="photo" data-act="view-photo" data-pid="${p.id}"><img src="${p.data}" alt="${esc(p.caption || 'Photo')}">${p.caption ? `<span class="cap">${esc(p.caption)}</span>` : ''}</button>`).join('')}
        <button class="photo add" data-act="add-photo"><span>${icon('camera')}Add photo</span></button>
      </div>`)}

    ${section('Connections', 'link', `<div class="panel">
        <div class="rows">
          ${referredBy ? contactRow(referredBy, { sub: `${icon('refer')} Referred ${esc(c.firstName || 'them')} to you`, quick: false }) : ''}
          ${referrals.map((o) => contactRow(o, { sub: `Referred by ${esc(c.firstName || fullName(c))}`, quick: false })).join('')}
          ${linked.map((x) => `<div style="display:flex;align-items:center">${contactRow(x.c, { sub: esc(x.relation || 'Connected'), quick: false }).replace('class="row tap"', 'class="row tap" style="flex:1"')}<button class="icon-btn" data-act="del-conn" data-cid="${x.c.id}" aria-label="Remove link">${icon('x')}</button></div>`).join('')}
          ${linkedBack.map((x) => contactRow(x.c, { sub: esc(x.relation || 'Connected'), quick: false })).join('')}
        </div>
        ${!referredBy && !referrals.length && !linked.length && !linkedBack.length ? `<p class="muted" style="font-size:13.5px;margin-bottom:10px">Link spouses who are also contacts, coworkers, and who referred whom. It builds your referral tree.</p>` : ''}
        <div style="display:flex;gap:14px;margin-top:6px"><button class="link-btn" data-act="add-conn">+ Link a contact</button>${!referredBy ? `<button class="link-btn" data-act="set-referrer">+ Referred by…</button>` : ''}</div>
      </div>`)}
    </div>
    </div>

    ${section('Contact details', 'cards', `<div class="panel contact-lines" style="padding:4px 14px">
        ${c.phones.map((p) => `<div class="cline"><div class="k">${esc(p.label || 'Phone')}</div><div class="v tnum"><a href="${telHref(p.value)}" data-log="call" data-id="${c.id}">${esc(fmtPhone(p.value))}</a></div>
          <div class="acts"><a class="icon-btn" href="${smsHref(p.value)}" data-log="text" data-id="${c.id}" aria-label="Text">${icon('message')}</a><button class="icon-btn" data-copy="${esc(p.value)}" aria-label="Copy">${icon('copy')}</button></div></div>`).join('')}
        ${c.emails.map((e) => `<div class="cline"><div class="k">${esc(e.label || 'Email')}</div><div class="v"><a href="mailto:${esc(e.value)}" data-log="email" data-id="${c.id}">${esc(e.value)}</a></div>
          <div class="acts"><button class="icon-btn" data-copy="${esc(e.value)}" aria-label="Copy">${icon('copy')}</button></div></div>`).join('')}
        ${addr ? `<div class="cline"><div class="k">Address</div><div class="v"><a href="https://maps.google.com/?q=${encodeURIComponent(addr)}" target="_blank" rel="noopener">${esc(addr)}</a></div><div class="acts"><button class="icon-btn" data-copy="${esc(addr)}" aria-label="Copy">${icon('copy')}</button></div></div>` : ''}
        ${li ? `<div class="cline"><div class="k">LinkedIn</div><div class="v"><a href="${esc(li)}" target="_blank" rel="noopener">${esc(li.replace(/^https?:\/\/(www\.)?/, ''))}</a></div></div>` : `<div class="cline"><div class="k">LinkedIn</div><div class="v"><a class="link-btn" href="#/c/${c.id}/edit">Add profile link</a></div></div>`}
        ${c.website ? `<div class="cline"><div class="k">Website</div><div class="v"><a href="${esc(webUrl(c.website))}" target="_blank" rel="noopener">${esc(c.website)}</a></div></div>` : ''}
        ${c.prefs.bestTime ? `<div class="cline"><div class="k">Best time</div><div class="v">${esc(c.prefs.bestTime)}</div></div>` : ''}
        ${c.metAt ? `<div class="cline"><div class="k">Met</div><div class="v">${esc(c.metAt)}</div></div>` : ''}
        <div class="cline"><div class="k">Cadence</div><div class="v">Keep in touch every ${cadenceOf(c)} days<small>${c.cadenceDays ? 'Custom for this contact' : 'From group default'}</small></div></div>
        ${c.custom.map((f) => `<div class="cline"><div class="k">${esc(f.label)}</div><div class="v">${esc(f.value)}</div></div>`).join('')}
        ${c.tags.length ? `<div class="cline"><div class="k">Tags</div><div class="v"><div class="pill-list">${c.tags.map((t) => `<a class="pill" style="text-decoration:none;font-size:12.5px" href="#/search?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div></div></div>` : ''}
      </div>
      <p class="muted" style="font-size:12px;margin-top:10px;text-align:center">Added ${esc(fmtDate(c.createdAt, { year: true }))} · Updated ${esc(relDay(c.updatedAt))}</p>`)}
    <div class="hatch"></div>
    <div class="rec-delete"><button class="btn sm" data-act="delete">${icon('trash')}Delete contact</button></div>
  </div>`;

  container.onclick = (e) => recordClick(e, c, container);
}

async function recordClick(e, c, container) {
  const copy = e.target.closest('[data-copy]');
  if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copy); toast('Copied'); } catch { toast('Copy not available'); } return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  switch (act) {
    case 'back': if (history.length > 1) history.back(); else location.hash = '#/rolo'; break;
    case 'fav': c.favorite = !c.favorite; await Store.save(c); toast(c.favorite ? 'Added to favorites' : 'Removed from favorites'); break;
    case 'share': openShareSheet(c); break;
    case 'more': openMoreSheet(c); break;
    case 'photo': {
      const f = await pickFile('image/*'); if (!f) return;
      c.photo = await compressImage(f, { max: 400, square: true, quality: 0.82 }); await Store.save(c); break;
    }
    case 'log': openLogSheet(c); break;
    case 'intake': openIntake(c); break;
    case 'delete': deleteContact(c); break;
    case 'next': openNextStepSheet(c); break;
    case 'done': completeNextStep(c); break;
    case 'all-touches': container.dataset.allTouches = c.id; renderRecord(container, c.id); break;
    case 'del-touch': {
      const tid = b.dataset.tid; const t = c.touches.find((x) => x.id === tid);
      c.touches = c.touches.filter((x) => x.id !== tid); await Store.save(c);
      toast('Entry deleted', { action: 'Undo', onAction: async () => { c.touches.push(t); await Store.save(c); } });
      break;
    }
    case 'add-gift': openGiftSheet(c); break;
    case 'del-gift': c.gifts = c.gifts.filter((g) => g.id !== b.dataset.gid); await Store.save(c); break;
    case 'add-photo': {
      const files = await pickFile('image/*', true); if (!files || !files.length) return;
      for (const f of files) c.photos.push({ id: uid('ph'), data: await compressImage(f, { max: 1100 }), caption: '', date: new Date().toISOString() });
      await Store.save(c);
      const last = c.photos[c.photos.length - 1];
      openPhotoViewer(c, last.id, true);
      break;
    }
    case 'view-photo': openPhotoViewer(c, b.dataset.pid); break;
    case 'add-conn': {
      const o = await pickContact(c.id, 'Link a contact'); if (!o) return;
      const rel = await promptText('How are they connected?', 'e.g. Spouse, business partner, coworker');
      c.connections.push({ contactId: o.id, relation: rel || '' }); await Store.save(c); break;
    }
    case 'set-referrer': {
      const o = await pickContact(c.id, 'Who referred them?'); if (!o) return;
      c.referredBy = o.id; await Store.save(c); toast(`${o.firstName || fullName(o)} added as referrer`); break;
    }
    case 'del-conn': c.connections = c.connections.filter((x) => x.contactId !== b.dataset.cid); await Store.save(c); break;
  }
}

/* ---------- Sheets used by the record page ---------- */
function openLogSheet(c, type = 'call', opts = {}) {
  const existing = opts.touchId ? c.touches.find((x) => x.id === opts.touchId) : null;
  if (existing) type = existing.type;
  const now = existing ? new Date(existing.date) : new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const s = openSheet(`
    <div class="type-chips">${Object.entries(TOUCH_TYPES).filter(([k]) => k !== 'gift').map(([k, v]) => `<button class="chip ${k === type ? 'on' : ''}" data-type="${k}">${icon(v.icon)}${v.label}</button>`).join('')}</div>
    <label class="field"><span>What did you talk about?</span><textarea id="lg-note" rows="4" placeholder="Kids, plans, what they need, what you promised…" autofocus>${esc(existing ? existing.note : '')}</textarea></label>
    <label class="field"><span>When</span><input id="lg-date" type="datetime-local" value="${local}"></label>
    <div class="form-section" style="margin-top:6px"><h3>${icon('bell')}Next step</h3>
      <label class="field"><input id="lg-next" placeholder="e.g. Send quote, invite to lunch" value="${esc(c.nextStep.text)}"></label>
      ${dueChipsHTML(c.nextStep.due, 'lg-due')}
    </div>
    <div class="row-btns"><button class="btn ghost" data-sheet-close>Cancel</button><button class="btn primary" id="lg-save">Save</button></div>`,
    { title: `${existing ? 'Add a note' : 'Log touch'} · ${c.firstName || fullName(c)}` });
  let t = type;
  s.el.querySelector('.type-chips').onclick = (e) => {
    const b = e.target.closest('[data-type]'); if (!b) return;
    t = b.dataset.type; $$('.type-chips .chip', s.el).forEach((x) => x.classList.toggle('on', x === b));
  };
  bindDueChips(s.el, 'lg-due');
  $('#lg-save', s.el).onclick = async () => {
    const d = $('#lg-date', s.el).value;
    const entry = { type: t, date: d ? new Date(d).toISOString() : new Date().toISOString(), note: $('#lg-note', s.el).value.trim() };
    const cur = existing && c.touches.find((x) => x.id === existing.id);
    if (cur) Object.assign(cur, entry); else c.touches.push({ id: uid('t'), ...entry });
    c.nextStep = { text: $('#lg-next', s.el).value.trim(), due: $('#lg-due', s.el).value };
    await Store.save(c);
    s.close();
    toast(cur ? 'Note saved' : `${TOUCH_TYPES[t].label} logged`);
  };
}

function dueChipsHTML(val, id) {
  const opts = [['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14], ['1 month', 30], ['3 months', 90]];
  return `<div class="chips" style="margin-bottom:10px" data-due-chips="${id}">${opts.map(([l, n]) => `<button class="chip sm" data-days="${n}">${l}</button>`).join('')}</div>
    <label class="field"><span>Due date</span><input id="${id}" type="date" value="${esc(val || '')}"></label>`;
}
function bindDueChips(root, id) {
  const wrap = $(`[data-due-chips="${id}"]`, root);
  wrap.onclick = (e) => {
    const b = e.target.closest('[data-days]'); if (!b) return;
    $(`#${id}`, root).value = ymd(addDays(new Date(), +b.dataset.days));
    $$('.chip', wrap).forEach((x) => x.classList.toggle('on', x === b));
  };
}

function openNextStepSheet(c) {
  const s = openSheet(`
    <label class="field"><span>What's next?</span><input id="ns-text" value="${esc(c.nextStep.text)}" placeholder="e.g. Call about renewal" autofocus></label>
    ${dueChipsHTML(c.nextStep.due, 'ns-due')}
    <div class="row-btns">${c.nextStep.text || c.nextStep.due ? '<button class="btn danger" id="ns-clear">Clear</button>' : ''}<button class="btn primary" id="ns-save">Save</button></div>`, { title: 'Next step' });
  bindDueChips(s.el, 'ns-due');
  $('#ns-save', s.el).onclick = async () => { c.nextStep = { text: $('#ns-text', s.el).value.trim(), due: $('#ns-due', s.el).value }; await Store.save(c); s.close(); };
  const cl = $('#ns-clear', s.el); if (cl) cl.onclick = async () => { c.nextStep = { text: '', due: '' }; await Store.save(c); s.close(); };
}

function openGiftSheet(c) {
  const s = openSheet(`
    <label class="field"><span>What did you give?</span><input id="gf-item" placeholder="e.g. Peanut brittle from Pete's" value="${esc(c.favoriteTreat || '')}" autofocus></label>
    <div class="grid2"><label class="field"><span>Date</span><input id="gf-date" type="date" value="${ymd()}"></label>
    <label class="field"><span>Occasion</span><input id="gf-occ" placeholder="Holiday, thank-you…"></label></div>
    <label class="toggle"><input type="checkbox" id="gf-touch" checked> Also add to conversation history</label>
    <div class="row-btns"><button class="btn ghost" data-sheet-close>Cancel</button><button class="btn primary" id="gf-save">Save gift</button></div>`, { title: 'Log a gift' });
  $('#gf-save', s.el).onclick = async () => {
    const item = $('#gf-item', s.el).value.trim(); if (!item) return;
    const date = $('#gf-date', s.el).value || ymd(); const occ = $('#gf-occ', s.el).value.trim();
    c.gifts.push({ id: uid('g'), date, item, occasion: occ });
    if ($('#gf-touch', s.el).checked) c.touches.push({ id: uid('t'), type: 'gift', date: parseYmd(date).toISOString(), note: `Gave ${item}${occ ? ' (' + occ + ')' : ''}` });
    await Store.save(c); s.close(); toast('Gift logged');
  };
}

function openPhotoViewer(c, pid, isNew = false) {
  const p = c.photos.find((x) => x.id === pid); if (!p) return;
  const s = openSheet(`<div class="viewer"><img src="${p.data}" alt=""></div>
    <label class="field" style="margin-top:12px"><span>Caption — what should this help you remember?</span><input id="pv-cap" value="${esc(p.caption)}" placeholder="e.g. His boat at Lake Tenkiller" ${isNew ? 'autofocus' : ''}></label>
    <div class="row-btns"><button class="btn danger" id="pv-del">${icon('trash')}Delete</button><button class="btn primary" id="pv-save">Save</button></div>`, { title: 'Memory photo' });
  $('#pv-save', s.el).onclick = async () => { p.caption = $('#pv-cap', s.el).value.trim(); await Store.save(c); s.close(); };
  $('#pv-del', s.el).onclick = async () => { if (await confirmDialog('Delete this photo?', { ok: 'Delete', danger: true })) { c.photos = c.photos.filter((x) => x.id !== pid); await Store.save(c); s.close(); } };
}

function openMoreSheet(c) {
  const s = openSheet(`<div class="menu-list">
    <a class="menu-item" href="#/c/${c.id}/edit" data-sheet-close>${icon('edit')}<span class="tx"><b>Edit contact</b></span></a>
    <button class="menu-item" data-m="share">${icon('share')}<span class="tx"><b>Share card</b><small>Text a contact card to someone</small></span></button>
    <button class="menu-item" data-m="print">${icon('printer')}<span class="tx"><b>Print rolodex card</b><small>Fits a standard 2¼ × 4 rotary card</small></span></button>
    <button class="menu-item" data-m="vcf">${icon('download')}<span class="tx"><b>Save to phone contacts</b><small>Downloads a .vcf contact file</small></span></button>
    <button class="menu-item" data-m="delete" style="color:var(--danger)">${icon('trash')}<span class="tx"><b>Delete contact</b></span></button>
  </div>`, { title: fullName(c) });
  s.el.onclick = async (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const m = b.dataset.m; s.close();
    if (m === 'share') openShareSheet(c);
    if (m === 'print') printCards([c]);
    if (m === 'vcf') downloadBlob(new Blob([toVCard(c)], { type: 'text/vcard' }), `${fullName(c).replace(/\s+/g, '_')}.vcf`);
    if (m === 'delete') deleteContact(c);
  };
}

function pickContact(excludeId, title = 'Choose a contact') {
  return new Promise((resolve) => {
    let picked = null;
    const s = openSheet(`<label class="searchbox" style="margin-bottom:8px">${icon('search')}<input id="pk-q" placeholder="Search contacts" autofocus></label><div id="pk-list" class="rows"></div>`,
      { title, onClose: () => resolve(picked) });
    const draw = () => {
      const q = $('#pk-q', s.el).value.trim().toLowerCase();
      const list = Store.sorted().filter((o) => o.id !== excludeId && (!q || fullName(o).toLowerCase().includes(q) || (o.company || '').toLowerCase().includes(q))).slice(0, 40);
      $('#pk-list', s.el).innerHTML = list.map((o) => `<button class="row tap" data-pick="${o.id}" style="background:none;border:0;border-bottom:1px solid var(--line);text-align:left;width:100%">${avatarHTML(o, 36)}<div class="main-col"><div class="t1">${esc(fullName(o))}</div><div class="t2">${esc(roleLine(o))}</div></div></button>`).join('') || '<div class="empty">No matches</div>';
    };
    draw();
    $('#pk-q', s.el).oninput = draw;
    $('#pk-list', s.el).onclick = (e) => { const b = e.target.closest('[data-pick]'); if (b) { picked = Store.get(b.dataset.pick); s.close(); } };
  });
}

function promptText(title, placeholder = '', value = '') {
  return new Promise((resolve) => {
    let val = null;
    const s = openSheet(`<label class="field"><input id="pt-v" placeholder="${esc(placeholder)}" value="${esc(value)}" autofocus></label>
      <div class="row-btns"><button class="btn ghost" data-sheet-close>Skip</button><button class="btn primary" id="pt-ok">Save</button></div>`,
      { title, center: true, onClose: () => resolve(val) });
    const ok = () => { val = $('#pt-v', s.el).value.trim(); s.close(); };
    $('#pt-ok', s.el).onclick = ok;
    $('#pt-v', s.el).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
  });
}

/** Delete with an Undo window. `ask` shows a confirm first (record page); swipe-to-delete skips it. */
async function deleteContact(c, { ask = true, stay = false } = {}) {
  if (ask && !(await confirmDialog(`Delete ${fullName(c)}? You can undo right after.`, { ok: 'Delete', danger: true }))) return;
  // snapshot this contact plus anyone who links to it, so Undo restores the links too
  const linked = Store.list().filter((o) => o.id !== c.id && (o.referredBy === c.id || o.connections.some((x) => x.contactId === c.id)));
  const snap = JSON.parse(JSON.stringify([c, ...linked]));
  await Store.remove(c.id);
  if (UI.roloFrontId === c.id) UI.roloFrontId = null;
  if (!stay) location.hash = '#/rolo';
  toast(`${fullName(c)} deleted`, { action: 'Undo', duration: 8000, onAction: async () => { await Store.saveMany(snap); toast('Restored'); } });
}
