// ===== UNDRAWN battle scene =====
'use strict';
Game.smudge = Game.smudge || 0;
const sleep = s => new Promise(r => setTimeout(r, s * 1000));

class BattleScene {
  constructor(groupId, opts = {}) {
    this.opts = opts; this.t = 0; this.msgs = []; this.floats = []; this.menu = null; this.round = 0; this.result = null; this.ended = false;
    this.promise = new Promise(r => this.resolve = r);
    const ids = GROUPS[groupId] || [groupId];
    this.enemies = ids.map((id, i) => { const d = ENEMIES[id]; return { kind: 'enemy', id, d, name: d.name, hp: d.hp, max: d.hp, mood: 'neutral', buffs: [], x: 0, y: 0, shake: 0, flash: 0, dead: false, alpha: 1, idx: i, offset: rnd(0, 6) }; });
    this.party = Game.party.map(id => { const m = Game.members[id]; return { kind: 'party', id, m, name: PARTY[id].name, buffs: [], taunt: 0, bump: 0, shake: 0, flash: 0, acted: false }; });
    this.bg = opts.bg || 'bg_meadow'; this.bgm = opts.bgm || 'battle';
    this.layoutEnemies();
  }
  layoutEnemies() {
    const n = this.enemies.length; const spacing = Math.min(300, 720 / n);
    this.enemies.forEach((e, i) => { e.x = W / 2 + (i - (n - 1) / 2) * spacing; e.y = 330; });
  }
  enter() { Audio.bgm(this.bgm); Scenes.fadeIn(4); this.loop(); }
  // ---------- stat helpers ----------
  stats(c) {
    if (c.kind === 'enemy') { const mood = MOODS[c.mood]; const b = this.buffMul(c); return { atk: c.d.atk * mood.atk * b.atk, def: c.d.def * mood.def * b.def, spd: c.d.spd * mood.spd * b.spd, luck: 3, crit: mood.crit, acc: mood.acc }; }
    const s = memberStats(c.m); const mood = MOODS[c.m.mood]; const b = this.buffMul(c);
    return { atk: s.atk * mood.atk * b.atk, def: s.def * mood.def * b.def, spd: s.spd * mood.spd * b.spd, luck: s.luck, crit: mood.crit, acc: mood.acc, maxhp: s.hp, maxink: s.ink };
  }
  buffMul(c) { const r = { atk: 1, def: 1, spd: 1 }; for (const b of c.buffs) { for (const k of ['atk', 'def', 'spd']) if (b[k]) r[k] *= b[k]; } return r; }
  hp(c) { return c.kind === 'enemy' ? c.hp : c.m.hp; }
  maxhp(c) { return c.kind === 'enemy' ? c.max : memberStats(c.m).hp; }
  isDead(c) { return c.kind === 'enemy' ? c.dead : c.m.hp <= 0; }
  mood(c) { return c.kind === 'enemy' ? c.mood : c.m.mood; }
  setMood(c, base) {
    const cur = this.mood(c); const nm = moodUp(cur, base); if (nm === cur) return false;
    if (c.kind === 'enemy') c.mood = nm; else c.m.mood = nm;
    if (base !== 'neutral') Audio.sfx('mood_' + base, 0.6);
    return nm;
  }
  alive(list) { return list.filter(c => !this.isDead(c)); }
  // ---------- messaging & animation ----------
  msg(text, hold = 0.9) { this.msgs = [text]; return sleep(hold * (Game.fastText ? 0.5 : 1)); }
  float(c, text, color = '#fff', big = false) { const p = this.pos(c); this.floats.push({ x: p.x + rnd(-14, 14), y: p.y - 60, text, color, t: 0, big }); }
  pos(c) { if (c.kind === 'enemy') return { x: c.x, y: c.y - 120 }; const i = this.party.indexOf(c); const n = this.party.length; const cw = Math.min(230, (W - 40) / n); const x0 = (W - cw * n) / 2; return { x: x0 + cw * i + cw / 2, y: H - 60 }; }
  async hurtAnim(c, crit) { c.shake = 8; c.flash = 1; Audio.sfx(crit ? 'crit' : 'hit', 0.8, rnd(0.9, 1.1)); if (c.kind === 'party') Scenes.shake = crit ? 10 : 5; await sleep(0.35); }
  // ---------- damage ----------
  async dealDamage(src, dst, power, { magic = false, critBonus = 0, ignoreDef = false, flat = null } = {}) {
    const S = this.stats(src), D = this.stats(dst);
    if (Math.random() > 0.95 * S.acc) { this.float(dst, 'miss', '#ccc'); Audio.sfx('miss'); await sleep(0.3); return 0; }
    let dmg;
    if (flat != null) dmg = flat;
    else { const def = ignoreDef ? 0 : D.def * (magic ? 0.5 : 1); dmg = (S.atk * power * 2.2 - def * 0.9) * rnd(0.9, 1.1) * moodAdvantage(this.mood(src), this.mood(dst)); }
    const crit = Math.random() < 0.05 + S.luck * 0.01 + S.crit + critBonus; if (crit) dmg *= 1.8;
    dmg = Math.max(1, Math.round(dmg));
    if (dst.kind === 'enemy') { dst.hp = Math.max(0, dst.hp - dmg); Game.smudge = Math.min(100, Game.smudge + 4); }
    else { dst.m.hp = Math.max(0, dst.m.hp - dmg); Game.smudge = Math.min(100, Game.smudge + 8); }
    this.float(dst, String(dmg), crit ? '#ffd23c' : '#fff', crit);
    await this.hurtAnim(dst, crit);
    if (dst.kind === 'enemy' && dst.hp <= 0) { dst.dead = true; await this.msg(`${dst.name} was scribbled out!`, 0.7); }
    if (dst.kind === 'party' && dst.m.hp <= 0) { dst.m.mood = 'neutral'; Audio.sfx('faded'); await this.msg(`${dst.name} FADED...`, 0.9); }
    return dmg;
  }
  async heal(dst, amount) {
    if (dst.kind === 'enemy') { dst.hp = Math.min(dst.max, dst.hp + amount); }
    else { const mx = memberStats(dst.m).hp; dst.m.hp = Math.min(mx, dst.m.hp + amount); }
    this.float(dst, '+' + amount, '#8ef29a'); Audio.sfx('heal', 0.7); await sleep(0.4);
  }
  // ---------- skill execution ----------
  targetsFor(sk, actor, chosen) {
    const foes = actor.kind === 'party' ? this.enemies : this.party, friends = actor.kind === 'party' ? this.party : this.enemies;
    switch (sk.target) {
      case 'enemy': return [chosen]; case 'enemies': return this.alive(foes);
      case 'ally': return [chosen]; case 'allies': return sk.revive ? friends : this.alive(friends);
      case 'self': return [actor]; case 'dead': return [chosen]; case 'actor': return [chosen]; case 'any': return [chosen];
    }
    return [chosen];
  }
  async useSkill(actor, skId, chosen) {
    const sk = SKILLS[skId]; if (!sk) return;
    if (actor.kind === 'party' && sk.cost) actor.m.ink -= sk.cost;
    actor.bump = 1;
    if (!sk.basic) { await this.msg(`${actor.name} uses ${sk.name}!`, 0.55); Audio.sfx(sk.doodle ? 'doodle' : sk.power ? 'confirm' : 'buff', 0.5); }
    else await this.msg(`${actor.name} attacks!`, 0.35);
    if (sk.doodle) { Scenes.flash = 1; Scenes.flashColor = '#fff'; Scenes.shake = 10; await sleep(0.4); }
    let targets = this.targetsFor(sk, actor, chosen);
    for (const t of targets) {
      if (sk.power) {
        if (this.isDead(t)) continue;
        let pw = sk.power; if (sk.braveBonus && MOODS[this.mood(actor)].base === 'brave') pw *= sk.braveBonus; if (sk.giddyBonus && MOODS[this.mood(actor)].base === 'giddy') pw *= sk.giddyBonus;
        const hits = sk.hits || 1;
        for (let h = 0; h < hits; h++) { if (this.isDead(t)) break; await this.dealDamage(actor, t, pw, { magic: sk.magic }); }
        if (sk.moodOn && !this.isDead(t) && Math.random() < (sk.moodChance || 1)) { const nm = this.setMood(t, sk.moodOn); if (nm) await this.msg(`${t.name} became ${MOODS[nm].name}!`, 0.6); }
      }
      if (sk.revive && this.isDead(t) && t.kind === 'party') { t.m.hp = Math.max(1, Math.round(memberStats(t.m).hp * sk.revive)); Audio.sfx('heal'); this.float(t, 'REDRAWN', '#8ef29a', true); await this.msg(`${t.name} was redrawn!`, 0.7); continue; }
      if (this.isDead(t)) continue;
      if (sk.heal) { const mx = this.maxhp(t); await this.heal(t, Math.round(mx * sk.heal + (sk.healFlat || 0) + (sk.doodle ? 0 : this.stats(actor).atk * 0.5))); }
      if (sk.mood !== undefined && !sk.moodOn) { const nm = this.setMood(t, sk.mood); if (nm) await this.msg(sk.mood === 'neutral' ? `${t.name} calmed down.` : `${t.name} became ${MOODS[nm].name}!`, 0.6); }
      if (sk.moodOn && !sk.power && Math.random() < (sk.moodChance || 1)) { const nm = this.setMood(t, sk.moodOn); if (nm) await this.msg(`${t.name} became ${MOODS[nm].name}!`, 0.5); }
      if (sk.buff) { t.buffs.push({ ...sk.buff }); Audio.sfx('buff', 0.5); this.float(t, 'UP', '#ffd23c'); await sleep(0.3); }
      if (sk.debuff) { t.buffs.push({ ...sk.debuff }); Audio.sfx('debuff', 0.5); this.float(t, 'DOWN', '#b39dff'); await sleep(0.3); }
      if (sk.taunt && t.kind === 'party') { t.taunt = sk.taunt + 1; await this.msg(`${t.name} draws everyone's attention!`, 0.5); }
    }
  }
  async useItem(actor, itemId, chosen) {
    const it = ITEMS[itemId]; Game.addItem(itemId, -1); actor.bump = 1; Audio.sfx('item', 0.6);
    await this.msg(`${actor.name} uses ${it.name}!`, 0.5);
    const u = it.use; const targets = u.all ? this.alive(this.party) : [chosen];
    for (const t of targets) {
      if (u.revive && this.isDead(t)) { t.m.hp = Math.max(1, Math.round(memberStats(t.m).hp * u.revive)); this.float(t, 'REDRAWN', '#8ef29a', true); Audio.sfx('heal'); await sleep(0.4); continue; }
      if (this.isDead(t)) continue;
      if (u.heal) await this.heal(t, Math.min(u.heal, this.maxhp(t)));
      if (u.ink && t.kind === 'party') { t.m.ink = Math.min(memberStats(t.m).ink, t.m.ink + u.ink); this.float(t, '+INK', '#9ad8ff'); await sleep(0.3); }
      if (u.dmg) await this.dealDamage(actor, t, 1, { flat: u.dmg });
      if (u.mood !== undefined) { const nm = this.setMood(t, u.mood); await this.msg(`${t.name}'s mood was erased.`, 0.5); }
    }
  }
  // ---------- enemy AI ----------
  async enemyTurn(e) {
    const acts = e.d.acts.filter(a => !a.every || this.round % a.every === 0);
    const total = acts.reduce((s, a) => s + a.w, 0); let r = Math.random() * total; let act = acts[0];
    for (const a of acts) { r -= a.w; if (r <= 0) { act = a; break; } }
    const alive = this.alive(this.party); if (!alive.length) return;
    const taunter = alive.find(p => p.taunt > 0);
    let targets = act.target === 'allies' ? alive : [taunter || pick(alive)];
    e.shake = 0; e.bumpT = 1;
    await this.msg(act.msg.replace('{e}', e.name).replace('{t}', targets[0].name), 0.7);
    for (const t of targets) {
      if (act.power) { await this.dealDamage(e, t, act.power, { critBonus: act.crit || 0 }); if (act.moodOn && !this.isDead(t) && Math.random() < (act.moodChance || 0.6)) { const nm = this.setMood(t, act.moodOn); if (nm) await this.msg(`${t.name} became ${MOODS[nm].name}!`, 0.5); } }
      else if (act.moodOn && Math.random() < (act.moodChance || 0.6)) { const nm = this.setMood(t, act.moodOn); if (nm) await this.msg(`${t.name} became ${MOODS[nm].name}!`, 0.5); }
      if (act.drainInk && t.kind === 'party') { t.m.ink = Math.max(0, t.m.ink - act.drainInk); this.float(t, '-INK', '#9ad8ff'); await sleep(0.3); }
      if (act.steal) { const n = Math.min(Game.stickers, act.steal); Game.stickers -= n; this.stolen = (this.stolen || 0) + n; }
    }
    if (act.self) { const nm = this.setMood(e, act.self); if (nm) await sleep(0.3); }
    if (act.heal) await this.heal(e, Math.round(e.max * act.heal));
  }
  // ---------- main loop ----------
  async loop() {
    await sleep(0.5);
    const names = [...new Set(this.enemies.map(e => e.name))];
    await this.msg(this.enemies.length === 1 ? `${names[0]} blocks the way!` : `${names.join(' and ')} block the way!`, 1);
    while (!this.ended) {
      this.round++;
      const order = [...this.party, ...this.enemies].filter(c => !this.isDead(c)).sort((a, b) => this.stats(b).spd - this.stats(a).spd + rnd(-0.5, 0.5));
      for (const c of order) {
        if (this.ended) return; if (this.isDead(c)) continue;
        if (this.opts.onHalf && !this.halfDone) { const boss = this.enemies.find(e => e.d.boss); if (boss && boss.hp < boss.max * 0.5) { this.halfDone = true; const r = await this.opts.onHalf(this); if (r) return this.finish(r); } }
        if (c.kind === 'party') { if (c.m.hp > 0) await this.playerTurn(c); }
        else await this.enemyTurn(c);
        if (await this.checkEnd()) return;
      }
      // end of round: tick buffs / taunt / mood regen
      for (const c of [...this.party, ...this.enemies]) { c.buffs = c.buffs.map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0); if (c.taunt) c.taunt--; }
    }
  }
  async checkEnd() {
    if (this.ended) return true;
    if (!this.alive(this.enemies).length) { await this.win(); return true; }
    if (!this.alive(this.party).length) { await this.lose(); return true; }
    return false;
  }
  finish(result) { this.ended = true; this.result = result; Scenes.fadeOut(() => { Scenes.pop(); this.resolve(result); }, 3); }
  async win() {
    this.ended = true; Audio.bgm(this.opts.boss ? 'victory' : 'victory', { loop: false });
    await this.msg('WIN!', 0.8);
    let xp = 0, st = 0; const drops = [];
    for (const e of this.enemies) { xp += e.d.xp; st += e.d.stickers; for (const [it, ch] of Object.entries(e.d.drops || {})) if (Math.random() < ch) drops.push(it); }
    if (this.stolen) { st += this.stolen; }
    Game.stickers += st;
    const alive = this.alive(this.party);
    let text = `Got ${xp} XP and ${st} stickers.`; if (drops.length) text += ` Found ${drops.map(d => ITEMS[d].name).join(', ')}.`;
    for (const d of drops) Game.addItem(d, 1);
    await this.msg(text, 1.4);
    for (const p of this.party) {
      if (this.isDead(p)) continue; const before = p.m.level; const learned = gainXp(p.m, xp);
      if (learned) { Audio.sfx('levelup'); await this.msg(`${p.name} reached level ${p.m.level}!` + (learned.length ? ` Learned ${learned.map(s => SKILLS[s].name).join(', ')}!` : ''), 1.4); }
    }
    for (const p of this.party) { p.buffs = []; p.taunt = 0; if (p.m.hp <= 0) p.m.hp = 1; else p.m.ink = Math.min(memberStats(p.m).ink, p.m.ink + Math.ceil(memberStats(p.m).ink * 0.1)); }
    this.finish('win');
  }
  async lose() { this.ended = true; Audio.stopBgm(1); await this.msg('Everyone faded...', 1.5); this.ended = true; this.result = 'lose'; Scenes.fadeOut(() => { Scenes.pop(); this.resolve('lose'); }, 1.5); }
  // ---------- player command ----------
  playerTurn(c) {
    return new Promise(resolve => { this.menu = { actor: c, stage: 'main', idx: 0, resolve, list: null, tIdx: 0 }; });
  }
  mainOptions(c) {
    const o = ['Attack', 'Skill', 'Talk', 'Item']; if (Game.smudge >= 100) o.push('DOODLE'); if (this.opts.canRun !== false) o.push('Run'); return o;
  }
  async execute(c, action) {
    this.menu = null;
    if (action.type === 'attack') {
      await this.useSkill(c, 'attack', action.target);
      // follow-up chance
      const idle = this.alive(this.party).filter(p => p !== c);
      if (!this.isDead(action.target) && Game.smudge >= 25 && idle.length && !this.ended) {
        const pick = await this.followUpPrompt(c, idle);
        if (pick) { Game.smudge -= 25; const f = SKILLS[PARTY[pick.id].follow]; await this.msg(`Follow-up! ${pick.name}: ${f.name}!`, 0.6); Audio.sfx('smudge', 0.6); await this.useSkill(pick, PARTY[pick.id].follow, f.target === 'actor' ? c : action.target); }
      }
    } else if (action.type === 'skill') await this.useSkill(c, action.id, action.target);
    else if (action.type === 'item') await this.useItem(c, action.id, action.target);
    else if (action.type === 'doodle') { Game.smudge = 0; await this.useSkill(c, PARTY[c.id].doodle, action.target); }
    else if (action.type === 'talk') await this.talk(c, action.target);
    else if (action.type === 'run') {
      const ps = this.alive(this.party).reduce((s, p) => s + this.stats(p).spd, 0) / this.alive(this.party).length, es = this.alive(this.enemies).reduce((s, e) => s + this.stats(e).spd, 0) / this.alive(this.enemies).length;
      if (Math.random() < 0.55 + (ps - es) * 0.05) { await this.msg('Everyone scrambled away!', 0.9); this.finish('run'); return; }
      await this.msg("Couldn't get away!", 0.8);
    }
  }
  go(m, action) { const r = m.resolve; this.execute(m.actor, action).then(() => r()).catch(e => { console.error(e); r(); }); }
  followUpPrompt(actor, idle) {
    return new Promise(resolve => { this.menu = { actor, stage: 'follow', idx: 0, list: idle, resolve }; });
  }
  async talk(c, e) {
    c.bump = 1; const line = pick(e.d.flavor);
    const opts = [
      { t: `${c.name} asks ${e.name} how its day is going.`, r: `${e.name} thinks about it.`, fx: 'giddy' },
      { t: `${c.name} tells ${e.name} a story Pop used to tell.`, r: `${e.name} gets a little misty.`, fx: 'blue' },
      { t: `${c.name} says something nice about ${e.name}'s lines.`, r: `${e.name} is flattered.`, fx: 'calm' },
      { t: `${c.name} stares at ${e.name}.`, r: `${e.name} stares back. Awkward.`, fx: null },
    ];
    const o = pick(opts); await this.msg(o.t, 1); await this.msg(line, 1.1); await this.msg(o.r, 0.8);
    if (o.fx === 'calm') { e.mood = 'neutral'; e.buffs.push({ atk: 0.85, turns: 2 }); this.float(e, 'ATK DOWN', '#b39dff'); await sleep(0.3); }
    else if (o.fx) { const nm = this.setMood(e, o.fx); if (nm) await this.msg(`${e.name} became ${MOODS[nm].name}!`, 0.5); }
  }
  // ---------- update: menu input ----------
  update(dt) {
    this.t += dt;
    for (const e of this.enemies) { e.shake = Math.max(0, e.shake - dt * 30); e.flash = Math.max(0, e.flash - dt * 4); if (e.dead) e.alpha = Math.max(0, e.alpha - dt * 2); e.bumpT = Math.max(0, (e.bumpT || 0) - dt * 3); }
    for (const p of this.party) { p.shake = Math.max(0, p.shake - dt * 30); p.flash = Math.max(0, p.flash - dt * 4); p.bump = Math.max(0, p.bump - dt * 3); }
    this.floats = this.floats.filter(f => (f.t += dt) < 1.1);
    const m = this.menu; if (!m) return;
    const nav = (len) => { if (Input.hit('up') || Input.hit('left')) { m.idx = (m.idx + len - 1) % len; Audio.sfx('cursor', 0.4); } if (Input.hit('down') || Input.hit('right')) { m.idx = (m.idx + 1) % len; Audio.sfx('cursor', 0.4); } };
    if (m.stage === 'main') {
      const opts = this.mainOptions(m.actor); nav(opts.length);
      if (Input.hit('ok')) {
        Audio.sfx('confirm', 0.5); const o = opts[m.idx];
        if (o === 'Attack') { m.stage = 'target'; m.pending = { type: 'attack' }; m.tlist = this.alive(this.enemies); m.tIdx = 0; }
        else if (o === 'Skill') { m.stage = 'skill'; m.list = m.actor.m.skills.map(id => ({ id, sk: SKILLS[id] })); m.sIdx = 0; }
        else if (o === 'Item') { m.stage = 'item'; m.list = Object.keys(Game.items).filter(k => ITEMS[k] && !ITEMS[k].key).map(id => ({ id, it: ITEMS[id], n: Game.items[id] })); m.sIdx = 0; }
        else if (o === 'Talk') { m.stage = 'target'; m.pending = { type: 'talk' }; m.tlist = this.alive(this.enemies); m.tIdx = 0; }
        else if (o === 'DOODLE') { const d = SKILLS[PARTY[m.actor.id].doodle]; m.stage = 'target'; m.pending = { type: 'doodle' }; m.tlist = d.target === 'enemy' ? this.alive(this.enemies) : d.target === 'enemies' ? [this.alive(this.enemies)[0]] : [this.party[0]]; m.tIdx = 0; if (d.target !== 'enemy') this.go(m, { type: 'doodle', target: m.tlist[0] }); }
        else if (o === 'Run') this.go(m, { type: 'run' });
      }
    } else if (m.stage === 'skill' || m.stage === 'item') {
      const list = m.list; if (Input.hit('cancel')) { Audio.sfx('cancel', 0.5); m.stage = 'main'; return; }
      if (!list.length) return;
      if (Input.hit('up')) { m.sIdx = (m.sIdx + list.length - 1) % list.length; Audio.sfx('cursor', 0.4); } if (Input.hit('down')) { m.sIdx = (m.sIdx + 1) % list.length; Audio.sfx('cursor', 0.4); }
      if (Input.hit('ok')) {
        const entry = list[m.sIdx];
        if (m.stage === 'skill') {
          if (m.actor.m.ink < entry.sk.cost) { Audio.sfx('cancel', 0.5); this.msgs = ['Not enough INK!']; return; }
          Audio.sfx('confirm', 0.5); const tg = entry.sk.target; m.pending = { type: 'skill', id: entry.id };
          if (tg === 'self') { this.go(m, { ...m.pending, target: m.actor }); return; }
          if (tg === 'enemies' || tg === 'allies') { this.go(m, { ...m.pending, target: null }); return; }
          m.tlist = tg === 'enemy' ? this.alive(this.enemies) : tg === 'dead' ? this.party.filter(p => this.isDead(p)) : this.alive(this.party);
          if (!m.tlist.length) { this.msgs = ['No valid target.']; return; }
          m.stage = 'target'; m.tIdx = 0;
        } else {
          Audio.sfx('confirm', 0.5); const tg = entry.it.target; m.pending = { type: 'item', id: entry.id };
          if (tg === 'allies') { this.go(m, { ...m.pending, target: null }); return; }
          m.tlist = tg === 'enemy' ? this.alive(this.enemies) : tg === 'dead' ? this.party.filter(p => this.isDead(p)) : tg === 'any' ? [...this.alive(this.enemies), ...this.alive(this.party)] : this.alive(this.party);
          if (!m.tlist.length) { this.msgs = ['No valid target.']; return; }
          m.stage = 'target'; m.tIdx = 0;
        }
      }
    } else if (m.stage === 'target') {
      if (Input.hit('cancel')) { Audio.sfx('cancel', 0.5); m.stage = m.pending.type === 'skill' ? 'skill' : m.pending.type === 'item' ? 'item' : 'main'; return; }
      const n = m.tlist.length; if (Input.hit('left') || Input.hit('up')) { m.tIdx = (m.tIdx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('right') || Input.hit('down')) { m.tIdx = (m.tIdx + 1) % n; Audio.sfx('cursor', 0.4); }
      if (Input.hit('ok')) { Audio.sfx('confirm', 0.5); this.go(m, { ...m.pending, target: m.tlist[m.tIdx] }); }
    } else if (m.stage === 'follow') {
      const n = m.list.length + 1; if (Input.hit('left') || Input.hit('up')) { m.idx = (m.idx + n - 1) % n; Audio.sfx('cursor', 0.4); } if (Input.hit('right') || Input.hit('down')) { m.idx = (m.idx + 1) % n; Audio.sfx('cursor', 0.4); }
      if (Input.hit('cancel')) { const r = m.resolve; this.menu = null; r(null); }
      if (Input.hit('ok')) { const r = m.resolve; const pickd = m.idx < m.list.length ? m.list[m.idx] : null; this.menu = null; Audio.sfx('confirm', 0.5); r(pickd); }
    }
  }
  // ---------- drawing ----------
  draw(ctx) {
    const bg = Assets.img(this.bg);
    if (bg) { const s = Math.max(W / bg.width, 420 / bg.height); ctx.drawImage(bg, 0, 0, bg.width, bg.height, (W - bg.width * s) / 2, 0, bg.width * s, bg.height * s); }
    else { ctx.fillStyle = '#5a8f5a'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(20,16,30,0.35)'; ctx.fillRect(0, 0, W, H);
    // enemies
    for (const e of this.enemies) {
      if (e.alpha <= 0) continue; const im = Assets.img(e.id); const h = 250 * e.d.scale; const bob = Math.sin(this.t * 2 + e.offset) * 4;
      const sx = e.x + rnd(-e.shake, e.shake), sy = e.y + bob - (e.bumpT ? e.bumpT * 14 : 0);
      ctx.save(); ctx.globalAlpha = e.alpha; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, h * 0.3, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (im) { UI.sprite(ctx, im, sx, sy, { h, alpha: e.alpha, tint: e.flash > 0 ? `rgba(255,255,255,${e.flash * 0.8})` : (e.mood !== 'neutral' ? hexA(MOODS[e.mood].color, 0.28) : null) }); if (e.flash > 0 && im) UI.sprite(ctx, im, sx, sy, { h, alpha: e.flash * 0.9, tint: 'rgba(255,255,255,0.9)' }); }
      else { ctx.fillStyle = '#c33'; ctx.fillRect(sx - 40, sy - 100, 80, 100); }
      if (!e.dead) {
        const mood = MOODS[e.mood];
        UI.text(ctx, e.name, e.x, e.y + 14, { size: 20, align: 'center', color: mood.color, bold: true });
        UI.bar(ctx, e.x - 50, e.y + 40, 100, 8, e.hp / e.max, '#ff6b6b');
        if (e.mood !== 'neutral') UI.text(ctx, mood.name, e.x, e.y + 50, { size: 16, align: 'center', color: mood.color });
        if (e.buffs.length) UI.text(ctx, e.buffs.map(b => b.atk ? (b.atk < 1 ? 'ATK↓' : 'ATK↑') : b.def ? 'DEF↑' : 'SPD↑').join(' '), e.x, e.y + 68, { size: 14, align: 'center', color: '#ddd' });
      }
      // target cursor
      const m = this.menu; if (m && m.stage === 'target' && m.tlist[m.tIdx] === e) { UI.cursor(ctx, e.x - 6, e.y - h - 20, this.t); ctx.save(); ctx.translate(e.x, e.y - h - 20); ctx.rotate(Math.PI / 2); UI.cursor(ctx, 0, 0, this.t); ctx.restore(); }
    }
    // message strip
    if (this.msgs.length) { UI.box(ctx, 120, 18, W - 240, 52, { fill: 'rgba(20,16,30,0.85)' }); UI.text(ctx, this.msgs[0], W / 2, 30, { size: 22, align: 'center' }); }
    // party cards
    const n = this.party.length; const cw = Math.min(230, (W - 40) / n); const ch = 128; const y0 = H - ch - 12; const x0 = (W - cw * n) / 2;
    this.party.forEach((p, i) => {
      const x = x0 + cw * i + (cw - Math.min(cw - 8, 222)) / 2, w = Math.min(cw - 8, 222); const bumpY = -p.bump * 12 + rnd(-p.shake, p.shake);
      const mood = MOODS[p.m.mood]; const dead = this.isDead(p); const s = memberStats(p.m);
      const isActive = this.menu && this.menu.actor === p; const isTarget = this.menu && this.menu.stage === 'target' && this.menu.tlist[this.menu.tIdx] === p;
      const isFollow = this.menu && this.menu.stage === 'follow' && this.menu.list[this.menu.idx] === p;
      UI.box(ctx, x, y0 + bumpY - (isActive ? 10 : 0), w, ch, { fill: dead ? 'rgba(40,40,40,0.9)' : `rgba(28,24,38,0.92)`, stroke: isTarget || isFollow ? '#ffd86b' : isActive ? '#fff' : mood.color, lw: isActive || isTarget ? 4 : 3 });
      const face = Assets.img(p.id + '_' + (dead ? 'blue' : MOODS[p.m.mood].base === 'neutral' ? 'neutral' : MOODS[p.m.mood].base));
      const fy = y0 + bumpY - (isActive ? 10 : 0);
      if (face) { ctx.save(); if (dead) ctx.filter = 'grayscale(1) brightness(0.5)'; UI.sprite(ctx, face, x + 46, fy + ch - 12, { h: 96, tint: p.flash > 0 ? `rgba(255,255,255,${p.flash * 0.8})` : null }); ctx.restore(); }
      UI.text(ctx, p.name, x + 96, fy + 10, { size: 21, bold: true, color: PARTY[p.id].color });
      UI.text(ctx, dead ? 'FADED' : mood.name, x + w - 12, fy + 12, { size: 16, align: 'right', color: dead ? '#888' : mood.color, bold: true });
      UI.text(ctx, 'HEART', x + 96, fy + 40, { size: 14, color: '#ffb3b3' }); UI.bar(ctx, x + 96, fy + 58, w - 110, 10, p.m.hp / s.hp, '#ff6b6b'); UI.text(ctx, `${p.m.hp}/${s.hp}`, x + w - 12, fy + 38, { size: 15, align: 'right' });
      UI.text(ctx, 'INK', x + 96, fy + 72, { size: 14, color: '#9ad8ff' }); UI.bar(ctx, x + 96, fy + 90, w - 110, 10, p.m.ink / s.ink, '#5ab0ff'); UI.text(ctx, `${p.m.ink}/${s.ink}`, x + w - 12, fy + 70, { size: 15, align: 'right' });
      if (p.taunt > 0) UI.text(ctx, 'TAUNT', x + 96, fy + 104, { size: 14, color: '#ffd23c' });
      if (p.buffs.length) UI.text(ctx, p.buffs.map(b => b.atk ? (b.atk < 1 ? 'ATK↓' : 'ATK↑') : b.def ? 'DEF↑' : 'SPD↑').join(' '), x + w - 12, fy + 104, { size: 14, align: 'right', color: '#ddd' });
    });
    // smudge gauge
    UI.box(ctx, W - 250, H - ch - 62, 230, 40, { fill: 'rgba(20,16,30,0.85)', radius: 10 });
    UI.text(ctx, 'SMUDGE', W - 238, H - ch - 54, { size: 16, color: '#d9b3ff', bold: true });
    UI.bar(ctx, W - 160, H - ch - 50, 130, 14, Game.smudge / 100, Game.smudge >= 100 ? '#ffd23c' : '#b07cff');
    if (Game.smudge >= 100) UI.text(ctx, 'DOODLE READY', W - 95, H - ch - 78, { size: 15, align: 'center', color: '#ffd23c', bold: true });
    // command menu
    const m = this.menu;
    if (m) {
      const bx = 20, by = 90; 
      if (m.stage === 'main' || m.stage === 'target' && (m.pending.type === 'attack' || m.pending.type === 'talk' || m.pending.type === 'doodle')) {
        const opts = this.mainOptions(m.actor); UI.box(ctx, bx, by, 170, opts.length * 34 + 24, { fill: 'rgba(20,16,30,0.9)' });
        UI.text(ctx, m.actor.name, bx + 14, by - 30, { size: 20, bold: true, color: PARTY[m.actor.id].color });
        opts.forEach((o, i) => { const sel = i === m.idx; UI.text(ctx, o, bx + 42, by + 12 + i * 34, { size: 22, color: o === 'DOODLE' ? '#ffd23c' : sel ? '#ffd86b' : '#f4ecd8', bold: o === 'DOODLE' }); if (sel && m.stage === 'main') UI.cursor(ctx, bx + 18, by + 26 + i * 34, this.t); });
      }
      if (m.stage === 'skill' || m.stage === 'item' || (m.stage === 'target' && (m.pending.type === 'skill' || m.pending.type === 'item'))) {
        const list = m.list; const lh = 32; const h = Math.max(1, Math.min(7, list.length)) * lh + 24 + 44;
        UI.box(ctx, bx, by, 430, h, { fill: 'rgba(20,16,30,0.92)' });
        UI.text(ctx, m.actor.name + (m.stage === 'item' || (m.pending && m.pending.type === 'item') ? ' — Items' : ' — Skills'), bx + 14, by - 30, { size: 20, bold: true, color: PARTY[m.actor.id].color });
        if (!list.length) UI.text(ctx, 'Nothing here.', bx + 42, by + 12, { size: 22, color: '#999' });
        const first = Math.max(0, Math.min(m.sIdx - 3, list.length - 7));
        list.slice(first, first + 7).forEach((e, j) => {
          const i = first + j; const sel = i === m.sIdx; const y = by + 12 + j * lh;
          if (e.sk) { const can = m.actor.m.ink >= e.sk.cost; UI.text(ctx, e.sk.name, bx + 42, y, { size: 22, color: !can ? '#777' : sel ? '#ffd86b' : '#f4ecd8' }); UI.text(ctx, e.sk.cost + ' INK', bx + 410, y + 2, { size: 17, align: 'right', color: can ? '#9ad8ff' : '#777' }); }
          else { const ic = Assets.img(e.it.icon); if (ic) UI.sprite(ctx, ic, bx + 56, y + 26, { w: 26, h: 26, fit: true }); UI.text(ctx, e.it.name, bx + 76, y, { size: 22, color: sel ? '#ffd86b' : '#f4ecd8' }); UI.text(ctx, '×' + e.n, bx + 410, y + 2, { size: 17, align: 'right' }); }
          if (sel && m.stage !== 'target') UI.cursor(ctx, bx + 18, y + 14, this.t);
        });
        const cur = list[m.sIdx]; if (cur) { const d = cur.sk ? cur.sk.desc : cur.it.desc; const lines = UI.wrap(ctx, d, 17, 400); UI.text(ctx, lines[0] || '', bx + 16, by + h - 44, { size: 17, color: '#cfc8e0' }); if (lines[1]) UI.text(ctx, lines[1], bx + 16, by + h - 24, { size: 17, color: '#cfc8e0' }); }
      }
      if (m.stage === 'follow') {
        UI.box(ctx, W / 2 - 240, 200, 480, 74, { fill: 'rgba(20,16,30,0.94)', stroke: '#d9b3ff' });
        UI.text(ctx, 'Follow-up? (25 Smudge)', W / 2, 206, { size: 19, align: 'center', color: '#d9b3ff' });
        const opts = [...m.list.map(p => p.name), 'No']; const tw = 100;
        opts.forEach((o, i) => { const x = W / 2 + (i - (opts.length - 1) / 2) * tw; UI.text(ctx, o, x, 236, { size: 22, align: 'center', color: i === m.idx ? '#ffd86b' : '#f4ecd8' }); if (i === m.idx) UI.cursor(ctx, x - 52, 250, this.t); });
      }
      if (m.stage === 'target') UI.text(ctx, '← → choose a target · X to go back', W / 2, H - ch - 96, { size: 17, align: 'center', color: '#ddd' });
    }
    // floating numbers
    for (const f of this.floats) { const a = f.t < 0.8 ? 1 : (1.1 - f.t) / 0.3; ctx.globalAlpha = clamp(a, 0, 1); UI.text(ctx, f.text, f.x, f.y - f.t * 50, { size: f.big ? 40 : 30, align: 'center', color: f.color, bold: true }); ctx.globalAlpha = 1; }
  }
}
class GameOverScene {
  constructor() { this.t = 0; Audio.bgm('gameover', { loop: false }); }
  update(dt) { this.t += dt; if (this.t > 2 && Input.hit('ok')) { Scenes.replace(new TitleScene()); } }
  draw(ctx) { ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = Math.min(1, this.t / 2); UI.text(ctx, 'Everyone faded.', W / 2, H / 2 - 40, { size: 44, align: 'center', bold: true, color: '#aaa' }); UI.text(ctx, 'The page went blank. But the book is still open.', W / 2, H / 2 + 20, { size: 22, align: 'center', color: '#888' }); if (this.t > 2) UI.text(ctx, 'Press Z / Enter', W / 2, H / 2 + 90, { size: 20, align: 'center', color: '#666' }); ctx.globalAlpha = 1; }
}
