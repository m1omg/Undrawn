// ===== UNDRAWN dialog box, choices, script runner, cutscene cards =====
'use strict';
const SPEAKER_FACE = { wren: 'wren_neutral', bramble: 'bramble_neutral', pip: 'pip_neutral', moth: 'moth_neutral' };
const NAME_COLORS = { Wren: '#ff8fb1', Bramble: '#c98c4a', Pip: '#ffd23c', Moth: '#a8e6a1', Mom: '#b7d1ff', Pop: '#f4d59a', Dara: '#c9a2ff', '???': '#bbb', 'THE BLANK': '#eee', 'Grey Wren': '#aaa' };

class DialogScene {
  constructor(who, text, opts = {}) {
    this.transparent = true; this.alwaysUpdate = true; this.who = who; this.text = text; this.opts = opts; this.t = 0; this.chars = 0; this.done = false; this.blipT = 0;
    this.face = opts.face || (who && SPEAKER_FACE[who.toLowerCase()]) || (opts.sprite ? opts.sprite : null);
    this.promise = new Promise(r => this.resolve = r);
  }
  update(dt) {
    const top = Scenes.top() === this; this.t += dt; const speed = ((top && Input.held('ok')) || Input.held('fast') || Game.fastText) ? 120 : 45;
    if (this.chars < this.text.length) {
      this.chars = Math.min(this.text.length, this.chars + dt * speed);
      this.blipT -= dt; if (this.blipT <= 0 && this.opts.blip !== false) { this.blipT = 0.06; Audio.sfx('blip', 0.35, this.who === 'Pop' ? 0.6 : this.who === 'THE BLANK' ? 0.4 : this.who === 'Pip' ? 1.3 : 1); }
      if (top && (Input.hit('ok') || Input.hit('cancel'))) { this.chars = this.text.length; }
    } else if (top && !this.opts.noCursor && (Input.hit('ok') || Input.hit('cancel'))) { Audio.sfx('cursor', 0.4); Scenes.pop(); this.resolve(); }
  }
  draw(ctx) {
    const bx = 40, bw = W - 80; let tx = bx + 28;
    const faceIm = this.face && Assets.img(this.face); const fw0 = faceIm ? faceIm.width * (118 / faceIm.height) : 0;
    const linesAll = UI.wrap(ctx, this.text, 24, bw - (faceIm ? 32 + fw0 + 8 : 28) - 30);
    const bh = Math.max(150, 40 + linesAll.length * 30), by = H - 40 - bh;
    UI.box(ctx, bx, by, bw, bh);
    if (faceIm) {
      const fh = 118; const fw = faceIm.width * (fh / faceIm.height);
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx + 16, by + 16, fw + 8, fh + 2, 10); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.restore();
      UI.sprite(ctx, faceIm, bx + 20 + fw / 2, by + 16 + fh, { h: fh });
      tx = bx + 32 + fw + 8;
    }
    if (this.who) {
      ctx.save(); ctx.font = UI.font(22, true); const nw = ctx.measureText(this.who).width + 26; ctx.restore();
      UI.box(ctx, bx + 24, by - 22, nw, 36, { fill: '#2a2438', radius: 10, wobble: 1 });
      UI.text(ctx, this.who, bx + 37, by - 16, { size: 22, bold: true, color: NAME_COLORS[this.who] || '#ffd86b' });
    }
    const lines = UI.wrap(ctx, this.text, 24, bw - (tx - bx) - 30);
    let remaining = Math.floor(this.chars); let y = by + 22;
    for (const ln of lines) {
      const shown = ln.slice(0, Math.max(0, remaining)); remaining -= ln.length + 1;
      UI.text(ctx, shown, tx, y, { size: 24 }); y += 30;
    }
    if (this.chars >= this.text.length && !this.opts.noCursor) UI.cursor(ctx, bx + bw - 34, by + bh - 20 + Math.sin(this.t * 6) * 2, this.t);
  }
}

class ChoiceScene {
  constructor(options, opts = {}) {
    this.transparent = true; this.options = options; this.idx = opts.defaultIdx || 0; this.t = 0; this.opts = opts;
    this.promise = new Promise(r => this.resolve = r);
  }
  update(dt) {
    this.t += dt;
    if (Input.hit('up')) { this.idx = (this.idx + this.options.length - 1) % this.options.length; Audio.sfx('cursor', 0.5); }
    if (Input.hit('down')) { this.idx = (this.idx + 1) % this.options.length; Audio.sfx('cursor', 0.5); }
    if (Input.hit('ok')) { Audio.sfx('confirm', 0.6); Scenes.pop(); this.resolve(this.idx); }
    if (Input.hit('cancel') && this.opts.cancelIdx != null) { Audio.sfx('cancel', 0.6); Scenes.pop(); this.resolve(this.opts.cancelIdx); }
  }
  draw(ctx) {
    ctx.save(); ctx.font = UI.font(24);
    const w = Math.max(220, ...this.options.map(o => ctx.measureText(o).width + 70)); ctx.restore();
    const h = this.options.length * 36 + 26; const x = W - 40 - w, y = H - 200 - h;
    UI.box(ctx, x, y, w, h, { fill: 'rgba(40,34,52,0.96)' });
    this.options.forEach((o, i) => {
      UI.text(ctx, o, x + 44, y + 14 + i * 36, { size: 24, color: i === this.idx ? '#ffd86b' : '#f4ecd8' });
      if (i === this.idx) UI.cursor(ctx, x + 18, y + 28 + i * 36, this.t);
    });
  }
}

// Full-screen illustration with caption lines (cutscene card)
class CardScene {
  constructor(image, lines, opts = {}) {
    this.image = image; this.lines = lines; this.idx = 0; this.t = 0; this.a = 0; this.opts = opts; this.chars = 0; Scenes.fadeIn(1.5);
    this.promise = new Promise(r => this.resolve = r);
  }
  update(dt) {
    this.t += dt; this.a = Math.min(1, this.a + dt * 1.5);
    const line = this.lines[this.idx] || '';
    if (this.chars < line.length) { this.chars = Math.min(line.length, this.chars + dt * ((Input.held('ok') || Game.fastText) ? 120 : 40)); if (Input.hit('ok')) this.chars = line.length; }
    else if (Input.hit('ok')) {
      Audio.sfx('cursor', 0.4); this.idx++; this.chars = 0;
      if (this.idx >= this.lines.length) { Scenes.pop(); this.resolve(); }
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const im = Assets.img(this.image);
    if (im) {
      const s = Math.min(W / im.width, (H - 110) / im.height); const dw = im.width * s, dh = im.height * s;
      ctx.globalAlpha = this.a; if (this.opts.grey) ctx.filter = 'grayscale(0.9) contrast(0.95)';
      ctx.drawImage(im, (W - dw) / 2, 0, dw, dh); ctx.filter = 'none'; ctx.globalAlpha = 1;
    }
    const line = (this.lines[this.idx] || '').slice(0, Math.floor(this.chars));
    const wrapped = UI.wrap(ctx, line, 24, W - 160); let y = H - 96;
    for (const ln of wrapped) { UI.text(ctx, ln, W / 2, y, { size: 24, align: 'center' }); y += 30; }
  }
}
// Chapter title card
class TitleCardScene {
  constructor(title, sub) { this.title = title; this.sub = sub; this.t = 0; Scenes.fadeIn(3); this.promise = new Promise(r => this.resolve = r); }
  update(dt) { this.t += dt; if (this.t > 2.8 || (this.t > 0.8 && Input.hit('ok'))) { Scenes.pop(); this.resolve(); } }
  draw(ctx) {
    ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, this.t * 1.5, (2.8 - this.t) * 2);
    ctx.globalAlpha = clamp(a, 0, 1);
    UI.text(ctx, this.title, W / 2, H / 2 - 40, { size: 48, align: 'center', bold: true, color: '#f4ecd8' });
    if (this.sub) UI.text(ctx, this.sub, W / 2, H / 2 + 24, { size: 24, align: 'center', color: '#bbb' });
    ctx.globalAlpha = 1;
  }
}

// ---------- Script runner API (async) ----------
class Script {
  constructor(map) { this.map = map; }
  say(who, text, opts) { const d = new DialogScene(who, text, opts); Scenes.push(d); return d.promise; }
  narrate(text) { return this.say(null, text, { blip: false }); }
  choice(options, opts) { const c = new ChoiceScene(options, opts); Scenes.push(c); return c.promise; }
  async ask(who, text, options, opts) { const d = new DialogScene(who, text, { ...opts, noCursor: true }); Scenes.push(d); const c = new ChoiceScene(options, opts); Scenes.push(c); const r = await c.promise; Scenes.pop(); d.resolve(); return r; }
  wait(sec) { return new Promise(r => setTimeout(r, sec * 1000)); }
  sfx(n, v, r) { Audio.sfx(n, v, r); }
  bgm(n, o) { Audio.bgm(n, o); }
  stopBgm() { Audio.stopBgm(); }
  fadeOut(speed) { return new Promise(r => Scenes.fadeOut(r, speed)); }
  fadeIn(speed) { Scenes.fadeIn(speed); return this.wait(0.4); }
  shake(n = 8) { Scenes.shake = n; }
  flash(c = '#fff') { Scenes.flash = 1; Scenes.flashColor = c; }
  card(image, lines, opts) { const c = new CardScene(image, lines, opts); Scenes.push(c); return c.promise; }
  title(t, sub) { const c = new TitleCardScene(t, sub); Scenes.push(c); return c.promise; }
  flag(k, v = true) { Game.set(k, v); }
  has(k) { return Game.flag(k); }
  async give(item, n = 1) { Game.addItem(item, n); Audio.sfx('item'); const it = ITEMS[item]; await this.narrate(`Got ${n > 1 ? n + ' × ' : ''}${it ? it.name : item}!`); }
  async charm(id) { Game.addItem('charm:' + id, 1); Audio.sfx('item'); await this.narrate(`Got the ${CHARMS[id].name}! (a charm — equip it in the menu)`); }
  async stickers(n) { Game.stickers += n; Audio.sfx('item'); await this.narrate(`Got ${n} stickers!`); }
  async page(text) { Game.pages++; Game.addItem('page', 1); Audio.sfx('page'); Audio.sfx('save', 0.5); await this.narrate(`A MEMORY PAGE. ${text || ''} (${Game.pages} kept)`); }
  async join(id) {
    if (!Game.party.includes(id)) { Game.members[id] = Game.members[id] || newMember(id, Math.max(1, (Game.members.wren ? Game.members.wren.level : 1) - 1)); Game.party.push(id); }
    Audio.sfx('levelup'); await this.narrate(`${PARTY[id].name} joined the party!`);
    if (this.map) this.map.syncFollowers();
  }
  healAll() { for (const id of Game.party) { const m = Game.members[id]; const s = memberStats(m); m.hp = s.hp; m.ink = s.ink; m.mood = 'neutral'; } }
  ent(id) { return this.map ? this.map.entities.find(e => e.id === id) : null; }
  face(id, dir) { const e = id === 'player' ? this.map.player : this.ent(id); if (e) e.dir = dir; }
  facePlayer(id) { const e = this.ent(id); if (!e) return; const p = this.map.player; const dx = p.x - e.x, dy = p.y - e.y; e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  show(id, v = true) { const e = this.ent(id); if (e) e.hidden = !v; }
  remove(id) { const e = this.ent(id); if (e) e.dead = true; }
  place(id, tx, ty) { const e = id === 'player' ? this.map.player : this.ent(id); if (e) { e.x = tx * TILE + TILE / 2; e.y = ty * TILE + TILE / 2; } }
  move(id, tx, ty, speed = 120) { // walk entity to tile
    const e = id === 'player' ? this.map.player : this.ent(id); if (!e) return Promise.resolve();
    return new Promise(res => { e.walkTo = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, speed, done: res }; });
  }
  async battle(group, opts = {}) {
    const b = new BattleScene(group, opts); Scenes.push(b); const r = await b.promise; Scenes.fadeIn(3);
    if (this.map && this.map.def.bgm) Audio.bgm(this.map.def.bgm);
    if (r === 'lose' && !opts.canLose) { await this.gameOver(); }
    return r;
  }
  async gameOver() { Scenes.replace(new GameOverScene()); await new Promise(() => {}); }
  async transfer(mapId, tx, ty, dir) {
    await this.fadeOut(3); Audio.sfx('door', 0.5);
    const m = new MapScene(mapId, tx, ty, dir || Game.dir);
    // replace map scene under any overlays
    const idx = Scenes.stack.findIndex(s => s instanceof MapScene);
    if (idx >= 0) { Scenes.stack[idx].exit && Scenes.stack[idx].exit(); Scenes.stack[idx] = m; m.enter(); } else Scenes.push(m);
    this.map = m; await this.fadeIn(2.5);
  }
  shop(items) { const s = new ShopScene(items); Scenes.push(s); return s.promise; }
  ending(which) { Scenes.replace(new EndingScene(which)); return new Promise(() => {}); }
}
