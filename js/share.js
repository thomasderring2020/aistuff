/* Rolo — share card (text/vCard/image) and printable rolodex cards */
'use strict';

function vEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }

/** Build a vCard 3.0. `inc` limits which fields are shared. */
function toVCard(c, inc = { phone: true, email: true, work: true, address: true, linkedin: true, photo: true, notes: false }) {
  const L = ['BEGIN:VCARD', 'VERSION:3.0'];
  L.push(`N:${vEsc(c.lastName)};${vEsc(c.firstName)};;;`);
  L.push(`FN:${vEsc(fullName(c))}`);
  if (c.nickname) L.push(`NICKNAME:${vEsc(c.nickname)}`);
  if (inc.work) { if (c.company) L.push(`ORG:${vEsc(c.company)}`); if (c.title) L.push(`TITLE:${vEsc(c.title)}`); }
  if (inc.phone) c.phones.forEach((p) => L.push(`TEL;TYPE=${/mobile|cell/i.test(p.label) ? 'CELL' : /home/i.test(p.label) ? 'HOME' : 'WORK'},VOICE:${p.value}`));
  if (inc.email) c.emails.forEach((e) => L.push(`EMAIL;TYPE=${/personal|home/i.test(e.label) ? 'HOME' : 'WORK'},INTERNET:${e.value}`));
  if (inc.address && addressLine(c)) { const a = c.address; L.push(`ADR;TYPE=WORK:;;${vEsc(a.street)};${vEsc(a.city)};${vEsc(a.state)};${vEsc(a.zip)};`); }
  if (inc.linkedin && c.linkedin) L.push(`URL;TYPE=LinkedIn:${linkedinUrl(c.linkedin)}`);
  if (inc.work && c.website) L.push(`URL:${webUrl(c.website)}`);
  if (inc.birthday && c.birthday) L.push(`BDAY:${/^\d{4}/.test(c.birthday) ? c.birthday : '--' + c.birthday.replace('-', '')}`);
  if (inc.photo && c.photo && c.photo.startsWith('data:image/jpeg;base64,')) {
    const b64 = c.photo.split(',')[1];
    const line = `PHOTO;ENCODING=b;TYPE=JPEG:${b64}`;
    L.push(line.replace(/(.{74})/g, '$1\r\n '));
  }
  if (inc.notes && c.pinned.length) L.push(`NOTE:${vEsc(c.pinned.join(' / '))}`);
  L.push('END:VCARD');
  return L.join('\r\n') + '\r\n';
}

function shareText(c, inc) {
  const lines = [fullName(c)];
  if (inc.work && roleLine(c)) lines.push(roleLine(c));
  if (inc.phone) c.phones.forEach((p) => lines.push(`${p.label ? p.label + ': ' : ''}${fmtPhone(p.value)}`));
  if (inc.email) c.emails.forEach((e) => lines.push(e.value));
  if (inc.address && addressLine(c)) lines.push(addressLine(c));
  if (inc.linkedin && c.linkedin) lines.push(linkedinUrl(c.linkedin));
  return lines.join('\n');
}

async function cardImage(c, inc) {
  await document.fonts.ready;
  const W = 1200, H = 700, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const paper = css.getPropertyValue('--paper').trim() || '#f5eedd';
  const ink = css.getPropertyValue('--paper-ink').trim() || '#1b2236';
  const ink2 = css.getPropertyValue('--paper-ink-2').trim() || '#5a6178';
  const bg = css.getPropertyValue('--bg').trim() || '#0e1424';
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // card
  const r = 34, cx = 60, cy = 60, cw = W - 120, ch = H - 120;
  x.save();
  x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 40; x.shadowOffsetY = 18;
  x.beginPath(); x.roundRect(cx, cy, cw, ch, r); x.fillStyle = paper; x.fill();
  x.restore();
  // subtle grain
  x.save(); x.beginPath(); x.roundRect(cx, cy, cw, ch, r); x.clip();
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(90,75,50,${Math.random() * 0.05})`; x.fillRect(cx + Math.random() * cw, cy + Math.random() * ch, 1.5, 1.5); }
  x.restore();
  x.fillStyle = contactColor(c); x.beginPath(); x.roundRect(cx, cy + 40, 10, ch - 80, [0, 6, 6, 0]); x.fill();
  // name
  x.fillStyle = ink; x.font = '700 70px Geist, system-ui, sans-serif'; x.textBaseline = 'alphabetic';
  x.fillText(fullName(c), cx + 70, cy + 140, cw - 140);
  let y = cy + 196;
  if (inc.work && roleLine(c)) { x.fillStyle = ink2; x.font = '400 34px Geist, system-ui, sans-serif'; x.fillText(roleLine(c), cx + 72, y, cw - 140); y += 30; }
  // dashed rule
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.setLineDash([12, 8]); x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 70, y + 22); x.lineTo(cx + cw - 70, y + 22); x.stroke(); x.setLineDash([]);
  y += 90;
  x.fillStyle = ink; x.font = '500 38px Geist, system-ui, sans-serif';
  const lines = [];
  if (inc.phone) c.phones.slice(0, 2).forEach((p) => lines.push(`${fmtPhone(p.value)}  ${p.label ? '· ' + p.label : ''}`));
  if (inc.email) c.emails.slice(0, 1).forEach((e) => lines.push(e.value));
  if (inc.address && addressLine(c)) lines.push(addressLine(c));
  if (inc.linkedin && c.linkedin) lines.push(linkedinUrl(c.linkedin).replace(/^https?:\/\/(www\.)?/, ''));
  lines.slice(0, 4).forEach((l) => { x.fillText(l, cx + 72, y, cw - 140); y += 56; });
  // footer
  x.fillStyle = ink2; x.font = '600 22px Geist, system-ui, sans-serif'; x.textAlign = 'right';
  x.fillText('shared with Rolo', cx + cw - 50, cy + ch - 34);
  x.textAlign = 'left';
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

function openShareSheet(c) {
  const inc = { phone: true, email: true, work: true, address: false, linkedin: !!c.linkedin, photo: false };
  const opts = [['phone', 'Phone'], ['email', 'Email'], ['work', 'Company & title'], ['address', 'Address'], ['linkedin', 'LinkedIn'], ['photo', 'Photo']]
    .filter(([k]) => (k !== 'photo' || c.photo) && (k !== 'linkedin' || c.linkedin) && (k !== 'address' || addressLine(c)));
  const s = openSheet(`
    <div class="paper share-preview" id="sh-prev"></div>
    <div class="field"><span>Include</span></div>
    <div class="include">${opts.map(([k, l]) => `<button class="chip ${inc[k] ? 'on' : ''}" data-inc="${k}">${l}</button>`).join('')}</div>
    <div class="menu-list">
      <button class="menu-item" data-s="share">${icon('message')}<span class="tx"><b>Send by text or email</b><small>Sends a contact card they can save with one tap</small></span></button>
      <button class="menu-item" data-s="copy">${icon('copy')}<span class="tx"><b>Copy as text</b><small>Paste into any message</small></span></button>
      <button class="menu-item" data-s="image">${icon('image')}<span class="tx"><b>Share as image</b><small>A clean picture of the card</small></span></button>
      <button class="menu-item" data-s="vcf">${icon('download')}<span class="tx"><b>Download contact file</b><small>.vcf — opens in any phone or Outlook</small></span></button>
      <button class="menu-item" data-s="print">${icon('printer')}<span class="tx"><b>Print rolodex card</b></span></button>
    </div>`, { title: 'Share card' });
  const draw = () => {
    $('#sh-prev', s.el).innerHTML = `<div class="nm">${esc(fullName(c))}</div>${inc.work && roleLine(c) ? `<div class="rl">${esc(roleLine(c))}</div>` : ''}
      <div style="margin-top:8px">${shareText(c, inc).split('\n').slice(inc.work && roleLine(c) ? 2 : 1).map((l) => `<div class="ln">${esc(l)}</div>`).join('') || '<div class="ln muted">Just the name</div>'}</div>`;
  };
  draw();
  s.el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-inc]');
    if (t) { inc[t.dataset.inc] = !inc[t.dataset.inc]; t.classList.toggle('on'); draw(); return; }
    const b = e.target.closest('[data-s]'); if (!b) return;
    const name = fullName(c);
    const fname = name.replace(/[^\w]+/g, '_');
    const text = shareText(c, inc);
    const vcf = new File([toVCard(c, inc)], `${fname}.vcf`, { type: 'text/vcard' });
    try {
      if (b.dataset.s === 'share') {
        if (navigator.canShare && navigator.canShare({ files: [vcf] })) {
          await navigator.share({ files: [vcf], title: name, text: `${name}'s contact info` });
        } else if (navigator.share) {
          await navigator.share({ title: name, text });
        } else {
          await navigator.clipboard.writeText(text);
          toast('Copied — paste it into your message');
        }
      }
      if (b.dataset.s === 'copy') { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
      if (b.dataset.s === 'image') {
        const blob = await cardImage(c, inc);
        const f = new File([blob], `${fname}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: name });
        else downloadBlob(blob, `${fname}.png`);
      }
      if (b.dataset.s === 'vcf') downloadBlob(vcf, vcf.name);
      if (b.dataset.s === 'print') { s.close(); printCards([c]); }
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('Sharing isn\u2019t available here — try Copy');
    }
  });
}

function printCards(list) {
  const root = $('#print-root');
  root.innerHTML = `<div class="print-note">Rolo · ${list.length} card${list.length === 1 ? '' : 's'} · 2¼″ × 4″ rotary card size — trim on the lines.</div>` +
    list.map((c) => `<div class="print-card">
      <div class="tabmark">${esc(letterOf(c))}</div>
      <div class="pn">${esc(fullName(c))}</div>
      ${roleLine(c) ? `<div class="pr">${esc(roleLine(c))}</div>` : ''}
      <div class="pl">
        ${c.phones.slice(0, 2).map((p) => `${esc(fmtPhone(p.value))} <span style="color:#888">${esc(p.label)}</span>`).join('<br>')}
        ${c.emails[0] ? `<br>${esc(c.emails[0].value)}` : ''}
        ${addressLine(c) ? `<br>${esc(addressLine(c))}` : ''}
      </div>
      <div class="slots"><i></i><i></i></div>
    </div>`).join('');
  setTimeout(() => window.print(), 60);
}
