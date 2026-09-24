// ===== UNDRAWN map scene: exploration =====
'use strict';
const SPRITE_H = { default: 72 }; // draw height of character sprites in px
const tilePatterns = {};
function tilePattern(name) {
  if (tilePatterns[name]) return tilePatterns[name];
  const im = Assets.img(name); const S = 384, P = S * 2; const c = document.createElement('canvas'); c.width = P; c.height = P; const g = c.getContext('2d');
  if (im) { // mirrored 2x2 so it tiles seamlessly (period = 8 tiles)
    g.drawImage(im, 0, 0, S, S); g.save(); g.translate(P, 0); g.scale(-1, 1); g.drawImage(im, 0, 0, S, S); g.restore();
    g.save(); g.translate(0, P); g.scale(1, -1); g.drawImage(im, 0, 0, S, S); g.restore();
    g.save(); g.translate(P, P); g.scale(-1, -1); g.drawImage(im, 0, 0, S, S); g.restore();
  } else { g.fillStyle = { grass: '#8fd17a', path: '#d9c39a', water: '#7fb4e6', wood: '#b48a5c', paper: '#f7f4ec', dark: '#1a1a26' }[name] || '#c9a'; g.fillRect(0, 0, P, P); }
  tilePatterns[name] = c; return c;
}

class Entity {
  constructor(def, map) {
    Object.assign(this, def); this.map = map;
    this.x = (def.x + 0.5) * TILE; this.y = (def.y + (def.type === 'prop' ? 1 : 0.5)) * TILE;
    this.dir = def.dir || 'down'; this.anim = 0; this.moving = false; this.wt = rnd(0.5, 2); this.vx = 0; this.vy = 0; this.stun = 0;
    if (def.type === 'prop') {
      const im = Assets.img(def.sprite); const h = (def.h || 1.6) * TILE; this.dh = h; this.dw = im ? im.width * (h / im.height) : TILE;
      this.solid = def.solid !== false; this.cw = this.dw * (def.cw || 0.75); this.ch = TILE * (def.ch || 0.5);
    } else { this.dh = def.h ? def.h * TILE : SPRITE_H.default; this.cw = def.cw ? def.cw * TILE : 28; this.ch = 18; this.solid = def.solid !== false; }
  }
  box() { return { x: this.x - this.cw / 2, y: this.y - this.ch, w: this.cw, h: this.ch }; }
  spriteName() {
    if (this.type === 'prop') return this.sprite;
    const base = this.sprite; const d = this.dir;
    return base + (d === 'up' ? '_back' : d === 'down' ? '_front' : '_side');
  }
  draw(ctx) {
    if (this.hidden || this.dead) return;
    if (this.type === 'prop') { UI.sprite(ctx, Assets.img(this.sprite), this.x, this.y + 6, { h: this.dh }); return; }
    if (this.type === 'chest') { const opened = Game.flag(this.flagId); UI.sprite(ctx, Assets.img('chest'), this.x, this.y + 14, { h: 40, alpha: opened ? 0.55 : 1 }); return; }
    if (this.type === 'save') { UI.sprite(ctx, Assets.img('bookmark'), this.x, this.y + 14 + Math.sin(this.map.t * 2) * 2, { h: 64 }); return; }
    if (this.type === 'sign') { UI.sprite(ctx, Assets.img('signpost'), this.x, this.y + 12, { h: 56 }); return; }
    if (this.type === 'enemy') {
      const im = Assets.img(this.sprite); const bob = Math.sin(this.map.t * 4 + this.x) * 3;
      UI.sprite(ctx, im, this.x, this.y + 8 + bob, { h: this.dh, flip: this.vx > 0.1, alpha: this.stun > 0 ? 0.5 : 1 }); 
      if (this.chasing) UI.text(ctx, '!', this.x - 4, this.y - this.dh - 24, { size: 28, color: '#ff5b5b', bold: true });
      return;
    }
    drawCharacter(ctx, this, this.map.t);
  }
}
function spriteNameFor(e) { const d = e.dir; return e.sprite + (d === 'up' ? '_back' : d === 'down' ? '_front' : '_side'); }
function drawCharacter(ctx, e, t) {
  const im = Assets.images[spriteNameFor(e)] || Assets.images[e.sprite + '_front'] || Assets.img(e.sprite); if (!im) { ctx.fillStyle = '#f0f'; ctx.fillRect(e.x - 10, e.y - 40, 20, 40); return; }
  const walk = e.moving ? Math.sin(e.anim * 14) : 0;
  const bob = e.moving ? Math.abs(walk) * 3 : Math.sin(t * 2 + e.x * 0.01) * 0.6;
  const rot = e.moving ? walk * 0.06 : 0;
  ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 16, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  UI.sprite(ctx, im, e.x, e.y + 4 - bob, { h: e.dh, flip: e.dir === 'right', rot, alpha: e.hidden ? 0 : 1 });
}

class MapScene {
  constructor(mapId, tx, ty, dir) {
    this.id = mapId; this.def = MAPS[mapId]; this.t = 0; this.locked = false;
    this.cols = Math.max(...this.def.rows.map(r => r.length)); this.rows = this.def.rows.length;
    this.pw = this.cols * TILE; this.ph = this.rows * TILE;
    this.player = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, dir: dir || 'down', anim: 0, moving: false, sprite: 'wren', dh: SPRITE_H.default, cw: 26, ch: 16, trail: [] };
    this.followers = []; this.syncFollowers();
    this.entities = (this.def.entities || []).filter(d => d.type === 'door' || d.type === 'trigger' || !d.cond || d.cond()).map(d => new Entity(d, this));
    for (const e of this.entities) if (e.type === 'chest') e.flagId = `chest:${mapId}:${e.id}`;
    this.alwaysUpdate = true; this.doorLatch = true; this.cam = { x: 0, y: 0 }; this.buildGround(); this.stepT = 0; this.encounterCooldown = 1.5; this.script = new Script(this);
    Game.map = mapId;
  }
  syncFollowers() {
    const ids = Game.party.slice(1);
    this.followers = ids.map((id, i) => ({ sprite: id, dir: this.player.dir, x: this.player.x, y: this.player.y, anim: 0, moving: false, dh: SPRITE_H.default, lag: (i + 1) * 22 }));
  }
  enter() {
    Audio.bgm(this.def.bgm || null); Scenes.fadeIn(2.5);
    if (this.def.onEnter) this.run(this.def.onEnter);
  }
  async run(fn, ...args) {
    if (this.locked) return; this.locked = true; this.player.moving = false;
    try { await fn(this.script, ...args); } catch (e) { console.error(e); }
    this.locked = false; this.encounterCooldown = 1;
  }
  buildGround() {
    const GS = 2; const c = document.createElement('canvas'); c.width = this.pw * GS; c.height = this.ph * GS; const g = c.getContext('2d'); g.scale(GS, GS); this.groundScale = GS;
    this.solidTiles = [];
    for (let y = 0; y < this.rows; y++) {
      this.solidTiles[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const ch = this.def.rows[y][x] || ' '; const name = this.def.tiles[ch];
        this.solidTiles[y][x] = (this.def.solid || '').includes(ch) || ch === ' ';
        if (ch === 'W') { // procedural wall
          g.fillStyle = this.def.wallColor || '#5a4a6a'; g.fillRect(x * TILE, y * TILE, TILE, TILE);
          g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x * TILE + rnd(0, TILE), y * TILE); g.lineTo(x * TILE + rnd(0, TILE), y * TILE + TILE); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x * TILE, y * TILE + TILE - 6, TILE, 6);
          continue;
        }
        if (!name) { g.fillStyle = '#0d0b12'; g.fillRect(x * TILE, y * TILE, TILE, TILE); continue; }
        const pat = tilePattern(name); g.drawImage(pat, (x % 8) * 96, (y % 8) * 96, 96, 96, x * TILE, y * TILE, TILE, TILE);
      }
    }
    // soft edges between different tiles: draw a faint darker line
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const fam = ch => (this.def.tiles[ch] || ch).replace(/\d+$/, ''); const a = this.def.rows[y][x]; const r = this.def.rows[y][x + 1], d = (this.def.rows[y + 1] || '')[x];
      if (r && fam(r) !== fam(a)) { g.beginPath(); g.moveTo((x + 1) * TILE, y * TILE); g.lineTo((x + 1) * TILE, (y + 1) * TILE); g.stroke(); }
      if (d && fam(d) !== fam(a)) { g.beginPath(); g.moveTo(x * TILE, (y + 1) * TILE); g.lineTo((x + 1) * TILE, (y + 1) * TILE); g.stroke(); }
    }
    this.ground = c;
  }
  tileSolid(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.solidTiles[ty][tx];
  }
  blocked(box, self) {
    // corners against tiles
    for (const [px, py] of [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]) if (this.tileSolid(px, py)) return true;
    for (const e of this.entities) {
      if (e === self || e.dead || e.hidden || !e.solid || e.type === 'trigger' || e.type === 'door') continue;
      if (e.type === 'enemy' && self === this.player) continue;
      const b = e.box(); if (box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y) return true;
    }
    if (self !== this.player) { const b = { x: this.player.x - 13, y: this.player.y - 16, w: 26, h: 16 }; if (box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y) return true; }
    return false;
  }
  tryMove(e, dx, dy, dt) {
    const box = e.type ? e.box() : { x: e.x - e.cw / 2, y: e.y - e.ch, w: e.cw, h: e.ch };
    let moved = false;
    if (dx) { const nb = { ...box, x: box.x + dx * dt }; if (!this.blocked(nb, e)) { e.x += dx * dt; moved = true; } }
    if (dy) { const nb = { x: e.x - box.w / 2, y: box.y + dy * dt, w: box.w, h: box.h }; if (!this.blocked(nb, e)) { e.y += dy * dt; moved = true; } }
    return moved;
  }
  update(dt) {
    this.t += dt; Game.playtime += dt; const p = this.player; const active = !this.locked && Scenes.top() === this;
    // scripted walking (entities & player)
    for (const e of [p, ...this.entities]) if (e.walkTo) {
      const w = e.walkTo; const dx = w.x - e.x, dy = w.y - e.y, d = Math.hypot(dx, dy);
      if (d < 3) { e.x = w.x; e.y = w.y; e.moving = false; e.walkTo = null; w.done(); }
      else { const s = Math.min(d, w.speed * dt); e.x += dx / d * s; e.y += dy / d * s; e.moving = true; e.anim += dt; e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
    }
    if (active) {
      if (Input.hit('menu')) { Scenes.push(new MenuScene()); return; }
      const ax = Input.axis(); const speed = Input.held('run') ? 235 : 150;
      p.moving = false;
      if (ax.x || ax.y) {
        const n = Math.hypot(ax.x, ax.y); const dx = ax.x / n * speed, dy = ax.y / n * speed;
        if (Math.abs(ax.x) >= Math.abs(ax.y)) p.dir = ax.x > 0 ? 'right' : 'left'; else p.dir = ax.y > 0 ? 'down' : 'up';
        if (this.tryMove(p, dx, dy, dt)) { p.moving = true; p.anim += dt; this.stepT -= dt; if (this.stepT <= 0) { this.stepT = speed > 200 ? 0.22 : 0.32; Audio.sfx('step', 0.5, rnd(0.9, 1.1)); } }
        p.x = clamp(p.x, 14, this.pw - 14); p.y = clamp(p.y, 20, this.ph - 4);
      }
      if (Input.hit('ok')) this.interact();
      this.checkTriggers();
    }
    // trail for followers
    const tr = p.trail; if (p.moving || (tr.length && dist(tr[0].x, tr[0].y, p.x, p.y) > 2)) { tr.unshift({ x: p.x, y: p.y, dir: p.dir }); if (tr.length > 200) tr.pop(); }
    this.followers.forEach(f => {
      const s = tr[Math.min(tr.length - 1, f.lag)] || p; const wasMoving = dist(f.x, f.y, s.x, s.y) > 1;
      f.x = s.x; f.y = s.y; f.dir = s.dir; f.moving = p.moving && wasMoving; if (f.moving) f.anim += dt;
    });
    // entities: wander / chase
    this.encounterCooldown -= dt;
    for (const e of this.entities) {
      if (e.dead || e.hidden || e.walkTo) continue;
      if (e.type === 'npc' && e.wander && active) {
        e.wt -= dt;
        if (e.wt <= 0) { e.wt = rnd(1, 3.5); const r = Math.random(); e.vx = 0; e.vy = 0; if (r < 0.6) { const d = pick(['up', 'down', 'left', 'right']); e.dir = d; e.vx = d === 'left' ? -40 : d === 'right' ? 40 : 0; e.vy = d === 'up' ? -40 : d === 'down' ? 40 : 0; } }
        e.moving = false; if ((e.vx || e.vy) && this.tryMove(e, e.vx, e.vy, dt)) { e.moving = true; e.anim += dt; }
        if (e.home && dist(e.x, e.y, e.home.x, e.home.y) > 3 * TILE) { e.vx = -e.vx; e.vy = -e.vy; }
      }
      if (e.type === 'enemy') {
        e.stun = Math.max(0, e.stun - dt);
        const d = dist(e.x, e.y, p.x, p.y); e.chasing = active && e.stun <= 0 && d < (e.sight || 190);
        if (!active) continue;
        if (e.chasing) { const sp = e.speed || 95; this.tryMove(e, (p.x - e.x) / d * sp, (p.y - e.y) / d * sp, dt); e.vx = (p.x - e.x); }
        else { e.wt -= dt; if (e.wt <= 0) { e.wt = rnd(0.8, 2.5); const a = rnd(0, Math.PI * 2); e.vx = Math.cos(a) * 35; e.vy = Math.sin(a) * 35; if (Math.random() < 0.4) e.vx = e.vy = 0; } this.tryMove(e, e.vx, e.vy, dt); }
        if (e.stun <= 0 && this.encounterCooldown <= 0 && d < e.cw / 2 + 16) this.startBattle(e);
      }
    }
    this.cam.x = clamp(p.x - W / 2, 0, Math.max(0, this.pw - W)); this.cam.y = clamp(p.y - H / 2, 0, Math.max(0, this.ph - H));
    if (this.pw < W) this.cam.x = (this.pw - W) / 2; if (this.ph < H) this.cam.y = (this.ph - H) / 2;
  }
  startBattle(e) {
    this.run(async s => {
      Audio.sfx('encounter'); Scenes.flash = 1; Scenes.shake = 6; await s.wait(0.5);
      const r = await s.battle(e.group, { bg: this.def.battleBg, bgm: e.bgm || 'battle', boss: !!e.boss, canRun: !e.boss });
      if (r === 'win') { e.dead = true; if (e.flag) Game.set(e.flag); }
      else if (r === 'run') { e.stun = 4; }
    });
  }
  facingPoint() { const p = this.player; const d = 34; return { x: p.x + (p.dir === 'left' ? -d : p.dir === 'right' ? d : 0), y: p.y - 6 + (p.dir === 'up' ? -d : p.dir === 'down' ? d : 0) }; }
  interact() {
    const f = this.facingPoint();
    let best = null, bd = 1e9;
    for (const e of this.entities) {
      if (e.dead || e.hidden) continue;
      if (!(e.type === 'npc' || e.type === 'chest' || e.type === 'save' || e.type === 'sign' || (e.type === 'prop' && e.script))) continue;
      const b = e.box(); const cx = clamp(f.x, b.x - 10, b.x + b.w + 10), cy = clamp(f.y, b.y - 20, b.y + b.h + 10);
      const d = dist(f.x, f.y, cx, cy); if (d < 26 && d < bd) { best = e; bd = d; }
    }
    if (!best) return;
    const e = best;
    if (e.type === 'npc') { if (e.script) { const s = this.script; this.run(async () => { s.facePlayer(e.id); await e.script(s, e); }); } }
    else if (e.type === 'sign') this.run(async s => { Audio.sfx('confirm', 0.4); await s.narrate(e.text); });
    else if (e.type === 'chest') this.run(async s => {
      if (Game.flag(e.flagId)) { await s.narrate('The chest is empty. It smells like crayons.'); return; }
      Game.set(e.flagId); Audio.sfx('item');
      if (e.charm) await s.charm(e.charm); else if (e.stickers) await s.stickers(e.stickers); else await s.give(e.item, e.n || 1);
    });
    else if (e.type === 'save') this.run(async s => {
      Audio.sfx('confirm', 0.4);
      const r = await s.ask(null, 'A red ribbon bookmark. It hums a little.\nRest here?', ['Rest and save', 'Just rest', 'Leave'], { cancelIdx: 2, blip: false });
      if (r === 2) return;
      s.healAll(); Audio.sfx('heal');
      if (r === 0) { Game.px = Math.floor(this.player.x / TILE); Game.py = Math.floor(this.player.y / TILE); Game.dir = this.player.dir; const slot = await s.choice(['Slot 1', 'Slot 2', 'Slot 3', 'Cancel'], { cancelIdx: 3 }); if (slot < 3) { Game.save(slot + 1); Audio.sfx('save'); await s.narrate('The bookmark remembers this page. (Saved)'); } }
      else await s.narrate('Everyone feels rested.');
    });
    else if (e.type === 'prop' && e.script) this.run(async s => { await e.script(s, e); });
  }
  checkTriggers() {
    const p = this.player; let onDoor = false;
    for (const e of this.entities) {
      if (e.dead || (e.type !== 'door' && e.type !== 'trigger')) continue;
      const tol = e.type === 'door' ? 22 : 0; const x0 = e.x - TILE / 2 - tol, y0 = e.y - TILE / 2 - tol, w = (e.w || 1) * TILE + tol * 2, h = (e.h || 1) * TILE + tol * 2;
      if (p.x > x0 && p.x < x0 + w && p.y - 6 > y0 && p.y - 6 < y0 + h) {
        if (e.type === 'door') { onDoor = true; if (this.doorLatch) continue; if (e.cond && !e.cond()) { if (e.locked) { this.doorLatch = true; this.run(async s => { await e.locked(s); }); } continue; } this.run(async s => { await s.transfer(e.to, e.tx, e.ty, e.dir); }); return; }
        if (e.type === 'trigger') { if (e.once && Game.flag(e.once)) continue; if (e.cond && !e.cond()) continue; if (e.once) Game.set(e.once); e.dead = !e.repeat; this.run(async s => { await e.script(s, e); }); return; }
      }
    }
    if (!onDoor) this.doorLatch = false;
  }
  draw(ctx) {
    ctx.save();
    if (this.def.real) ctx.filter = 'grayscale(0.88) contrast(0.92) brightness(0.95)';
    ctx.fillStyle = this.def.bgColor || '#0d0b12'; ctx.fillRect(0, 0, W, H);
    ctx.translate(-Math.round(this.cam.x), -Math.round(this.cam.y));
    ctx.drawImage(this.ground, 0, 0, this.ground.width, this.ground.height, 0, 0, this.pw, this.ph);
    // debug: door markers hidden. Draw entities sorted by y
    const list = this.entities.filter(e => !e.dead && !e.hidden && e.type !== 'door' && e.type !== 'trigger');
    const draws = list.map(e => ({ y: e.type === 'prop' ? e.y : e.y, d: () => e.draw(ctx) }));
    draws.push({ y: this.player.y, d: () => drawCharacter(ctx, this.player, this.t) });
    for (const f of this.followers) draws.push({ y: f.y - 0.1, d: () => drawCharacter(ctx, f, this.t) });
    draws.sort((a, b) => a.y - b.y); for (const d of draws) d.d();
    // interaction hint
    if (!this.locked) { const f = this.facingPoint(); for (const e of this.entities) { if (e.dead || e.hidden || !(e.type === 'npc' || e.type === 'chest' || e.type === 'save' || e.type === 'sign' || (e.type === 'prop' && e.script))) continue; const b = e.box(); if (f.x > b.x - 12 && f.x < b.x + b.w + 12 && f.y > b.y - 24 && f.y < b.y + b.h + 12) { UI.text(ctx, '…', e.x - 6, e.y - (e.dh || 60) - 30 + Math.sin(this.t * 5) * 2, { size: 26, color: '#ffd86b', bold: true }); break; } } }
    ctx.restore();
    if (this.def.vignette !== false) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, this.def.real ? 'rgba(0,0,0,0.55)' : 'rgba(20,10,30,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    // location label
    if (this.t < 3) { ctx.globalAlpha = clamp(Math.min(this.t * 2, (3 - this.t) * 2), 0, 1); UI.box(ctx, 20, 20, 300, 44, { fill: 'rgba(20,16,30,0.8)' }); UI.text(ctx, this.def.name, 38, 28, { size: 24 }); ctx.globalAlpha = 1; }
  }
}
