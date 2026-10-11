/* Rolo — the 3D flipping rolodex wheel */
'use strict';

const TAB_COLORS = ['#4F6EE8', '#12A37A', '#E0526A', '#E19A22', '#8B5CF6', '#0EA2B8', '#EA7B3C'];

class Rolodex {
  constructor(stage, { onOpen, onFront, onSettle } = {}) {
    this.stage = stage;
    this.onOpen = onOpen; this.onFront = onFront; this.onSettle = onSettle;
    this.items = [];
    this.pos = 0; this.target = 0; this.raf = null;
    this.nodes = new Map();
    this.lastFront = -1;
    this.bind();
  }

  setContacts(contacts, keepId) {
    const items = [];
    let letter = null, tabIdx = 0;
    const counts = {};
    contacts.forEach((c) => { const l = letterOf(c); counts[l] = (counts[l] || 0) + 1; });
    contacts.forEach((c) => {
      const l = letterOf(c);
      if (l !== letter) {
        letter = l;
        items.push({ type: 'divider', letter: l, count: counts[l], tabSlot: tabIdx % 5, color: TAB_COLORS[tabIdx % TAB_COLORS.length] });
        tabIdx++;
      }
      items.push({ type: 'contact', contact: c, letter: l });
    });
    this.items = items;
    this.nodes.forEach((n) => n.remove());
    this.nodes.clear();
    let start = items.findIndex((it) => it.type === 'contact');
    if (keepId) { const k = items.findIndex((it) => it.contact && it.contact.id === keepId); if (k >= 0) start = k; }
    this.pos = this.target = Math.max(0, start);
    this.lastFront = -1;
    this.render();
  }

  letters() {
    const m = {};
    this.items.forEach((it, i) => { if (it.type === 'divider') m[it.letter] = i; });
    return m;
  }
  frontIndex() { return Math.max(0, Math.min(this.items.length - 1, Math.round(this.pos))); }
  frontItem() { return this.items[this.frontIndex()]; }

  /* ---------- rendering ---------- */
  cardHTML(it) {
    if (it.type === 'divider') {
      const left = 14 + it.tabSlot * 17;
      return `<div class="face front" style="--tab:${it.color}">
          <div class="tab" style="left:${left}%;--tab:${it.color}">${esc(it.letter)}</div>
          <div class="tabcard" style="--tab:${it.color}"></div>
          <div class="big">${esc(it.letter)}</div>
          <div class="cnt">${it.count} ${it.count === 1 ? 'card' : 'cards'}</div>
        </div><div class="face back"></div><div class="shade"></div>`;
    }
    const c = it.contact;
    const w = warmth(c);
    const role = [c.title, c.company && c.company !== fullName(c) ? c.company : ''].filter(Boolean).join(' · ');
    const phone = primaryPhone(c), email = primaryEmail(c);
    const city = [c.address.city, c.address.state].filter(Boolean).join(', ');
    return `<div class="face front paper">
        <div class="rc-head">
          <div style="flex:1;min-width:0;padding-right:44px">
            <div class="rc-name">${esc(c.firstName)} <span class="last">${esc(c.lastName)}</span>${!c.firstName && !c.lastName ? esc(c.company) : ''}</div>
            ${role ? `<div class="rc-role">${esc(role)}</div>` : ''}
          </div>
        </div>
        <div class="rc-corner">
          ${c.favorite ? `<span class="fav on" title="Favorite">${icon('star')}</span>` : ''}
          ${c.photo ? `<span class="avatar" style="--s:36px"><img src="${c.photo}" alt=""></span>` : `<span class="wdot ${w.key}" title="${esc(w.label)}"></span>`}
        </div>
        <div class="rc-rule"></div>
        <div class="rc-lines tnum">
          ${phone ? `<div>${icon('phone')}${esc(fmtPhone(phone))}</div>` : ''}
          ${email ? `<div>${icon('mail')}${esc(email)}</div>` : ''}
          ${city ? `<div>${icon('map')}${esc(city)}</div>` : ''}
        </div>
      </div><div class="face back"></div><div class="shade"></div>`;
  }

  render() {
    const n = this.items.length;
    const lo = Math.max(0, Math.floor(this.pos) - 2), hi = Math.min(n - 1, Math.floor(this.pos) + 8);
    // remove out-of-window nodes
    this.nodes.forEach((el, i) => { if (i < lo || i > hi) { el.remove(); this.nodes.delete(i); } });
    for (let i = lo; i <= hi; i++) {
      const it = this.items[i];
      let el = this.nodes.get(i);
      if (!el) {
        el = document.createElement('div');
        el.className = 'rolo-card' + (it.type === 'divider' ? ' divider' : '');
        el.dataset.idx = i;
        el.innerHTML = this.cardHTML(it);
        this.stage.appendChild(el);
        this.nodes.set(i, el);
      }
      const d = i - this.pos;
      let t, z, op = 1, shade = 0;
      if (d < 0) {
        const a = Math.max(d, -1.25);
        t = `translateZ(${-a * 30}px) rotateX(${a * 112}deg)`;
        z = 2000 + Math.round(d * 10);
        op = d < -0.35 ? Math.max(0, 1 + (d + 0.35) * 2.5) : 1;
        shade = Math.min(0.35, -d * 0.4);
      } else {
        const dd = Math.min(d, 8);
        t = `translateY(${-dd * 8}px) translateZ(${-dd * 22}px) rotateX(${dd * 4.5}deg)`;
        z = 1000 - Math.round(d * 10);
        shade = Math.min(0.55, dd * 0.085);
        op = d > 7 ? Math.max(0, 8 - d) : 1;
      }
      el.style.transform = t;
      el.style.zIndex = z;
      el.style.setProperty('--op', op.toFixed(3)); // opacity on faces, not the 3D parent (keeps backfaces hidden)
      el.style.visibility = op <= 0.01 ? 'hidden' : 'visible';
      const sh = el.querySelector('.shade');
      if (sh) sh.style.opacity = shade;
    }
    const f = this.frontIndex();
    if (f !== this.lastFront) { this.lastFront = f; this.onFront && this.onFront(this.items[f], f); }
  }

  /* ---------- motion ---------- */
  clamp(v) { return Math.max(0, Math.min(this.items.length - 1, v)); }
  animateTo(t, settle = true) {
    this.target = this.clamp(t);
    cancelAnimationFrame(this.raf);
    const step = () => {
      const diff = this.target - this.pos;
      if (Math.abs(diff) < 0.002) {
        this.pos = this.target; this.render();
        if (settle && this.onSettle) this.onSettle(this.frontItem());
        return;
      }
      this.pos += diff * 0.2;
      this.render();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  next(n = 1) { this.animateTo(Math.round(this.target) + n); }
  jumpToLetter(l) { const m = this.letters(); if (m[l] != null) this.animateTo(m[l] + 1 < this.items.length ? m[l] + 1 : m[l]); }
  jumpToId(id) { const i = this.items.findIndex((it) => it.contact && it.contact.id === id); if (i >= 0) this.animateTo(i); }

  bind() {
    const st = this.stage;
    let snapT;
    st.addEventListener('wheel', (e) => {
      e.preventDefault();
      cancelAnimationFrame(this.raf);
      const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      this.pos = this.clamp(this.pos - dy * 0.0042); // reversed: scroll down = flip back
      this.target = this.pos;
      this.render();
      clearTimeout(snapT);
      snapT = setTimeout(() => this.animateTo(Math.round(this.pos)), 120);
    }, { passive: false });

    let drag = null;
    st.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(this.raf);
      drag = { y: e.clientY, x: e.clientX, pos: this.pos, t: performance.now(), lastY: e.clientY, lastT: performance.now(), v: 0, moved: false, target: e.target, id: e.pointerId };
    });
    st.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y; // reversed: pull down to flip forward
      if (!drag.moved && Math.abs(dy) > 6) { drag.moved = true; try { st.setPointerCapture(e.pointerId); } catch {} }
      if (!drag.moved) return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT);
      drag.v = 0.8 * ((e.clientY - drag.lastY) / dt) + 0.2 * drag.v;
      drag.lastY = e.clientY; drag.lastT = now;
      this.pos = this.clamp(drag.pos + dy / 64);
      this.target = this.pos;
      this.render();
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moved) { this.tap(d.target); return; }
      const fling = d.v * 5.5; // cards per (px/ms)
      this.animateTo(Math.round(this.pos + fling));
    };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);

    st.tabIndex = 0;
    st.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); this.next(1); }
      else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); this.next(-1); }
      else if (k === 'PageDown') { e.preventDefault(); this.next(5); }
      else if (k === 'PageUp') { e.preventDefault(); this.next(-5); }
      else if (k === 'Home') { e.preventDefault(); this.animateTo(0); }
      else if (k === 'End') { e.preventDefault(); this.animateTo(this.items.length - 1); }
      else if (k === 'Enter') { const it = this.frontItem(); if (it && it.contact) this.onOpen(it.contact); }
      else if (/^[a-z]$/i.test(k) && !e.metaKey && !e.ctrlKey) this.jumpToLetter(k.toUpperCase());
    });
  }

  tap(target) {
    const card = target && target.closest && target.closest('.rolo-card');
    if (!card) return;
    const i = +card.dataset.idx;
    const f = this.frontIndex();
    const it = this.items[i];
    if (i === f) {
      if (it.type === 'contact') this.onOpen(it.contact);
      else this.next(1);
    } else if (i < f) {
      this.animateTo(i);
    } else {
      this.animateTo(i);
    }
  }
}
