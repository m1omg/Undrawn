// ===== UNDRAWN pause menu + shop =====
'use strict';
class MenuScene {
  constructor() { this.transparent = true; this.tab = 0; this.tabs = ['Party', 'Items', 'Skills', 'Charms', 'Save', 'Settings']; this.idx = 0; this.sub = null; this.t = 0; this.msg = ''; Audio.sfx('confirm', 0.5); }
  update(dt) {
    this.t += dt;
    if (this.sub) return this.updateSub(dt);
    if (Input.hit('cancel') || Input.hit('menu')) { Audio.sfx('cancel', 0.5); Scenes.pop(); return; }
    if (Input.hit('left')) { this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length; this.idx = 0; Audio.sfx('cursor', 0.4); }
    if (Input.hit('right')) { this.tab = (this.tab + 1) % this.tabs.length; this.idx = 0; Audio.sfx('cursor', 0.4); }
    const n = this.listLen(); if (n) { if (Input.hit('up')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('down')) { this.idx = (this.idx + 1) % n; Audio.sfx('cursor', 0.4); } }
    if (Input.hit('ok')) this.select();
  }
  listLen() {
    switch (this.tabs[this.tab]) {
      case 'Party': case 'Skills': return Game.party.length;
      case 'Items': return this.itemList().length; case 'Charms': return Game.party.length; case 'Save': return 3; case 'Settings': return 3;
    }
  }
  itemList() { return Object.keys(Game.items).filter(k => ITEMS[k]).map(k => ({ id: k, n: Game.items[k] })); }
  charmList() { return Object.keys(Game.items).filter(k => k.startsWith('charm:')).map(k => k.slice(6)); }
  select() {
    const tab = this.tabs[this.tab];
    if (tab === 'Items') { const it = this.itemList()[this.idx]; if (!it) return; const d = ITEMS[it.id]; if (d.key || !d.use || d.target === 'enemy') { Audio.sfx('cancel', 0.4); this.msg = d.key ? 'This is a key item.' : "Can't use that here."; return; } Audio.sfx('confirm', 0.5); this.sub = { kind: 'useItem', id: it.id, idx: 0 }; }
    else if (tab === 'Charms') { const id = Game.party[this.idx]; const list = this.charmList(); if (!list.length && !Game.members[id].charm) { this.msg = 'No charms yet. Look in chests!'; Audio.sfx('cancel', 0.4); return; } Audio.sfx('confirm', 0.5); this.sub = { kind: 'charm', who: id, list: [...list, '(remove)'], idx: 0 }; }
    else if (tab === 'Save') { Audio.sfx('confirm', 0.5); const map = Scenes.stack.find(s => s instanceof MapScene); if (map) { Game.px = Math.floor(map.player.x / TILE); Game.py = Math.floor(map.player.y / TILE); Game.dir = map.player.dir; } Game.save(this.idx + 1); Audio.sfx('save'); this.msg = `Saved to slot ${this.idx + 1}. (You can also save at red bookmarks.)`; }
    else if (tab === 'Settings') {
      if (this.idx === 0) { Game.fastText = !Game.fastText; Audio.sfx('confirm', 0.5); }
      else if (this.idx === 1) { Audio.bgmGain.gain.value = Audio.bgmGain.gain.value > 0.05 ? Math.max(0, Audio.bgmGain.gain.value - 0.15) : 0.6; Audio.sfx('cursor', 0.5); }
      else if (this.idx === 2) { Audio.sfxGain.gain.value = Audio.sfxGain.gain.value > 0.05 ? Math.max(0, Audio.sfxGain.gain.value - 0.2) : 0.7; Audio.sfx('confirm', 0.5); }
    }
    else if (tab === 'Skills') {
      const id = Game.party[this.idx]; const m = Game.members[id];
      const list = m.skills.filter(sid => { const sk = SKILLS[sid]; return !sk.power && (sk.heal || sk.revive || sk.mood === 'neutral'); });
      if (!list.length) { Audio.sfx('cancel', 0.4); this.msg = `${PARTY[id].name} has no skills usable outside battle.`; return; }
      if (m.hp <= 0) { Audio.sfx('cancel', 0.4); this.msg = `${PARTY[id].name} is FADED.`; return; }
      Audio.sfx('confirm', 0.5); this.sub = { kind: 'skill', who: id, list, idx: 0 };
    }
    else if (tab === 'Party') { Audio.sfx('cursor', 0.4); }
  }
  updateSub(dt) {
    const s = this.sub;
    if (Input.hit('cancel')) { Audio.sfx('cancel', 0.5); this.sub = null; return; }
    if (s.kind === 'useItem') {
      const n = Game.party.length; if (Input.hit('up') || Input.hit('left')) { s.idx = (s.idx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('down') || Input.hit('right')) { s.idx = (s.idx + 1) % n; Audio.sfx('cursor', 0.4); }
      if (Input.hit('ok')) {
        const it = ITEMS[s.id]; const u = it.use; const targets = u.all ? Game.party : [Game.party[s.idx]]; let used = false;
        for (const id of targets) {
          const m = Game.members[id]; const st = memberStats(m);
          if (u.revive) { if (m.hp <= 0) { m.hp = Math.max(1, Math.round(st.hp * u.revive)); used = true; } continue; }
          if (m.hp <= 0) continue;
          if (u.heal && m.hp < st.hp) { m.hp = Math.min(st.hp, m.hp + u.heal); used = true; }
          if (u.ink && m.ink < st.ink) { m.ink = Math.min(st.ink, m.ink + u.ink); used = true; }
          if (u.mood !== undefined && m.mood !== 'neutral') { m.mood = 'neutral'; used = true; }
        }
        if (used) { Game.addItem(s.id, -1); Audio.sfx('heal'); this.msg = `Used ${it.name}.`; if (!Game.has(s.id)) { this.sub = null; this.idx = 0; } }
        else { Audio.sfx('cancel', 0.4); this.msg = 'That would not do anything.'; }
      }
    } else if (s.kind === 'skill') {
      const n = s.list.length; if (Input.hit('up')) { s.idx = (s.idx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('down')) { s.idx = (s.idx + 1) % n; Audio.sfx('cursor', 0.4); }
      if (Input.hit('ok')) {
        const sk = SKILLS[s.list[s.idx]]; const m = Game.members[s.who];
        if (m.ink < sk.cost) { Audio.sfx('cancel', 0.4); this.msg = 'Not enough INK.'; return; }
        if (sk.target === 'self') { this.applySkill(s.who, s.list[s.idx], [s.who]); return; }
        if (sk.target === 'allies') { this.applySkill(s.who, s.list[s.idx], Game.party); return; }
        Audio.sfx('confirm', 0.5); this.sub = { kind: 'skillTarget', who: s.who, skill: s.list[s.idx], idx: 0 };
      }
    } else if (s.kind === 'skillTarget') {
      const n = Game.party.length; if (Input.hit('up')) { s.idx = (s.idx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('down')) { s.idx = (s.idx + 1) % n; Audio.sfx('cursor', 0.4); }
      if (Input.hit('ok')) this.applySkill(s.who, s.skill, [Game.party[s.idx]]);
    } else if (s.kind === 'charm') {
      const n = s.list.length; if (Input.hit('up')) { s.idx = (s.idx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('down')) { s.idx = (s.idx + 1) % n; Audio.sfx('cursor', 0.4); }
      if (Input.hit('ok')) {
        const m = Game.members[s.who]; const choice = s.list[s.idx];
        if (m.charm) Game.addItem('charm:' + m.charm, 1);
        m.charm = choice === '(remove)' ? null : choice; if (m.charm) Game.addItem('charm:' + m.charm, -1);
        const st = memberStats(m); m.hp = Math.min(m.hp, st.hp); m.ink = Math.min(m.ink, st.ink);
        Audio.sfx('buff', 0.5); this.msg = m.charm ? `${PARTY[s.who].name} wears the ${CHARMS[m.charm].name}.` : 'Charm removed.'; this.sub = null;
      }
    }
  }
  applySkill(who, skId, targets) {
    const sk = SKILLS[skId]; const user = Game.members[who]; const atk = memberStats(user).atk; let did = false;
    for (const id of targets) {
      const m = Game.members[id]; const st = memberStats(m);
      if (sk.revive) { if (m.hp <= 0) { m.hp = Math.max(1, Math.round(st.hp * sk.revive)); did = true; } continue; }
      if (m.hp <= 0) continue;
      if (sk.heal && m.hp < st.hp) { m.hp = Math.min(st.hp, m.hp + Math.round(st.hp * sk.heal + (sk.healFlat || 0) + atk * 0.5)); did = true; }
      if (sk.mood === 'neutral' && m.mood !== 'neutral') { m.mood = 'neutral'; did = true; }
    }
    if (!did) { Audio.sfx('cancel', 0.4); this.msg = 'That would not do anything.'; return; }
    user.ink -= sk.cost; Audio.sfx('heal'); this.msg = `${PARTY[who].name} used ${sk.name}.`; this.sub = null;
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(10,8,16,0.75)'; ctx.fillRect(0, 0, W, H);
    UI.box(ctx, 30, 24, W - 60, H - 48, { fill: 'rgba(28,24,38,0.97)' });
    // tabs
    this.tabs.forEach((t, i) => { const x = 60 + i * 124; const sel = i === this.tab; if (sel) UI.box(ctx, x - 12, 38, 128, 40, { fill: '#3a3050', radius: 10, wobble: 1 }); UI.text(ctx, t, x + 52, 46, { size: 22, align: 'center', color: sel ? '#ffd86b' : '#bbb', bold: sel }); });
    UI.text(ctx, `${Game.stickers} stickers`, W - 60, 46, { size: 20, align: 'right', color: '#ffd23c' });
    const tab = this.tabs[this.tab]; const y0 = 100;
    if (tab === 'Party' || tab === 'Skills' || tab === 'Charms') {
      Game.party.forEach((id, i) => {
        const m = Game.members[id]; const st = memberStats(m); const y = y0 + i * 112; const sel = i === this.idx;
        UI.box(ctx, 60, y, W - 120, 100, { fill: sel ? 'rgba(60,50,80,0.9)' : 'rgba(40,34,52,0.9)', stroke: sel ? '#ffd86b' : '#8f86a8', wobble: 1 });
        const face = Assets.img(id + '_' + (MOODS[m.mood].base === 'neutral' ? 'neutral' : MOODS[m.mood].base)); if (face) UI.sprite(ctx, face, 120, y + 96, { h: 86 });
        UI.text(ctx, PARTY[id].name, 180, y + 10, { size: 24, bold: true, color: PARTY[id].color }); UI.text(ctx, `Lv ${m.level}  ·  ${MOODS[m.mood].name}${m.hp <= 0 ? '  ·  FADED' : ''}`, 180, y + 40, { size: 18, color: '#ccc' });
        UI.text(ctx, `XP ${m.xp} / ${xpForLevel(m.level + 1)}`, 180, y + 64, { size: 16, color: '#999' });
        if (tab === 'Party') {
          UI.text(ctx, 'HEART', 400, y + 12, { size: 15, color: '#ffb3b3' }); UI.bar(ctx, 400, y + 30, 180, 10, m.hp / st.hp, '#ff6b6b'); UI.text(ctx, `${m.hp}/${st.hp}`, 590, y + 10, { size: 16 });
          UI.text(ctx, 'INK', 400, y + 50, { size: 15, color: '#9ad8ff' }); UI.bar(ctx, 400, y + 68, 180, 10, m.ink / st.ink, '#5ab0ff'); UI.text(ctx, `${m.ink}/${st.ink}`, 590, y + 48, { size: 16 });
          UI.text(ctx, `ATK ${st.atk}   DEF ${st.def}   SPD ${st.spd}   LUCK ${st.luck}`, 660, y + 14, { size: 18 }); UI.text(ctx, `Weapon: ${PARTY[id].weapon}`, 660, y + 42, { size: 16, color: '#bbb' }); UI.text(ctx, `Charm: ${m.charm ? CHARMS[m.charm].name : '—'}`, 660, y + 66, { size: 16, color: '#bbb' });
        } else if (tab === 'Skills') {
          const names = m.skills.map(s => `${SKILLS[s].name} (${SKILLS[s].cost})`).join(' · '); const lines = UI.wrap(ctx, names, 17, 470); lines.slice(0, 2).forEach((l, j) => UI.text(ctx, l, 400, y + 12 + j * 22, { size: 17 }));
          UI.text(ctx, `Doodle: ${SKILLS[PARTY[id].doodle].name}`, 400, y + 60, { size: 16, color: '#ffd23c' }); UI.text(ctx, `Follow-up: ${SKILLS[PARTY[id].follow].name}`, 660, y + 60, { size: 16, color: '#d9b3ff' });
          if (sel && !this.sub) UI.text(ctx, 'Z: use a healing skill here (Mend, Redraw, Read Aloud, Deep Breath…)', 60, H - 60, { size: 17, color: '#cfc8e0' });
        } else {
          UI.text(ctx, `Charm: ${m.charm ? CHARMS[m.charm].name : '— none —'}`, 400, y + 14, { size: 20 }); if (m.charm) UI.text(ctx, CHARMS[m.charm].desc, 400, y + 44, { size: 16, color: '#bbb' });
        }
      });
      if (tab === 'Skills' && this.sub && this.sub.kind === 'skill') { const s = this.sub; const m = Game.members[s.who]; UI.box(ctx, 520, 120, 380, s.list.length * 30 + 30, { fill: 'rgba(30,26,40,0.98)', stroke: '#ffd86b' }); s.list.forEach((sid, i) => { const sk = SKILLS[sid]; UI.text(ctx, `${sk.name}  (${sk.cost} INK)`, 560, 134 + i * 30, { size: 20, color: m.ink < sk.cost ? '#777' : i === s.idx ? '#ffd86b' : '#eee' }); if (i === s.idx) UI.cursor(ctx, 538, 148 + i * 30, this.t); }); UI.text(ctx, SKILLS[s.list[s.idx]].desc, 60, H - 60, { size: 17, color: '#cfc8e0' }); }
      if (tab === 'Skills' && this.sub && this.sub.kind === 'skillTarget') { const s = this.sub; UI.box(ctx, 450, 260, 450, Game.party.length * 34 + 50, { fill: 'rgba(30,26,40,0.98)', stroke: '#ffd86b' }); UI.text(ctx, `${SKILLS[s.skill].name} on whom?`, 470, 272, { size: 19, color: '#ffd86b' }); Game.party.forEach((id, i) => { const m = Game.members[id]; const st = memberStats(m); UI.text(ctx, `${PARTY[id].name}   ${m.hp}/${st.hp} HEART${m.hp <= 0 ? '  (FADED)' : ''}`, 500, 302 + i * 34, { size: 19, color: i === s.idx ? '#ffd86b' : '#eee' }); if (i === s.idx) UI.cursor(ctx, 478, 316 + i * 34, this.t); }); }
      if (tab === 'Charms' && this.sub) { const s = this.sub; UI.box(ctx, 560, 120, 340, s.list.length * 30 + 30, { fill: 'rgba(30,26,40,0.98)', stroke: '#ffd86b' }); s.list.forEach((c, i) => { UI.text(ctx, c === '(remove)' ? c : `${CHARMS[c].name} ×${Game.items['charm:' + c]}`, 600, 134 + i * 30, { size: 20, color: i === s.idx ? '#ffd86b' : '#eee' }); if (i === s.idx) UI.cursor(ctx, 578, 148 + i * 30, this.t); }); const cur = s.list[s.idx]; if (cur && cur !== '(remove)') UI.text(ctx, CHARMS[cur].desc, 60, H - 60, { size: 17, color: '#cfc8e0' }); }
    } else if (tab === 'Items') {
      const list = this.itemList(); if (!list.length) UI.text(ctx, 'Your pockets are empty.', 80, y0 + 10, { size: 22, color: '#999' });
      const first = Math.max(0, Math.min(this.idx - 5, list.length - 12));
      list.slice(first, first + 12).forEach((e, j) => { const i = first + j; const d = ITEMS[e.id]; const y = y0 + j * 34; const sel = i === this.idx; const ic = Assets.img(d.icon); if (ic) UI.sprite(ctx, ic, 100, y + 30, { w: 28, h: 28, fit: true }); UI.text(ctx, d.name, 124, y + 2, { size: 22, color: d.key ? '#ffd23c' : sel ? '#ffd86b' : '#eee' }); UI.text(ctx, '×' + e.n, 400, y + 4, { size: 18, align: 'right' }); if (sel) UI.cursor(ctx, 70, y + 16, this.t); });
      const cur = list[this.idx]; if (cur) { const lines = UI.wrap(ctx, ITEMS[cur.id].desc, 19, 420); UI.box(ctx, 450, y0, 450, 140, { fill: 'rgba(40,34,52,0.9)', wobble: 1 }); lines.forEach((l, j) => UI.text(ctx, l, 470, y0 + 16 + j * 26, { size: 19 })); }
      if (this.sub && this.sub.kind === 'useItem') { UI.box(ctx, 450, 260, 450, Game.party.length * 34 + 50, { fill: 'rgba(30,26,40,0.98)', stroke: '#ffd86b' }); UI.text(ctx, 'Use on whom?', 470, 272, { size: 19, color: '#ffd86b' }); Game.party.forEach((id, i) => { const m = Game.members[id]; const st = memberStats(m); UI.text(ctx, `${PARTY[id].name}   ${m.hp}/${st.hp} HEART   ${m.ink}/${st.ink} INK`, 500, 302 + i * 34, { size: 19, color: i === this.sub.idx ? '#ffd86b' : '#eee' }); if (i === this.sub.idx) UI.cursor(ctx, 478, 316 + i * 34, this.t); }); }
    } else if (tab === 'Save') {
      for (let i = 0; i < 3; i++) { const info = Game.slotInfo(i + 1); const y = y0 + i * 90; const sel = i === this.idx; UI.box(ctx, 60, y, W - 120, 78, { fill: sel ? 'rgba(60,50,80,0.9)' : 'rgba(40,34,52,0.9)', stroke: sel ? '#ffd86b' : '#8f86a8', wobble: 1 }); UI.text(ctx, `Slot ${i + 1}`, 90, y + 12, { size: 22, bold: true }); UI.text(ctx, info ? `${MAPS[info.map] ? MAPS[info.map].name : info.map} · Lv ${info.members.wren.level} · ${Math.floor(info.playtime / 60)} min · ${new Date(info.when).toLocaleString()}` : '— empty —', 200, y + 14, { size: 19, color: '#ccc' }); UI.text(ctx, info ? `Pages kept: ${info.pages}` : '', 200, y + 42, { size: 16, color: '#999' }); }
      UI.text(ctx, 'Press Z / Enter to save into the selected slot.', 60, H - 60, { size: 17, color: '#cfc8e0' });
    } else if (tab === 'Settings') {
      const rows = [`Text speed: ${Game.fastText ? 'FAST' : 'normal'}`, `Music volume: ${Math.round(Audio.bgmGain.gain.value * 100)}%`, `Sound volume: ${Math.round(Audio.sfxGain.gain.value * 100)}%`];
      rows.forEach((r, i) => { UI.text(ctx, r, 100, y0 + 10 + i * 40, { size: 22, color: i === this.idx ? '#ffd86b' : '#eee' }); if (i === this.idx) UI.cursor(ctx, 72, y0 + 24 + i * 40, this.t); });
      UI.text(ctx, 'Controls: Arrows/WASD move · Z/Enter/Space confirm · X/Esc cancel · C/Tab menu · Shift run', 60, H - 84, { size: 17, color: '#cfc8e0' });
      UI.text(ctx, 'Emotion triangle: BRAVE beats BLUE, BLUE beats GIDDY, GIDDY beats BRAVE.', 60, H - 60, { size: 17, color: '#cfc8e0' });
    }
    if (this.msg) UI.text(ctx, this.msg, W / 2, H - 36, { size: 18, align: 'center', color: '#ffd86b' });
  }
}

class ShopScene {
  constructor(items) { this.transparent = true; this.items = items; this.idx = 0; this.t = 0; this.mode = 'buy'; this.msg = 'Dot: "Stickers only. No refunds. No hugs."'; this.promise = new Promise(r => this.resolve = r); Audio.bgm('shop'); }
  update(dt) {
    this.t += dt; const list = this.mode === 'buy' ? this.items : Object.keys(Game.items).filter(k => ITEMS[k] && !ITEMS[k].key);
    if (Input.hit('cancel')) { Audio.sfx('cancel', 0.5); Scenes.pop(); this.resolve(); return; }
    if (Input.hit('left') || Input.hit('right')) { this.mode = this.mode === 'buy' ? 'sell' : 'buy'; this.idx = 0; Audio.sfx('cursor', 0.4); return; }
    if (list.length) { if (Input.hit('up')) { this.idx = (this.idx + list.length - 1) % list.length; Audio.sfx('cursor', 0.4); } if (Input.hit('down')) { this.idx = (this.idx + 1) % list.length; Audio.sfx('cursor', 0.4); } }
    if (Input.hit('ok') && list.length) {
      const id = list[this.idx]; const it = ITEMS[id];
      if (this.mode === 'buy') { if (Game.stickers >= it.price) { Game.stickers -= it.price; Game.addItem(id, 1); Audio.sfx('item'); this.msg = `Bought a ${it.name}.`; } else { Audio.sfx('cancel', 0.5); this.msg = 'Dot: "Not enough stickers, kiddo."'; } }
      else { const p = Math.floor(it.price / 2); Game.stickers += p; Game.addItem(id, -1); Audio.sfx('item'); this.msg = `Sold a ${it.name} for ${p}.`; if (!Game.has(id)) this.idx = 0; }
    }
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(10,8,16,0.6)'; ctx.fillRect(0, 0, W, H);
    UI.box(ctx, 80, 60, W - 160, H - 120, { fill: 'rgba(28,24,38,0.97)' });
    UI.text(ctx, this.mode === 'buy' ? '◀ BUY ▶' : '◀ SELL ▶', 120, 76, { size: 26, bold: true, color: '#ffd86b' }); UI.text(ctx, `${Game.stickers} stickers`, W - 120, 80, { size: 20, align: 'right', color: '#ffd23c' });
    const list = this.mode === 'buy' ? this.items : Object.keys(Game.items).filter(k => ITEMS[k] && !ITEMS[k].key);
    if (!list.length) UI.text(ctx, 'Nothing to sell.', 130, 130, { size: 22, color: '#999' });
    list.forEach((id, i) => { const it = ITEMS[id]; const y = 124 + i * 34; const sel = i === this.idx; const ic = Assets.img(it.icon); if (ic) UI.sprite(ctx, ic, 150, y + 28, { w: 26, h: 26, fit: true }); UI.text(ctx, it.name, 174, y, { size: 22, color: sel ? '#ffd86b' : '#eee' }); UI.text(ctx, `${this.mode === 'buy' ? it.price : Math.floor(it.price / 2)} st.`, 470, y + 2, { size: 18, align: 'right', color: '#ffd23c' }); if (this.mode === 'sell') UI.text(ctx, '×' + Game.items[id], 520, y + 2, { size: 18 }); if (sel) UI.cursor(ctx, 122, y + 14, this.t); });
    const cur = list[this.idx]; if (cur) { const lines = UI.wrap(ctx, ITEMS[cur].desc, 19, 300); UI.box(ctx, 560, 124, 340, 120, { fill: 'rgba(40,34,52,0.9)', wobble: 1 }); lines.forEach((l, j) => UI.text(ctx, l, 580, 140 + j * 26, { size: 19 })); }
    UI.text(ctx, this.msg, W / 2, H - 100, { size: 18, align: 'center', color: '#cfc8e0' }); UI.text(ctx, 'X to leave · ◀ ▶ switch buy/sell', W / 2, H - 76, { size: 15, align: 'center', color: '#888' });
  }
}
