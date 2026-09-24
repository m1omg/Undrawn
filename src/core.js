// ===== UNDRAWN core: assets, input, audio, scenes, drawing helpers =====
'use strict';
const W = 960, H = 600, TILE = 48;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// ---------- Assets ----------
const Assets = {
  images: {}, sounds: {}, missing: new Set(), total: 0, loaded: 0,
  img(name) {
    const im = this.images[name];
    if (!im) { if (!this.missing.has(name)) { this.missing.add(name); console.warn('missing image', name); } return null; }
    return im;
  },
  loadImage(name, url) {
    this.total++;
    return new Promise(res => {
      const im = new Image();
      im.onload = () => { this.images[name] = im; this.loaded++; res(im); };
      im.onerror = () => { this.loaded++; res(null); };
      im.src = url;
    });
  },
  async loadSound(name, url) {
    this.total++;
    try {
      const r = await fetch(url); const buf = await r.arrayBuffer();
      this.sounds[name] = await Audio.ctx.decodeAudioData(buf);
    } catch (e) { console.warn('sound failed', name, e); }
    this.loaded++;
  },
  async loadAll(imageList, soundList) {
    const ps = imageList.map(n => this.loadImage(n.split('/').pop().replace(/\.(png|jpg)$/, ''), 'assets/img/' + n));
    const ss = soundList.map(n => this.loadSound(n, 'assets/audio/' + n + '.ogg'));
    await Promise.all(ps.concat(ss));
  }
};

// ---------- Audio ----------
const Audio = {
  ctx: null, bgmGain: null, sfxGain: null, current: null, currentName: null, muted: false,
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain(); this.bgmGain.gain.value = 0.55; this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.7; this.sfxGain.connect(this.master);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  sfx(name, vol = 1, rate = 1) {
    const b = Assets.sounds['sfx_' + name]; if (!b || !this.ctx) return;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(this.sfxGain); s.start();
  },
  bgm(name, { loop = true, fade = 0.8 } = {}) {
    if (name === this.currentName) return;
    this.stopBgm(fade);
    this.currentName = name;
    if (!name) return;
    const b = Assets.sounds['bgm_' + name]; if (!b || !this.ctx) return;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = loop;
    const g = this.ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(this.bgmGain);
    s.start(); g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + fade);
    this.current = { s, g };
  },
  stopBgm(fade = 0.8) {
    if (!this.current) { this.currentName = null; return; }
    const { s, g } = this.current; const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { try { s.stop(); } catch (e) {} }, fade * 1000 + 50);
    this.current = null; this.currentName = null;
  },
  duck(v, t = 0.3) { if (this.bgmGain) this.bgmGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + t); }
};

// ---------- Input ----------
const Input = {
  down: {}, pressed: {}, map: {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'ok', Enter: 'ok', Space: 'ok', KeyX: 'cancel', Escape: 'cancel', ShiftLeft: 'run', ShiftRight: 'run', KeyC: 'menu', Tab: 'menu', KeyF: 'fast'
  },
  init(canvas) {
    window.addEventListener('keydown', e => {
      const k = this.map[e.code]; if (!k) return; e.preventDefault();
      if (!this.down[k]) this.pressed[k] = true; this.down[k] = true; Audio.resume();
    });
    window.addEventListener('keyup', e => { const k = this.map[e.code]; if (k) this.down[k] = false; });
    window.addEventListener('blur', () => { this.down = {}; });
    // touch / mouse: simple virtual buttons are mapped in main.js
  },
  endFrame() { this.pressed = {}; },
  hit(k) { return !!this.pressed[k]; },
  held(k) { return !!this.down[k]; },
  axis() { return { x: (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0), y: (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0) }; }
};

// ---------- Scene stack ----------
const Scenes = {
  stack: [], fade: { a: 0, target: 0, speed: 2, cb: null }, shake: 0, flash: 0, flashColor: '#fff',
  push(s) { this.stack.push(s); if (s.enter) s.enter(); },
  pop() { const s = this.stack.pop(); if (s && s.exit) s.exit(); const t = this.top(); if (t && t.resume) t.resume(); return s; },
  replace(s) { while (this.stack.length) this.pop(); this.push(s); },
  top() { return this.stack[this.stack.length - 1]; },
  fadeOut(cb, speed = 2.5) { this.fade.target = 1; this.fade.speed = speed; if (this.fade.a >= 1) { this.fade.cb = null; if (cb) setTimeout(cb, 0); } else this.fade.cb = cb; },
  fadeIn(speed = 2.5) { this.fade.target = 0; this.fade.speed = speed; this.fade.cb = null; },
  update(dt) {
    const f = this.fade;
    if (f.a !== f.target) {
      f.a = f.target > f.a ? Math.min(f.target, f.a + dt * f.speed) : Math.max(f.target, f.a - dt * f.speed);
      if (f.a === f.target && f.cb) { const cb = f.cb; f.cb = null; cb(); }
    }
    this.shake = Math.max(0, this.shake - dt * 30); this.flash = Math.max(0, this.flash - dt * 3);
    // update only the top scene, but let scenes flagged updateBelow keep animating
    const top = this.top();
    for (const s of [...this.stack]) if (s === top || s.alwaysUpdate) s.update(dt);
  },
  draw(ctx) {
    let start = this.stack.length - 1; while (start > 0 && this.stack[start].transparent) start--;
    ctx.save();
    if (this.shake > 0) ctx.translate(rnd(-this.shake, this.shake), rnd(-this.shake, this.shake));
    for (let i = start; i < this.stack.length; i++) this.stack[i].draw(ctx);
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = this.flashColor; ctx.globalAlpha = Math.min(1, this.flash); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (this.fade.a > 0) { ctx.fillStyle = '#000'; ctx.globalAlpha = this.fade.a; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
};

// ---------- Drawing helpers ----------
const FONT = '"Patrick Hand", "Comic Neue", "Segoe Print", "Chalkboard SE", "Comic Sans MS", cursive';
const UI = {
  font(size, bold = false) { return `${bold ? 'bold ' : ''}${size}px ${FONT}`; },
  // crayon-ish rounded box with a wobbly double border
  box(ctx, x, y, w, h, { fill = 'rgba(28,24,38,0.92)', stroke = '#f4ecd8', radius = 14, wobble = 2, lw = 3 } = {}) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); ctx.stroke();
    if (wobble) { // second, slightly offset sketchy stroke
      ctx.globalAlpha = 0.45; ctx.lineWidth = lw * 0.7; ctx.beginPath();
      const j = wobble; ctx.roundRect(x + this.w(j, x + y), y + this.w(j, y * 3), w + this.w(j, w), h + this.w(j, h * 7), radius + 2); ctx.stroke();
    }
    ctx.restore();
  },
  w(amount, seed) { return amount ? Math.sin(seed * 12.9898) * amount : 0; },
  text(ctx, str, x, y, { size = 22, color = '#f4ecd8', align = 'left', bold = false, shadow = true, maxWidth = null } = {}) {
    ctx.save(); ctx.font = this.font(size, bold); ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(str, x + 2, y + 2, maxWidth || undefined); }
    ctx.fillStyle = color; ctx.fillText(str, x, y, maxWidth || undefined); ctx.restore();
  },
  wrap(ctx, str, size, maxWidth) {
    ctx.save(); ctx.font = this.font(size);
    const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' '); let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxWidth && line) { out.push(line); line = w; } else line = t;
      }
      out.push(line);
    }
    ctx.restore(); return out;
  },
  bar(ctx, x, y, w, h, ratio, color, back = 'rgba(0,0,0,0.5)') {
    ctx.save(); ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, Math.round(w * clamp(ratio, 0, 1)), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.restore();
  },
  cursor(ctx, x, y, t) { // little crayon triangle
    ctx.save(); ctx.fillStyle = '#ffd86b'; ctx.translate(x + Math.sin(t * 8) * 3, y);
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(12, 0); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  },
  sprite(ctx, im, x, y, { w = null, h = null, flip = false, alpha = 1, anchor = 'bottom', rot = 0, tint = null, fit = false } = {}) {
    if (!im) return;
    let dw = w || (h ? im.width * (h / im.height) : im.width), dh = h || (w ? im.height * (w / im.width) : im.height);
    if (fit) { const k = Math.min((w || 1e9) / im.width, (h || 1e9) / im.height); dw = im.width * k; dh = im.height * k; }
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    const ox = -dw / 2, oy = anchor === 'bottom' ? -dh : anchor === 'center' ? -dh / 2 : 0;
    ctx.drawImage(im, ox, oy, dw, dh);
    if (tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = tint; ctx.fillRect(ox, oy, dw, dh); }
    ctx.restore();
  }
};

// ---------- Game state (persistent) ----------
const Game = {
  flags: {}, items: {}, stickers: 0, party: [], members: {}, map: null, px: 0, py: 0, dir: 'down', playtime: 0, pages: 0, fastText: false,
  flag(k) { return !!this.flags[k]; }, set(k, v = true) { this.flags[k] = v; },
  addItem(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; if (this.items[id] <= 0) delete this.items[id]; },
  has(id) { return (this.items[id] || 0) > 0; },
  save(slot) {
    const data = { flags: this.flags, items: this.items, stickers: this.stickers, party: this.party, members: this.members, map: this.map, px: this.px, py: this.py, dir: this.dir, playtime: this.playtime, pages: this.pages, when: Date.now() };
    localStorage.setItem('undrawn_save_' + slot, JSON.stringify(data));
  },
  load(slot) {
    const raw = localStorage.getItem('undrawn_save_' + slot); if (!raw) return false;
    const d = JSON.parse(raw); Object.assign(this, d); return true;
  },
  slotInfo(slot) { const raw = localStorage.getItem('undrawn_save_' + slot); return raw ? JSON.parse(raw) : null; },
  reset() { this.flags = {}; this.items = {}; this.stickers = 0; this.party = []; this.members = {}; this.map = null; this.playtime = 0; this.pages = 0; }
};
