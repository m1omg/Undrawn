// ===== UNDRAWN title, endings, credits =====
'use strict';
class TitleScene {
  constructor() { this.t = 0; this.idx = 0; this.mode = 'main'; this.slot = 0; }
  enter() { Audio.bgm('title'); Scenes.fadeIn(1.5); }
  options() { const has = [1, 2, 3].some(s => Game.slotInfo(s)); return has ? ['Continue', 'New Game', 'How to play'] : ['New Game', 'How to play']; }
  update(dt) {
    this.t += dt;
    if (this.mode === 'main') {
      const o = this.options();
      if (Input.hit('up')) { this.idx = (this.idx + o.length - 1) % o.length; Audio.sfx('cursor', 0.5); } if (Input.hit('down')) { this.idx = (this.idx + 1) % o.length; Audio.sfx('cursor', 0.5); }
      if (Input.hit('ok')) {
        Audio.sfx('confirm'); const c = o[this.idx];
        if (c === 'New Game') this.startNew();
        else if (c === 'Continue') { this.mode = 'load'; this.slot = 0; }
        else this.mode = 'help';
      }
    } else if (this.mode === 'load') {
      if (Input.hit('cancel')) { this.mode = 'main'; Audio.sfx('cancel', 0.5); }
      if (Input.hit('up')) { this.slot = (this.slot + 2) % 3; Audio.sfx('cursor', 0.5); } if (Input.hit('down')) { this.slot = (this.slot + 1) % 3; Audio.sfx('cursor', 0.5); }
      if (Input.hit('ok')) { if (Game.load(this.slot + 1)) { Audio.sfx('confirm'); Scenes.fadeOut(() => { Scenes.replace(new MapScene(Game.map, Game.px, Game.py, Game.dir)); }); } else Audio.sfx('cancel', 0.5); }
    } else if (this.mode === 'help') { if (Input.hit('ok') || Input.hit('cancel')) { this.mode = 'main'; Audio.sfx('cancel', 0.5); } }
  }
  startNew() {
    Game.reset(); Game.members.wren = newMember('wren', 1); Game.party = ['wren']; Game.addItem('cookie', 2); Game.smudge = 0;
    Scenes.fadeOut(() => { Scenes.replace(new MapScene('bedroom', 6, 5, 'down')); }, 1.5);
  }
  draw(ctx) {
    ctx.fillStyle = '#1a1626'; ctx.fillRect(0, 0, W, H);
    const im = Assets.img('title'); if (im) { const s = Math.max(W / im.width, H / im.height); ctx.globalAlpha = 0.9; ctx.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); ctx.globalAlpha = 1; }
    ctx.fillStyle = 'rgba(10,8,20,0.35)'; ctx.fillRect(0, 0, W, H);
    const ty = 70 + Math.sin(this.t) * 4;
    UI.text(ctx, 'UNDRAWN', W / 2 + 3, ty + 3, { size: 92, align: 'center', bold: true, color: 'rgba(0,0,0,0.5)', shadow: false });
    UI.text(ctx, 'UNDRAWN', W / 2, ty, { size: 92, align: 'center', bold: true, color: '#f4ecd8', shadow: false });
    UI.text(ctx, 'a sketchbook story', W / 2, ty + 100, { size: 24, align: 'center', color: '#e8d9ff' });
    if (this.mode === 'main') {
      const o = this.options(); const y0 = 300;
      UI.box(ctx, W / 2 - 130, y0 - 16, 260, o.length * 40 + 30, { fill: 'rgba(20,16,30,0.85)' });
      o.forEach((s, i) => { UI.text(ctx, s, W / 2, y0 + i * 40, { size: 26, align: 'center', color: i === this.idx ? '#ffd86b' : '#f4ecd8' }); if (i === this.idx) UI.cursor(ctx, W / 2 - 105, y0 + 15 + i * 40, this.t); });
    } else if (this.mode === 'load') {
      UI.box(ctx, W / 2 - 300, 260, 600, 200, { fill: 'rgba(20,16,30,0.92)' }); UI.text(ctx, 'Which bookmark?', W / 2, 272, { size: 22, align: 'center', color: '#ffd86b' });
      for (let i = 0; i < 3; i++) { const info = Game.slotInfo(i + 1); const y = 310 + i * 44; UI.text(ctx, `Slot ${i + 1}: ` + (info ? `${MAPS[info.map] ? MAPS[info.map].name : info.map} · Lv ${info.members.wren.level} · ${Math.floor(info.playtime / 60)} min` : '— empty —'), W / 2 - 250, y, { size: 21, color: i === this.slot ? '#ffd86b' : '#eee' }); if (i === this.slot) UI.cursor(ctx, W / 2 - 275, y + 14, this.t); }
    } else {
      UI.box(ctx, 100, 220, W - 200, 320, { fill: 'rgba(20,16,30,0.94)' });
      const lines = ['Arrow keys / WASD: walk    Shift: run    Z / Enter / Space: talk, confirm    X / Esc: cancel    C / Tab: menu',
        'Walk into the wobbling creatures to fight them, or sneak around. Bosses block paths.',
        'MOODS: BRAVE beats BLUE, BLUE beats GIDDY, GIDDY beats BRAVE. Moods change stats too.',
        'Basic attacks can trigger a FOLLOW-UP with a friend when the SMUDGE gauge is at 25.',
        'At 100 SMUDGE a character can unleash their DOODLE. Try TALK on enemies, it is not useless.',
        'Red bookmarks heal and save. Real-world scenes have choices. Choices keep MEMORY PAGES.',
        'Everything here was drawn by a kid and their grandfather. Be gentle with it.'];
      lines.forEach((l, i) => UI.text(ctx, l, 124, 240 + i * 38, { size: 18, maxWidth: W - 248 }));
    }
    UI.text(ctx, 'v1.0 · made with crayons, numpy and a lot of feelings', W / 2, H - 34, { size: 15, align: 'center', color: '#9a90b5' });
  }
}

class EndingScene {
  constructor(which) {
    this.which = which; this.t = 0; this.idx = 0; this.chars = 0;
    const E = {
      keep: { image: 'end_keep', bgm: 'ending_keep', title: 'KEEP', lines: [
        'Wren came downstairs before school. Pop was at the table with a blank page.',
        '"Morning, Robin," he said. Wren didn\'t correct him. Wren sat down.',
        '"Pop. Tell me about the hedgehog who wouldn\'t share."',
        'He didn\'t remember it. So Wren told it to him, and drew as they went, and Pop held the other end of the pencil.',
        'The hedgehog turned out a bit wobbly. Pop laughed at it. That was the same laugh.',
        'Some pages stay blank. You can still draw on them. That is what pages are for.',
        'THE END — thank you for keeping the pages.'] },
      drift: { image: 'end_drift', bgm: 'ending_sad', title: 'DRIFT', lines: [
        'The Blank went quiet, and the Margins stayed. Mostly.',
        'Wren woke up. It was raining. The sketchbook was on the desk, closed.',
        'Downstairs, Pop was asking Mom where the cocoa was kept. It was where it always was.',
        'Wren thought about going down. Wren thought about it for a long time.',
        'The pages are still there. Nobody is drawing on them right now. Maybe tomorrow.',
        'THE END — some things drift. Some come back. (Keep more Memory Pages and stay for the other ending.)'] },
      erase: { image: 'end_erase', bgm: 'ending_sad', title: 'ERASE', lines: [
        'It stopped hurting.',
        'That was true. The Blank did not lie about that part.',
        'Wren woke up and could not remember what the hedgehog was called, or why it mattered.',
        'Downstairs an old man was asking a woman where the cocoa was kept.',
        'Wren went to school. It was a normal day. It was a normal day for a long time.',
        'THE END — a page with nothing on it weighs nothing at all. (There is another way. Refuse the offer.)'] },
    }[which];
    Object.assign(this, E); Audio.bgm(this.bgm); Scenes.fadeIn(0.6);
    Game.set('ending_' + which);
  }
  update(dt) {
    this.t += dt; const line = this.lines[this.idx] || '';
    if (this.chars < line.length) { this.chars = Math.min(line.length, this.chars + dt * 35); if (Input.hit('ok')) this.chars = line.length; }
    else if (Input.hit('ok')) { this.idx++; this.chars = 0; Audio.sfx('cursor', 0.4); if (this.idx > this.lines.length) { Scenes.fadeOut(() => Scenes.replace(new CreditsScene()), 1); } }
  }
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const im = Assets.img(this.image); if (im) { const s = Math.min(W / im.width, (H - 120) / im.height); ctx.globalAlpha = Math.min(1, this.t / 3); ctx.drawImage(im, (W - im.width * s) / 2, 0, im.width * s, im.height * s); ctx.globalAlpha = 1; }
    if (this.idx >= this.lines.length) { UI.text(ctx, this.title, W / 2, H - 100, { size: 44, align: 'center', bold: true }); return; }
    const line = this.lines[this.idx].slice(0, Math.floor(this.chars)); const wrapped = UI.wrap(ctx, line, 24, W - 160); let y = H - 104;
    for (const ln of wrapped) { UI.text(ctx, ln, W / 2, y, { size: 24, align: 'center' }); y += 30; }
  }
}
class CreditsScene {
  constructor() { this.t = 0; this.lines = ['UNDRAWN', '', 'a sketchbook story', '', 'story, engine, music & sounds', 'Claude (Anthropic) with a lot of help from you', '', 'character sheets', 'GPT Images via Codex', '', 'everything else', 'crayons, numpy and Pillow', '', 'inspired by the feeling of', 'OMORI · UNDERTALE · Ib · End Roll · Re:Kinder', '(but drawn on our own paper)', '', `Memory pages kept: ${Game.pages}`, `Endings seen: ${['keep', 'drift', 'erase'].filter(e => Game.flag('ending_' + e)).map(e => e.toUpperCase()).join(', ') || '—'}`, '', 'Thank you for playing.', '', 'Call someone you have been meaning to call.']; Scenes.fadeIn(1); }
  update(dt) { this.t += dt; if (this.t > 4 && Input.hit('ok') || this.t > 40) Scenes.fadeOut(() => Scenes.replace(new TitleScene())); }
  draw(ctx) { ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, W, H); const y0 = H - this.t * 28; this.lines.forEach((l, i) => { const y = y0 + i * 34; if (y > -40 && y < H + 40) UI.text(ctx, l, W / 2, y, { size: i === 0 ? 48 : 22, align: 'center', bold: i === 0, color: i === 0 ? '#f4ecd8' : '#cfc8e0' }); }); }
}
