/* Rolo — shared utilities */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DAY = 86400000;

/** Local YYYY-MM-DD for a Date */
function ymd(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
/** Parse YYYY-MM-DD as a local date (no timezone shift) */
function parseYmd(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) { const d = new Date(s); return isNaN(d) ? null : d; }
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d, opts = {}) {
  if (!d) return '';
  if (typeof d === 'string') d = d.length <= 10 ? parseYmd(d) : new Date(d);
  if (!d || isNaN(d)) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear && !opts.year ? '' : ', ' + d.getFullYear()}`;
}
function fmtTime(d) {
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
/** "today", "yesterday", "3d ago", "in 4d" */
function relDay(d) {
  if (!d) return '';
  if (typeof d === 'string') d = d.length <= 10 ? parseYmd(d) : new Date(d);
  const n = daysBetween(new Date(), d);
  if (n === 0) return 'today';
  if (n === -1) return 'yesterday';
  if (n === 1) return 'tomorrow';
  if (n < 0) {
    const a = -n;
    if (a < 14) return `${a}d ago`;
    if (a < 60) return `${Math.round(a / 7)}w ago`;
    if (a < 365) return `${Math.round(a / 30)}mo ago`;
    return `${(a / 365).toFixed(1).replace('.0', '')}y ago`;
  }
  if (n < 14) return `in ${n}d`;
  if (n < 60) return `in ${Math.round(n / 7)}w`;
  return `in ${Math.round(n / 30)}mo`;
}

function fmtPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p || '';
}
const telHref = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
const smsHref = (p) => 'sms:' + String(p || '').replace(/[^\d+]/g, '');

function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function initials(c) {
  const a = (c.firstName || '').trim()[0] || '';
  const b = (c.lastName || '').trim()[0] || '';
  return (a + b || (c.company || '?')[0] || '?').toUpperCase();
}

/* ---------- Toasts ---------- */
function toast(msg, opts = {}) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  const actions = opts.actions || (opts.action ? [{ label: opts.action, onAction: opts.onAction }] : []);
  el.innerHTML = `<span>${esc(msg)}</span>` + actions.map((a, i) => `<button class="toast-btn ${i ? 'ghost' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('');
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  el.querySelectorAll('.toast-btn').forEach((b) => { b.onclick = () => { close(); const a = actions[+b.dataset.i]; a.onAction && a.onAction(); }; });
  setTimeout(close, opts.duration || (actions.length ? 7000 : 2600));
  return close;
}

/* ---------- Bottom sheets / dialogs ---------- */
let sheetStack = [];
function openSheet(html, opts = {}) {
  const root = $('#sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap' + (opts.center ? ' center' : '');
  wrap.innerHTML = `<div class="sheet-scrim"></div>
    <div class="sheet ${opts.className || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title || 'Dialog')}">
      <div class="sheet-grip" aria-hidden="true"></div>
      ${opts.title ? `<header class="sheet-head"><h2>${esc(opts.title)}</h2><button class="icon-btn" data-sheet-close aria-label="Close">${icon('x')}</button></header>` : ''}
      <div class="sheet-body">${html}</div>
    </div>`;
  root.appendChild(wrap);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => wrap.classList.add('open'));
  const api = {
    el: wrap.querySelector('.sheet'),
    close() {
      wrap.classList.remove('open');
      sheetStack = sheetStack.filter((s) => s !== api);
      if (!sheetStack.length) document.body.classList.remove('has-sheet');
      setTimeout(() => wrap.remove(), 260);
      opts.onClose && opts.onClose();
    }
  };
  wrap.querySelector('.sheet-scrim').onclick = () => api.close();
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-close]')) api.close(); });
  sheetStack.push(api);
  setTimeout(() => { const f = wrap.querySelector('[autofocus]'); if (f) f.focus(); }, 280);
  return api;
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetStack.length) sheetStack[sheetStack.length - 1].close();
});

function confirmDialog(message, { ok = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const s = openSheet(`<p class="confirm-msg">${esc(message)}</p>
      <div class="row-btns"><button class="btn ghost" data-no>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(ok)}</button></div>`,
      { center: true, className: 'confirm', onClose: () => { if (!done) resolve(false); } });
    s.el.querySelector('[data-no]').onclick = () => { done = true; resolve(false); s.close(); };
    s.el.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); s.close(); };
  });
}

/* ---------- Files & images ---------- */
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function readFileAs(file, how = 'text') {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    if (how === 'dataURL') r.readAsDataURL(file);
    else if (how === 'arrayBuffer') r.readAsArrayBuffer(file);
    else r.readAsText(file);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
/** Shrink a photo so it doesn't eat device storage. square=true center-crops. */
async function compressImage(file, { max = 1100, square = false, quality = 0.8 } = {}) {
  const url = await readFileAs(file, 'dataURL');
  const img = await loadImage(url);
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
function pickFile(accept, multiple = false) {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
    inp.style.display = 'none';
    inp.onchange = () => { resolve(multiple ? Array.from(inp.files) : inp.files[0]); inp.remove(); };
    document.body.appendChild(inp); inp.click();
  });
}
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
