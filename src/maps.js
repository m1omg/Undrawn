// ===== UNDRAWN maps & story =====
'use strict';
// ---- tiny grid builder
function grid(w, h, fill) {
  const g = { w, h, c: Array.from({ length: h }, () => Array(w).fill(fill)) };
  g.set = (x, y, ch) => { if (x >= 0 && y >= 0 && x < w && y < h) g.c[y][x] = ch; };
  g.rect = (x, y, rw, rh, ch) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) g.set(i, j, ch); return g; };
  g.border = ch => g.rect(0, 0, w, 1, ch).rect(0, h - 1, w, 1, ch).rect(0, 0, 1, h, ch).rect(w - 1, 0, 1, h, ch);
  g.path = (x0, y0, x1, y1, ch, wd = 2) => { // L-shaped path
    const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
    for (let x = x0; x !== x1 + sx; x += sx || 1) { g.rect(x, y0, 1, wd, ch); if (!sx) break; }
    for (let y = y0; y !== y1 + sy; y += sy || 1) { g.rect(x1, y, wd, 1, ch); if (!sy) break; }
    return g;
  };
  g.scatter = (ch, n, seed = 1) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < n; i++) { const x = 1 + Math.floor(r() * (w - 2)), y = 1 + Math.floor(r() * (h - 2)); if (g.c[y][x] === '.') g.c[y][x] = ch; } return g; };
  g.rows = () => g.c.map(r => r.join(''));
  return g;
}
const MAPS = {};
const P = (sprite, x, y, o = {}) => ({ type: 'prop', sprite, x, y, ...o });
const trees = (list, sprite = 'tree', h = 2.2) => list.map(([x, y]) => P(sprite, x, y, { h, cw: 0.5 }));
const chest = (id, x, y, o) => ({ type: 'chest', id, x, y, ...o });
const enemy = (id, sprite, x, y, group, o = {}) => ({ type: 'enemy', id, sprite, x, y, group, h: 1.3, ...o });
const door = (x, y, to, tx, ty, dir, o = {}) => ({ type: 'door', x, y, to, tx, ty, dir, ...o });
const npc = (id, sprite, x, y, script, o = {}) => ({ type: 'npc', id, sprite, x, y, script, ...o });
const sign = (x, y, text) => ({ type: 'sign', x, y, text });
const trig = (id, x, y, w, h, script, o = {}) => ({ type: 'trigger', id, x, y, w, h, script, ...o });

// =====================================================================
// REAL WORLD — BEDROOM
// =====================================================================
{
  const g = grid(14, 11, 'w'); g.border('W'); g.rect(0, 0, 14, 2, 'W'); g.rect(4, 5, 6, 4, 'r');
  MAPS.bedroom = {
    name: "Wren's room", real: true, bgm: 'bedroom', wallColor: '#6a6270', tiles: { w: 'wood', r: 'rug' }, solid: 'W', rows: g.rows(),
    entities: [
      P('bed', 2, 4, { h: 2.4, cw: 0.8, ch: 1.6 }), P('bookshelf', 11, 2, { h: 2.6 }), P('window', 7, 1.4, { h: 2, solid: false }), P('toybox', 11.5, 8, { h: 1.2, script: async s => {
        if (Game.flag('interlude1_done') && !Game.flag('page_toybox')) { Game.set('page_toybox'); await s.narrate('Under the teddy bear there is a folded page. A hedgehog with a shield, drawn in two different hands. One of them is very small.'); await s.page('"BRAMBLE, by Pop and Wren, age 6."'); return; }
        await s.narrate('A toy box. The bear on top has one eye. Wren has been meaning to fix that for three years.');
      } }),
      P('desk', 5, 2.4, { h: 1.7, cw: 0.9, script: async s => { await sketchbook(s); } }),
      P('door', 7, 10.4, { h: 1.9, solid: false }),
      door(7, 10, 'kitchen', 12, 3, 'down', { cond: () => Game.flag('ch1_done'), locked: async s => { await s.say('Wren', "...Not tonight. It's late. Pop's probably asleep anyway.", { face: 'wren_blue' }); } }),
    ],
    onEnter: async s => {
      if (Game.flag('prologue_done')) {
        if (Game.flag('ch1_done') && !Game.flag('woke1')) { Game.set('woke1'); await s.narrate('Morning. Grey light. The sketchbook is closed on the desk, exactly where Wren left it.'); await s.say('Wren', "...There's cocoa smell. Pop makes it wrong. Too much milk.", { face: 'wren_neutral' }); await s.narrate('(The door downstairs is open now.)'); }
        else if (Game.flag('ch2_done') && !Game.flag('woke2')) { Game.set('woke2'); await s.narrate('Afternoon. Wren slept through lunch. Mom is on the porch with a box.'); }
        else if (Game.flag('ch3_done') && !Game.flag('woke3')) { Game.set('woke3'); Audio.sfx('heartbeat'); await s.narrate('It is the middle of the night. Something woke Wren up. A sound from downstairs, like a chair moving.'); }
        return;
      }
      await s.title('UNDRAWN', 'a sketchbook story');
      await s.card('bedroom_night', ['Every night for six years, Pop drew Wren a story before bed.', 'A hedgehog who wouldn\'t share. A paper pilot who couldn\'t land. A moth who read the wrong book.', 'Three weeks ago, Pop asked Wren what the hedgehog was called.', 'Wren stopped going downstairs after that.'], { grey: true });
      await s.narrate('The sketchbook is on the desk. It has been on the desk for three weeks.');
      await s.say('Mom', "(from downstairs) Wren? Pop's asking for you. Just for a minute, sweetheart.", { blip: true });
      const r = await s.choice(["I'm doing homework.", '(say nothing)']);
      if (r === 0) await s.say('Wren', "I'm doing homework!", { face: 'wren_neutral' }); else await s.narrate('Wren says nothing. After a while, the stairs stop creaking.');
      await s.narrate('(Arrow keys to walk. Z or Enter to look at things. C for the menu. The sketchbook on the desk is glowing a little, which is new.)');
      Game.set('prologue_done');
    }
  };
  async function sketchbook(s) {
    if (Game.flag('ch1_done') && !Game.flag('interlude1_done')) return s.say('Wren', "I'm not sleepy. And it smells like cocoa. Ugh.", { face: 'wren_neutral' });
    if (Game.flag('ch2_done') && !Game.flag('interlude2_done')) return s.say('Wren', "Mom's outside talking to someone. Later.", { face: 'wren_neutral' });
    if (Game.flag('ch3_done') && !Game.flag('interlude3_done')) return s.say('Wren', "That sound again. Downstairs.", { face: 'wren_blue' });
    if (!Game.flag('prologue_done')) return;
    const r = await s.ask(null, 'The sketchbook. The cover is warm. Open it?', ['Open it', 'Not yet'], { blip: false });
    if (r !== 0) return;
    Audio.sfx('page'); await s.fadeOut(1.2); Audio.stopBgm(0.5);
    if (!Game.flag('ch1_done')) { await s.card('margins_vista', ['The page opens like a door.', 'Inside: green, drawn in crayon. Hills with the sky scribbled in. A wobbly sun.', 'Everything Pop ever drew is here somewhere.', 'And at the edge of the page, something white is eating the colour.']); await s.title('Chapter 1', 'Scribble Meadow'); await s.transfer('meadow', 3, 13, 'right'); }
    else if (!Game.flag('ch2_done')) { await s.title('Chapter 2', 'Crumple Woods'); await s.transfer('meadow', 36, 13, 'right'); }
    else if (!Game.flag('ch3_done')) { await s.title('Chapter 3', 'Teastain Marsh'); await s.transfer('marsh', 2, 14, 'right'); }
    else { await s.title('Chapter 4', 'The Blank'); await s.transfer('blank', 2, 12, 'right'); }
  }
}
// =====================================================================
// REAL WORLD — KITCHEN
// =====================================================================
{
  const g = grid(16, 11, 'k'); g.border('W'); g.rect(0, 0, 16, 2, 'W');
  MAPS.kitchen = {
    name: 'Kitchen', real: true, bgm: 'bedroom', wallColor: '#7a7068', tiles: { k: 'kitchen' }, solid: 'W', rows: g.rows(),
    entities: [
      P('fridge', 3, 1.6, { h: 2.5 }), P('stove', 6, 1.7, { h: 1.6 }), P('coatrack', 13.5, 1.8, { h: 2.6, cw: 0.4 }), P('plant', 1.6, 8.5, { h: 1.5 }),
      P('table', 8, 6.2, { h: 2.2, cw: 0.9, ch: 0.7 }), P('rockingchair', 12.5, 7.2, { h: 1.7 }),
      P('door', 12, 1.9, { h: 1.9, solid: false }), P('door', 8, 10.4, { h: 1.9, solid: false }),
      door(12, 2, 'bedroom', 7, 9, 'up'), door(8, 10, 'porch', 8, 3, 'down', { cond: () => Game.flag('interlude1_done'), locked: async s => { await s.narrate("It's dark out. Nothing out there tonight.") } }),
      npc('pop', 'pop', 12.5, 7.8, async s => popTalk(s), { cond: () => !Game.flag('interlude2_done'), solid: true }),
      npc('pop_night', 'pop', 4.2, 3.4, async s => popTalk(s), { cond: () => Game.flag('ch3_done') && !Game.flag('interlude3_done'), solid: true, dir: 'up' }),
      npc('pop_late', 'pop', 9.6, 4.6, async s => popTalk(s), { cond: () => Game.flag('interlude3_done'), solid: true }),
      npc('mom', 'mom', 6, 3.2, async s => momTalk(s), { wander: false, cond: () => !Game.flag('ch3_done') || Game.flag('interlude3_done') }),
      P('books', 9.2, 6.3, { h: 0.5, solid: false, script: async s => { await s.narrate("Pop's sketchbooks. Six of them. The newest one is mostly empty."); } }),
    ],
    onEnter: async s => {
      if (Game.flag('ch1_done') && !Game.flag('interlude1_done')) await interlude1(s);
      else if (Game.flag('ch3_done') && !Game.flag('interlude3_done')) await interlude3(s);
    }
  };
  async function popTalk(s) {
    if (Game.flag('ch3_done')) { await s.say('Pop', "Is it morning? I made cocoa. I think I made cocoa.", { sprite: 'pop_front' }); return; }
    const lines = ["Robin! Come sit. I'm drawing... I was drawing something.", "Do you know where I put my glasses? ...They're on my head. Of course they are.", "There was a hedgehog. Grumpy fellow. Wouldn't share his... what was it he wouldn't share?"];
    await s.say('Pop', lines[(Game.flags.popTalk = (Game.flags.popTalk || 0) + 1) % lines.length], { sprite: 'pop_front' });
    if (Game.flags.popTalk === 3) await s.say('Wren', '(Robin is Mom. I look like Mom did, in the old photos.)', { face: 'wren_blue' });
  }
  async function momTalk(s) {
    if (Game.flag('interlude3_done')) return s.say('Mom', "It's nearly light, Wren. Go to bed. ...And thank you. For sitting with him.", { sprite: 'mom_front' });
    if (!Game.flag('interlude1_done')) return s.say('Mom', "Sit with him a minute, Wren. That's all. A minute.", { sprite: 'mom_front' });
    if (!Game.flag('ch2_done')) return s.say('Mom', "He had a good morning. He called me Robin and then he called me Mom. Both are fine, honestly.", { sprite: 'mom_front' });
    return s.say('Mom', "There's cocoa in the pot. He made it. It's... a lot of milk. Drink it anyway.", { sprite: 'mom_front' });
  }
  async function interlude1(s) {
    await s.narrate('Pop is in the rocking chair with a pencil. The page in his lap is blank.');
    await s.say('Mom', "There you are. He's been asking for you.", { sprite: 'mom_front' });
    await s.say('Pop', "Robin! Come here, come here. I want to show you something.", { sprite: 'pop_front' });
    await s.say('Wren', "...It's Wren, Pop.", { face: 'wren_blue' });
    await s.say('Pop', "Wren. Yes. Wren. Come look. I'm drawing the... it's a...", { sprite: 'pop_front' });
    await s.narrate('He looks at the blank page. He looks at it for a long time.');
    const r = await s.choice(['Sit with him', 'Go back upstairs']);
    if (r === 0) {
      await s.narrate('Wren sits on the floor next to the chair. Pop puts his hand on Wren\'s head, like when Wren was small.');
      await s.say('Pop', "There's a hedgehog. I can see him, I just can't... the pencil won't go.", { sprite: 'pop_front' });
      await s.say('Wren', "Bramble. His name is Bramble. He has a shield with thorns on it.", { face: 'wren_neutral' });
      await s.say('Pop', "Bramble! Ha. Grumpy little... yes. That's him.", { sprite: 'pop_front' });
      await s.narrate('Pop draws a wobbly circle. Wren draws the thorns.');
      await s.page('Pop\'s wobbly circle with Wren\'s thorns on it.');
      Game.set('sat_with_pop1');
    } else {
      await s.say('Wren', "I have homework.", { face: 'wren_blue' });
      await s.narrate('Mom doesn\'t say anything. Pop has already forgotten Wren was there. The stairs creak.');
    }
    Game.set('interlude1_done');
    await s.narrate('(Later. Bed. The sketchbook is glowing again. The porch door is open in the day now, too.)');
  }
  async function interlude3(s) {
    Audio.bgm(null);
    await s.narrate('Pop is standing in the dark kitchen in his pyjamas. The fridge is open. He is holding a pencil.');
    await s.say('Pop', "...Hello? Is this... I was looking for the... hello?", { sprite: 'pop_front' });
    await s.say('Wren', "Pop. It's me. It's Wren.", { face: 'wren_blue' });
    await s.say('Pop', "Wren. Wren. I don't know this house.", { sprite: 'pop_front' });
    await s.narrate('He is not crying. He is just standing there like a kid at the wrong bus stop.');
    const r = await s.choice(['Sit with him and draw', 'Wake Mom', 'Go back to bed']);
    if (r === 0) {
      await s.narrate('Wren closes the fridge. Turns on the small lamp. Puts a page on the table and a crayon in Pop\'s hand.');
      await s.say('Wren', "You don't have to know the house. Just draw the moth. She wears glasses. She's scared of wasps.", { face: 'wren_neutral' });
      await s.narrate('Pop draws two circles for glasses. Then wings. Then he draws a tiny lantern without being asked.');
      await s.say('Pop', "She reads too much. That's her problem.", { sprite: 'pop_front' });
      await s.narrate('They sit there until it gets light.');
      await s.page('A moth with a lantern, drawn at 4 a.m.'); Game.set('sat_with_pop3');
    } else if (r === 1) {
      await s.narrate('Mom comes down. She is very tired. She walks Pop back to his room and says "it\'s okay" eleven times.');
      await s.say('Mom', "Thank you for getting me. Go to sleep, Wren.", { sprite: 'mom_front' });
    } else {
      await s.narrate('Wren goes back to bed. Wren does not sleep. Downstairs the fridge door beeps for a long time.');
    }
    Game.set('interlude3_done');
    await s.narrate('(The sketchbook upstairs is glowing white now, not colours.)');
  }
}
// =====================================================================
// REAL WORLD — PORCH
// =====================================================================
{
  const g = grid(16, 9, 'p'); g.border('W'); g.rect(0, 0, 16, 2, 'W'); g.rect(1, 6, 14, 2, 'g');
  MAPS.porch = {
    name: 'Porch', real: true, bgm: 'bedroom', wallColor: '#8a7f78', tiles: { p: 'porch', g: 'grass' }, solid: 'W', rows: g.rows(),
    entities: [
      P('door', 8, 1.9, { h: 1.9, solid: false }),
      door(8, 2, 'kitchen', 8, 9, 'up'), P('rockingchair', 3, 3.2, { h: 1.7 }), P('plant', 13.5, 2.6, { h: 1.5 }), P('fence', 4, 8.2, { h: 1.2, cw: 1 }), P('fence', 11, 8.2, { h: 1.2, cw: 1 }),
      npc('pop', 'pop', 3, 3.3, async s => { await s.say('Pop', "Nice out. Is it Tuesday? Your mother says it's Tuesday.", { sprite: 'pop_front' }); }, { cond: () => Game.flag('interlude2_done') && !Game.flag('ch3_done'), solid: true }),
      npc('dara', 'dara', 11, 5, async s => {
        if (!Game.flag('dara_talked')) { Game.set('dara_talked'); await s.say('Dara', "Hey. Your mom said you've been sick. You don't look sick.", { sprite: 'dara_front' }); await s.say('Wren', "I'm not sick.", { face: 'wren_neutral' }); await s.say('Dara', "Okay. My grandma got like that too. The forgetting. She still liked it when I painted her nails, though. Even when she called me Susan.", { sprite: 'dara_front' }); await s.say('Dara', "Anyway. Skating Saturday. Come or don't.", { sprite: 'dara_front' }); await s.charm('luckycoin'); }
        else await s.say('Dara', "Saturday. Skating. I'm not asking again. (I am, though.)", { sprite: 'dara_front' });
      }, { cond: () => Game.flag('interlude2_done') && !Game.flag('ch3_done') }),
      npc('mom', 'mom', 7, 4.5, async s => { await s.say('Mom', "Go on in. Or stay out. Sun's nice.", { sprite: 'mom_front' }); }, { cond: () => Game.flag('interlude2_done') && !Game.flag('ch3_done') }),
    ],
    onEnter: async s => {
      if (Game.flag('ch2_done') && !Game.flag('interlude2_done')) {
        await s.card('scene_porch', ['Pop is asleep in the rocking chair. Mom is sitting on the steps with a box.'], { grey: true });
        await s.say('Mom', "Hey. Come sit. I need to tell you something and I need you to not run upstairs.", { sprite: 'mom_front' });
        await s.narrate('Wren sits.');
        await s.say('Mom', "The doctor has a name for what's happening to Pop. It's not going to get better. It's going to get slower and then it isn't.", { sprite: 'mom_front' });
        await s.say('Mom', "He's still him. He's just... losing the pages. Some days more than others.", { sprite: 'mom_front' });
        await s.say('Wren', "...", { face: 'wren_blue' });
        await s.say('Mom', "I found this box in the attic. It's every drawing he ever did for you. Do you want to look? You don't have to.", { sprite: 'mom_front' });
        const r = await s.choice(['Look at the drawings', "Not right now"]);
        if (r === 0) {
          await s.card('memory_table', ['The first one is dated the week Wren was born. A hedgehog, badly.', 'Then a hedgehog, better. Then a hedgehog with a shield, with "WREN SAYS HE NEEDS A SHIELD" written underneath.', 'Then a paper pilot. A moth with glasses. A lighthouse. A fox with a key.', 'Ten years of Tuesdays.']);
          await s.say('Mom', "He wrote your name on all of them. Look. Even the ones from before you could read.", { sprite: 'mom_front' });
          await s.page('"WREN SAYS HE NEEDS A SHIELD."'); Game.set('saw_box');
        } else { await s.say('Mom', "Okay. It'll be in the hall closet. Whenever.", { sprite: 'mom_front' }); }
        await s.narrate('Pop snores. A kid with roller skates is coming up the path.');
        Game.set('interlude2_done'); s.map.entities.forEach(e => { if (e.id === 'dara' || e.id === 'mom' || e.id === 'pop') e.hidden = false; });
        // spawn the conditional npcs now
        const m = s.map; for (const d of MAPS.porch.entities) if (d.type === 'npc' && !m.entities.find(e => e.id === d.id)) m.entities.push(new Entity(d, m));
      }
    }
  };
}
// =====================================================================
// MARGINS — SCRIBBLE MEADOW
// =====================================================================
{
  const g = grid(40, 26, '.'); g.border('~'); g.rect(0, 0, 40, 2, '~'); g.rect(30, 20, 10, 6, '~'); g.rect(0, 20, 6, 6, '~');
  g.path(3, 13, 20, 13, '#').path(20, 13, 20, 4, '#').path(20, 13, 36, 13, '#').path(10, 13, 10, 20, '#').path(28, 13, 28, 18, '#'); g.scatter(',', 90, 5);
  MAPS.meadow = {
    name: 'Scribble Meadow', bgm: 'meadow', battleBg: 'bg_meadow', tiles: { '.': 'grass', ',': 'grass2', '#': 'path', '~': 'water' }, solid: '~', rows: g.rows(),
    entities: [
      ...trees([[6, 6], [9, 4], [14, 7], [25, 6], [30, 5], [34, 8], [13, 22], [17, 23], [24, 22], [7, 17], [33, 17], [36, 18], [3, 9], [37, 4]]),
      P('boulder', 16, 11, { h: 1.2 }), P('boulder', 24, 16, { h: 1.2 }), P('flowerbush', 12, 10, { h: 1 }), P('flowerbush', 22, 9, { h: 1 }), P('flowerbush', 30, 11, { h: 1 }), P('mushroom', 8, 15, { h: 0.9 }), P('mushroom', 26, 20, { h: 0.9 }),
      P('fence', 14, 18, { h: 1.1, cw: 1 }), P('fence', 17, 18, { h: 1.1, cw: 1 }), P('birdhouse', 27, 8, { h: 1.8, cw: 0.3 }),
      P('tent', 5, 15, { h: 1.6, cw: 0.9, script: async s => { await s.narrate("Wren's tent. Pop drew it the week Wren was scared of the dark. Inside it smells like the inside of a sketchbook, which is the safest smell there is."); } }),
      P('picnic', 10, 21, { h: 1, solid: false }), { type: 'save', x: 9, y: 22 },
      P('stall', 22, 18, { h: 2, cw: 0.9 }), npc('dot', 'dot', 22, 19.6, async s => { await s.say('Dot', Game.flag('dot_met') ? "Back again? Wallet out, kiddo." : "Wren! Well, look at you. Grew a whole inch since Pop drew you last. I'm Dot. I sell things. Mostly cookies.", { sprite: 'dot_front' }); Game.set('dot_met'); await s.shop(['cookie', 'juice', 'sandwich', 'bandage', 'crayon', 'eraser']); Audio.bgm('meadow'); }),
      P('bookshelf', 33, 14.2, { h: 2.4, cw: 0.9 }), P('books', 34.6, 14.5, { h: 0.6, solid: false }),
      npc('shell', 'shell', 33, 15.8, async s => shellTalk(s), { wander: false }),
      npc('nimbus', 'nimbus', 15, 5, async s => nimbusTalk(s), { wander: true }),
      P('hidingball', 36, 9, { h: 0.9, script: async s => { if (Game.flag('got_puff')) return s.narrate('A crumpled ball of paper. It has stopped giggling.'); await s.narrate('A crumpled ball of paper. It is... giggling? Wren pokes it.'); Game.set('got_puff'); await s.give('puff'); await s.narrate('Something soft and white was hiding inside. It looks like a bit of cloud.'); } }),
      chest('c1', 13, 4, { item: 'cookie', n: 2 }), chest('c2', 35, 5, { charm: 'tincup' }), chest('c3', 5, 18, { item: 'juice', n: 2 }), chest('c4', 26, 22, { stickers: 30 }),
      sign(4, 12, '← Wren\'s tent · Meadow → · Dot\'s stall ↓ · THE LIBRARY (Sir Shell) → · North: DON\'T (signed, Bramble)'),
      sign(21, 5, 'NORTH: THE SCRIBBLE. It ate the sign that said what was past it.'),
      sign(35, 12, 'EAST: Crumple Woods. Bring a friend. Bring two.'),
      enemy('e1', 'scribblebunny', 14, 15, 'meadow_a'), enemy('e2', 'scribblebunny', 25, 10, 'meadow_b'), enemy('e3', 'dandelion', 30, 8, 'meadow_c', { speed: 60 }), enemy('e4', 'crayonsnail', 18, 21, 'meadow_d', { speed: 50 }),
      enemy('e5', 'dandelion', 8, 8, 'meadow_e', { speed: 60 }), enemy('e6', 'scribblebunny', 31, 16, 'meadow_b'), enemy('e7', 'crayonsnail', 27, 4, 'meadow_e', { speed: 50 }),
      enemy('boss', 'boss_scribble', 20, 3.2, 'boss_scribble', { boss: true, bgm: 'boss', h: 2.6, cw: 1.6, sight: 60, speed: 0, flag: 'scribble_beaten', cond: () => !Game.flag('scribble_beaten') }),
      trig('bramble_intro', 5, 12, 3, 3, async s => brambleIntro(s), { once: 'bramble_joined' }),
      trig('boss_warn', 18, 5, 5, 2, async s => { await s.say('Bramble', "That's it. That's the thing that's been eating the meadow. It's every line Pop ever scratched out, all knotted together.", { face: 'bramble_brave' }); await s.say('Bramble', "It doesn't know it's a mistake. Nobody told it. Ready?", { face: 'bramble_neutral' }); }, { once: 'boss_warned', cond: () => !Game.flag('scribble_beaten') }),
      trig('after_boss', 19, 1, 4, 2, async s => afterScribble(s), { once: 'after_scribble', cond: () => Game.flag('scribble_beaten') }),
      door(39, 12, 'woods', 1, 12, 'right', { h: 2, cond: () => Game.flag('scribble_beaten') && Game.flag('interlude1_done'), locked: async s => { if (!Game.flag('scribble_beaten')) await s.say('Bramble', "The woods are that way. Not with the Scribble loose behind us. Let's deal with the north first.", { face: 'bramble_neutral' }); else await s.say('Bramble', "Something's pulling you back. You're waking up, kid.", { face: 'bramble_neutral' }); } }),
    ],
    onEnter: async s => { if (Game.flag('ch1_done') && !Game.flag('meadow_return')) { Game.set('meadow_return'); await s.say('Bramble', "You came back. Some of them don't. The woods are east.", { face: 'bramble_neutral' }); } }
  };
  async function brambleIntro(s) {
    await s.narrate('Wren is standing in grass. Crayon grass, waxy and warm. Something is stomping through it.');
    const m = s.map; m.entities.push(new Entity({ type: 'npc', id: 'bramble_npc', sprite: 'bramble', x: 9, y: 13, dir: 'left' }, m));
    await s.move('bramble_npc', 7, 13, 110);
    await s.say('Bramble', "You. You're late. The Scribble has eaten the whole north end and the sheep won't stop crying and I have been holding this meadow BY MYSELF.", { face: 'bramble_brave' });
    await s.say('Wren', "...Bramble?", { face: 'wren_neutral' });
    await s.say('Bramble', "Of course Bramble. Who else would it be. Hedgehog. Shield. Grumpy. You drew the thorns yourself, you were six, you did a terrible job.", { face: 'bramble_neutral' });
    await s.say('Bramble', "Where's Pop? He hasn't drawn anything new in weeks. The pages are going white, kid. White from the edges in.", { face: 'bramble_blue' });
    await s.say('Wren', "He... he's forgetting. Things. Names. He forgot yours.", { face: 'wren_blue' });
    await s.narrate('Bramble is quiet for a moment. His spines go down a bit.');
    await s.say('Bramble', "Then we'd better not forget it for him. Come on. You've got a crayon. Hit things with it.", { face: 'bramble_brave' });
    s.remove('bramble_npc'); await s.join('bramble');
    await s.narrate('(Walk into the wobbly creatures to fight. In battle: ATTACK, SKILL, TALK, ITEM. BRAVE beats BLUE, BLUE beats GIDDY, GIDDY beats BRAVE. Red bookmarks save.)');
    Game.addItem('juice', 1);
  }
  async function shellTalk(s) {
    if (!Game.flag('shell_met')) { Game.set('shell_met'); await s.say('Sir Shell', "Hm? Ah. The author's grandchild. Welcome to the library. Three shelves. Everything Pop ever told you, filed under 'T' for Tuesday.", { sprite: 'shell_front' }); await s.say('Sir Shell', "You'll notice the gaps. Books going blank, one page at a time, from the last page backwards. The Blank is thorough. Tidy, even.", { sprite: 'shell_front' }); await s.say('Sir Shell', "A story is only gone when nobody is left who can tell it. Remember that. It is the entire point of libraries.", { sprite: 'shell_front' }); return; }
    if (Game.flag('lighthouse_lit')) return s.say('Sir Shell', "Moth read the unread page? Good. Good. Go finish it, then. The last page is always the hardest.", { sprite: 'shell_front' });
    if (Game.flag('scribble_beaten')) return s.say('Sir Shell', "The Woods are east. Fold has the gate key and Fold is a fox, so. Good luck with that.", { sprite: 'shell_front' });
    await s.say('Sir Shell', "Every page you remember with him is a page the Blank cannot have. That's not a metaphor. Well. It's partly a metaphor.", { sprite: 'shell_front' });
  }
  async function nimbusTalk(s) {
    if (Game.flag('nimbus_done')) return s.say('Nimbus', "baaa. (Nimbus is whole again and asleep on its feet.)", { sprite: 'nimbus_front', blip: false });
    if (Game.has('puff')) { Game.addItem('puff', -1); Game.set('nimbus_done'); await s.say('Nimbus', "baa! (Nimbus sniffs the cloud puff, sneezes, and is suddenly slightly rounder.)", { sprite: 'nimbus_front', blip: false }); await s.narrate('Nimbus rubs against Wren\'s leg. Something small and shiny falls out of its wool.'); await s.charm('wings'); return; }
    await s.say('Nimbus', "baaa... (Nimbus looks thinner than a cloud should. A bit of it blew off somewhere east, near the trees.)", { sprite: 'nimbus_front', blip: false });
  }
  async function afterScribble(s) {
    await s.narrate('Where the Scribble was, the grass is white. Not drawn. Just paper.');
    await s.say('Bramble', "That's what it looks like. When a page goes. There's no fixing it from in here.", { face: 'bramble_blue' });
    await s.say('Wren', "...I feel weird. Like I'm being pulled up by the hair.", { face: 'wren_neutral' });
    await s.say('Bramble', "You're waking up. Go on. Go see him. We'll hold the meadow.", { face: 'bramble_neutral' });
    Game.set('ch1_done'); await s.fadeOut(1.5); Audio.stopBgm(); await s.transfer('bedroom', 6, 5, 'down');
  }
}
// =====================================================================
// MARGINS — CRUMPLE WOODS
// =====================================================================
{
  const g = grid(40, 28, 'l'); g.border('X'); g.rect(0, 0, 40, 2, 'X');
  g.path(1, 12, 12, 12, '#').path(12, 12, 12, 22, '#').path(12, 22, 30, 22, '#').path(30, 22, 30, 8, '#').path(30, 8, 37, 8, '#').path(12, 12, 24, 12, '#').path(24, 12, 24, 5, '#');
  MAPS.woods = {
    name: 'Crumple Woods', bgm: 'woods', battleBg: 'bg_woods', bgColor: '#141022', tiles: { l: 'leaves', '#': 'path', X: 'dark' }, solid: 'X', rows: g.rows(),
    entities: [
      ...trees([[4, 8], [7, 6], [10, 9], [16, 8], [19, 5], [21, 9], [27, 5], [33, 5], [36, 12], [35, 16], [33, 20], [27, 17], [20, 17], [16, 19], [8, 16], [5, 20], [7, 24], [17, 25], [23, 26], [36, 25], [3, 4], [14, 3], [29, 3], [38, 3], [4, 15]], 'papertree', 2.8),
      ...trees([[9, 20], [26, 9], [34, 24]], 'deadtree', 2.6),
      P('log', 15, 15, { h: 0.9, cw: 1.1 }), P('stump', 6, 11, { h: 0.9 }), P('stump', 28, 14, { h: 0.9 }), P('lantern', 13, 10.5, { h: 1.8, cw: 0.3 }), P('lantern', 31, 21, { h: 1.8, cw: 0.3 }), P('cranestatue', 24, 4, { h: 1.6 }),
      P('campfire', 20, 23.5, { h: 1.1, cw: 0.7 }), npc('fold', 'fold', 18.5, 23.5, async s => foldTalk(s), { wander: false }),
      P('hidingball', 8, 25, { h: 0.9, script: async s => ballTry(s, 'wrong', 'It giggles and rolls over. Empty. "Colder!"') }), P('hidingball', 36, 19, { h: 0.9, script: async s => ballTry(s, 'wrong', 'A paper ball. Something scuttles out. Not Fold\'s. "Warmer, though!"') }), P('hidingball', 26, 3.5, { h: 0.9, script: async s => ballTry(s, 'right', '') }),
      npc('twins', 'twins', 29, 11, async s => { await s.say('???', "we're twins. / we're twins. / the fox hid his treasure up north. / by the crane. / we didn't tell you. / we didn't tell you.", { sprite: 'twins_front' }); }, { wander: false }),
      { type: 'save', x: 11, y: 23 },
      chest('w1', 5, 5, { item: 'sandwich', n: 1 }), chest('w2', 21, 7, { charm: 'thornring' }), chest('w3', 36, 26, { stickers: 45 }), chest('w4', 27, 19, { item: 'bandage', n: 1 }),
      sign(2, 10, 'CRUMPLE WOODS. Everything here was drawn on the back of something else.'),
      sign(31, 10, '↑ The Crumple Gate. Locked. Ask the fox. Regret asking the fox.'),
      enemy('e1', 'paperwolf', 8, 12, 'woods_a', { speed: 110 }), enemy('e2', 'stickbandit', 17, 12, 'woods_b'), enemy('e3', 'crumpledowl', 22, 20, 'woods_c', { speed: 60 }), enemy('e4', 'paperwolf', 30, 15, 'woods_d', { speed: 110 }),
      enemy('e5', 'stickbandit', 34, 8, 'woods_b'), enemy('e6', 'crumpledowl', 12, 18, 'woods_e', { speed: 60 }), enemy('e7', 'paperwolf', 26, 24, 'woods_a', { speed: 110 }),
      trig('pip_crash', 22, 11, 4, 3, async s => pipCrash(s), { once: 'pip_joined' }),
      door(37, 7, 'gate', 5, 9, 'up', { h: 2, cond: () => Game.has('key_gate'), locked: async s => { await s.narrate('The Crumple Gate. Two paper trees grown into a knot, with a brass keyhole where the knot is. Locked.'); } }),
      door(0, 12, 'meadow', 38, 13, 'left', { h: 2 }),
    ],
  };
  async function pipCrash(s) {
    Audio.sfx('encounter', 0.6); s.shake(10); await s.narrate('Something whistles overhead. Something hits the tree next to Wren. Something falls out of the tree.');
    const m = s.map; m.entities.push(new Entity({ type: 'npc', id: 'pip_npc', sprite: 'pip', x: 24, y: 10, dir: 'down' }, m));
    await s.say('Pip', "I MEANT to do that!! I'm fine! Everything's fine! Who are you? Are you the ground? I love the ground!", { face: 'pip_giddy' });
    await s.say('Bramble', "Pip. The pilot. He can't land. That's the whole story, Pop drew it in one night, it's four pages long.", { face: 'bramble_neutral' });
    await s.say('Pip', "FOUR AND A HALF. And I can land. I just haven't yet. Wren!! WREN. You're taller. You're SO tall. Are we going somewhere? Let's go somewhere.", { face: 'pip_giddy' });
    await s.say('Wren', "We're going to find the Blank and make it stop.", { face: 'wren_brave' });
    await s.say('Pip', "Perfect. Great. Love it. I'll fly ahead and crash into it.", { face: 'pip_giddy' });
    s.remove('pip_npc'); await s.join('pip');
    await s.narrate('(Pip is fast and lucky. His Paper Darts hit three times. Loop-de-loop makes him GIDDY — GIDDY beats BRAVE.)');
  }
  async function foldTalk(s) {
    if (Game.flag('fold_done')) return s.say('Fold', "Gate's open. Smudge is behind it. He's very polite about eating pages. Try not to be impressed.", { sprite: 'fold_front' });
    if (Game.flag('fold_ball')) { Game.set('fold_done'); await s.say('Fold', "You found it. Fine. FINE. A deal's a deal, I'm a fox, not a bandit.", { sprite: 'fold_front' }); await s.give('key_gate'); await s.say('Fold', "And this. It was in the ball. I was keeping it safe. From you. That's the same thing as keeping it, legally.", { sprite: 'fold_front' }); await s.page('A page of the hedgehog story. The corner is chewed.'); return; }
    if (!Game.flag('fold_met')) { Game.set('fold_met'); await s.say('Fold', "Well well. The author's kid. Come to take my key, I suppose. Everyone wants the key.", { sprite: 'fold_front' }); await s.say('Fold', "Here's the game. I hid something precious in a paper ball. Three balls in these woods. Find the right one, bring it, key's yours. Wrong one? Nothing happens. I'm not a monster.", { sprite: 'fold_front' }); await s.say('Pip', "I'll check ALL of them. AT ONCE.", { face: 'pip_giddy' }); return; }
    await s.say('Fold', "Three balls. One's right. The twins might know. The twins never say anything useful. That's why I told them.", { sprite: 'fold_front' });
  }
  async function ballTry(s, kind, text) {
    if (!Game.flag('fold_met')) return s.narrate('A crumpled paper ball. It is definitely watching Wren.');
    if (Game.flag('fold_ball')) return s.narrate('An empty paper ball.');
    if (kind === 'wrong') return s.narrate(text);
    Game.set('fold_ball'); Audio.sfx('item'); await s.narrate('The ball unfolds. Inside: a page from a story, folded very small, and a brass key taped to it. Fold\'s "treasure" is a page about a hedgehog.'); await s.say('Bramble', "...That's my story. He kept my story.", { face: 'bramble_blue' }); await s.say('Wren', "Let's go tell him we found it.", { face: 'wren_neutral' });
  }
}
// gate arena
{
  const g = grid(11, 12, 'l'); g.border('X'); g.rect(3, 2, 5, 8, '#');
  MAPS.gate = {
    name: 'The Crumple Gate', bgm: 'woods', battleBg: 'bg_woods', bgColor: '#141022', tiles: { l: 'leaves', '#': 'path', X: 'dark' }, solid: 'X', rows: g.rows(),
    entities: [ ...trees([[1.5, 4], [9.5, 4], [1.5, 8], [9.5, 8]], 'papertree', 2.8), P('doorframe', 5, 1.9, { h: 2.4, cw: 0.7 }),
      door(5, 11, 'woods', 37, 9, 'down', { w: 1 }),
      npc('smudge', 'boss_smudge', 5, 4, async s => smudgeFight(s), { h: 2.4, cw: 1.1, solid: true, cond: () => !Game.flag('smudge_beaten') }),
      trig('smudge_intro', 3, 7, 5, 1, async s => { await s.say('???', "Ah. Guests. Do come in, mind the drips.", { sprite: 'boss_smudge' }); await s.say('Bramble', "Mister Smudge. He was a thumbprint on page nine. Pop drew a hat on him so he wouldn't feel bad.", { face: 'bramble_neutral' }); await s.say('Mister Smudge', "And I have never forgotten the kindness. Which is why I'm so terribly sorry about all this. The Blank pays in pages, you see. And one does get hungry.", { sprite: 'boss_smudge' }); }, { once: 'smudge_intro', cond: () => !Game.flag('smudge_beaten') }),
    ],
  };
  async function smudgeFight(s) {
    await s.say('Mister Smudge', "Shall we? I'll try to be quick. I'm told I leave marks.", { sprite: 'boss_smudge' });
    Audio.sfx('encounter'); s.flash();
    const r = await s.battle('boss_smudge', { bg: 'bg_woods', bgm: 'boss', boss: true, canRun: false });
    if (r !== 'win') return;
    Game.set('smudge_beaten'); s.remove('smudge');
    await s.say('Mister Smudge', "...Well. That's me smeared. Do go on through. And, child—", { sprite: 'boss_smudge' });
    await s.say('Mister Smudge', "—he drew the hat because you asked him to. You were four. You said the thumbprint looked lonely.", { sprite: 'boss_smudge' });
    await s.narrate('The smudge fades into the paper. Beyond the gate, the woods go on. Wren feels the tug again.');
    await s.say('Pip', "Wait, you're going?? Is it the waking-up thing? Bramble said there's a waking-up thing.", { face: 'pip_blue' });
    await s.say('Wren', "I'll be back. I promise.", { face: 'wren_neutral' });
    Game.set('ch2_done'); await s.fadeOut(1.5); Audio.stopBgm(); await s.transfer('bedroom', 6, 5, 'down');
  }
}
// =====================================================================
// MARGINS — TEASTAIN MARSH
// =====================================================================
{
  const g = grid(40, 28, 'm'); g.border('~'); g.rect(0, 0, 40, 2, '~'); g.rect(22, 2, 18, 26, '~'); g.rect(28, 6, 9, 9, 'm'); g.rect(24, 20, 12, 6, 'm');
  g.scatter('s', 60, 9); g.path(1, 14, 20, 14, '#').path(8, 14, 8, 22, '#').path(14, 14, 14, 6, '#'); g.rect(20, 13, 3, 3, 'd'); g.rect(27, 9, 2, 3, 'd');
  MAPS.marsh = {
    name: 'Teastain Marsh', bgm: 'marsh', battleBg: 'bg_marsh', bgColor: '#2a2418', tiles: { m: 'marsh', s: 'shallows', '#': 'path', '~': 'water', d: 'wood' }, solid: '~', rows: g.rows(),
    entities: [
      ...trees([[4, 5], [10, 4], [17, 9], [5, 10], [18, 19], [11, 25], [4, 24], [17, 24]], 'reeds', 1.8), ...trees([[3, 17], [12, 9], [7, 6], [19, 5]], 'reeds', 1.4),
      P('teabag', 6, 19, { h: 2.2, cw: 0.5 }), P('lilypad', 25, 4, { h: 1, solid: false }), P('lilypad', 36, 18, { h: 1, solid: false }), P('dockpost', 22.5, 12.4, { h: 1.6, cw: 0.4 }), P('dockpost', 27.5, 8.4, { h: 1.6, cw: 0.4 }),
      P('teacup', 22, 15.2, { h: 1.4, cw: 1, ch: 0.6, script: async s => ferry(s, 'east') }), 
      P('lighthouse', 32.5, 10.4, { h: 4, cw: 0.7, ch: 0.5, script: async s => lighthouse(s) }),
      npc('steep', 'steep', 21, 12.5, async s => { await s.say('Steep', "Ferry? Ferry. Teacup holds four. Doesn't hold the wasps. Wasps come anyway. Hop in when you like.", { sprite: 'steep_front' }); }),
      npc('beacon', 'beacon', 34, 13, async s => beaconTalk(s), { wander: false }),
      npc('moth_npc', 'moth', 6, 23.6, async s => mothTalk(s), { cond: () => !Game.flag('moth_joined') }),
      { type: 'save', x: 3, y: 13 }, { type: 'save', x: 30, y: 8 },
      P('stall', 6, 10, { h: 2, cw: 0.9 }), npc('dot2', 'dot', 6, 11.6, async s => { await s.say('Dot', Game.flag('dot2_met') ? "Marsh branch. Same prices, damper cookies." : "Wren! Dot's Marsh Branch. Don't ask how I got the stall through the reeds. Tea's new. Bandages are essential.", { sprite: 'dot_front' }); Game.set('dot2_met'); await s.shop(['cookie', 'sandwich', 'juice', 'tea', 'bandage', 'crayon', 'eraser']); Audio.bgm('marsh'); }),
      chest('m1', 16, 4, { item: 'tea', n: 2 }), chest('m2', 4, 8, { charm: 'scarf' }), chest('m3', 35, 7, { charm: 'inkwell' }), chest('m4', 26, 24, { item: 'star', n: 1 }),
      sign(2, 12, 'TEASTAIN MARSH. Mind the teabag. Mind the wasps. Mind yourself, mostly.'),
      sign(19, 12, 'FERRY (a teacup). Lighthouse island → . The keeper is a bird in a raincoat, you can\'t miss him.'),
      enemy('e1', 'teajelly', 10, 10, 'marsh_a', { speed: 60 }), enemy('e2', 'pageghost', 16, 17, 'marsh_b', { speed: 100 }), enemy('e3', 'marshwasp', 5, 15, 'marsh_c', { speed: 130 }), enemy('e4', 'teajelly', 13, 22, 'marsh_d', { speed: 60 }),
      enemy('e5', 'marshwasp', 18, 7, 'marsh_e', { speed: 130 }), enemy('e6', 'pageghost', 30, 22, 'marsh_b', { speed: 100 }), enemy('e7', 'marshwasp', 34, 6, 'marsh_c', { speed: 130 }),
      trig('marsh_intro', 1, 13, 2, 3, async s => { await s.say('Bramble', "Teastain Marsh. Pop spilled his tea on page thirty and drew around it. Everything here is a bit soggy and a bit brave.", { face: 'bramble_neutral' }); await s.say('Pip', "It smells like a MUG. I love it. I'm going to crash into the lighthouse.", { face: 'pip_giddy' }); await s.say('Wren', "There's supposed to be a moth here. She had a lantern. She was scared of everything.", { face: 'wren_neutral' }); }, { once: 'marsh_intro' }),
      door(0, 14, 'meadow', 38, 13, 'left', { h: 2, cond: () => false, locked: async s => { await s.say('Bramble', "We came in through a page, not a path. There's no walking back from here. Dot set up a stall by the bookmark if you need anything.", { face: 'bramble_neutral' }); } }),
    ],
  };
  async function ferry(s, side) {
    const p = s.map.player; const onIsland = p.x > 24 * TILE;
    await s.narrate('A teacup with a frog in it. Get in?'); const r = await s.choice(['Get in', 'Not now'], { cancelIdx: 1 }); if (r) return;
    Audio.sfx('door', 0.5); await s.fadeOut(2); s.place('player', onIsland ? 21 : 28, onIsland ? 14 : 11); s.map.player.dir = onIsland ? 'left' : 'right'; s.map.player.trail = []; await s.fadeIn(2);
    if (!onIsland) { const tc = s.map.entities.find(e => e.sprite === 'teacup'); if (tc) { tc.x = 28.5 * TILE; tc.y = 12 * TILE; } }
    else { const tc = s.map.entities.find(e => e.sprite === 'teacup'); if (tc) { tc.x = 22.5 * TILE; tc.y = 16.2 * TILE; } }
  }
  async function mothTalk(s) {
    await s.say('Moth', "Eep. Um. Hello. Please don't be a wasp. You're not a wasp. Okay. Okay.", { face: 'moth_blue' });
    await s.say('Moth', "I'm Moth. I keep the lighthouse. I mean, I did. Beacon's there now. I'm... here. In the reeds. Because of the wasps. Because of— um.", { face: 'moth_blue' });
    await s.say('Wren', "Pop drew you reading the wrong book and liking it anyway. You weren't scared of anything in that story.", { face: 'wren_neutral' });
    await s.say('Moth', "That was before he stopped drawing. When nobody's drawing you, you get... thinner. You start believing the wasps.", { face: 'moth_blue' });
    await s.say('Bramble', "Kid. Tell her.", { face: 'bramble_neutral' });
    await s.say('Wren', "I'm here. I'm drawing you now. Come light the lighthouse with us.", { face: 'wren_brave' });
    await s.say('Moth', "...Okay. Okay! Yes. I have a lantern. It never goes out. It's the one thing I'm not scared of.", { face: 'moth_giddy' });
    Game.set('moth_joined'); s.remove('moth_npc'); await s.join('moth'); Game.addItem('lantern', 1);
    await s.narrate('(Moth heals with Mend and calms enemies with Lullaby — BLUE enemies are slow. Her Doodle, BEDTIME STORY, fully heals everyone.)');
  }
  async function beaconTalk(s) {
    if (Game.flag('lighthouse_lit')) return s.say('Beacon', "Light's on. Page is read. Go home, kid. Rest. The last chapter's the white one.", { sprite: 'beacon_front' });
    await s.say('Beacon', "Keeper's out. I'm the substitute. I don't have a light. The light was hers. The lighthouse has been dark since she went into the reeds.", { sprite: 'beacon_front' });
    if (!Game.flag('moth_joined')) await s.say('Beacon', "She's west, in the reeds by the big teabag. Scared stiff. Tell her the unread page is still up there. Nobody else can read it.", { sprite: 'beacon_front' });
    else await s.say('Beacon', "Moth! Good. Go up. Light it. The wasps won't like it, but that's wasps for you.", { sprite: 'beacon_front' });
  }
  async function lighthouse(s) {
    if (Game.flag('lighthouse_lit')) return s.narrate('The lighthouse is lit. The beam sweeps the marsh in slow crayon circles.');
    if (!Game.flag('moth_joined')) return s.narrate('The lighthouse is dark. There is a book on the top step, closed.');
    await s.say('Moth', "Okay. Up we go. Don't look down. Don't look up either. Just... middle.", { face: 'moth_blue' });
    await s.fadeOut(1.5); await s.narrate('At the top: a lamp with no flame, and a page on a lectern that has never been read. Moth hangs her lantern in the lamp.'); Audio.sfx('save'); s.flash('#fff8d0'); await s.fadeIn(1.5);
    await s.say('Moth', "The unread page. It's... it's the last one Pop drew. Before. It says—", { face: 'moth_neutral' });
    await s.say('Moth', "\"Wren. If you are reading this, I have forgotten how to write to you. So I drew a moth to read it for me. She is braver than she thinks. So are you.\"", { face: 'moth_blue' });
    await s.narrate('Nobody says anything. The lighthouse hums.');
    await s.page('The unread page, read aloud by a moth.'); Game.set('lighthouse_lit');
    await s.say('???', "BZZZZZZZZ.", { sprite: 'boss_waspqueen' });
    await s.say('Bramble', "And there's the wasps.", { face: 'bramble_brave' });
    await s.say('THE WASP QUEEN', "THE LIGHT. TURN IT OFF. THE BLANK PROMISED US A TIDY HIVE AND YOUR LIGHT IS VERY UNTIDY.", { sprite: 'boss_waspqueen' });
    Audio.sfx('encounter'); s.flash();
    const r = await s.battle('boss_waspqueen', { bg: 'bg_marsh', bgm: 'boss', boss: true, canRun: false }); if (r !== 'win') return;
    await s.say('THE WASP QUEEN', "...fine. FINE. Keep your light. It's ugly. It's the ugliest thing I've ever seen and I will never stop looking at it.", { sprite: 'boss_waspqueen' });
    await s.narrate('The swarm scatters into the reeds. The beam sweeps on.');
    await s.say('Moth', "I— we did that. I did some of that.", { face: 'moth_giddy' });
    await s.say('Wren', "...I'm waking up. Something's wrong at home. I can feel it.", { face: 'wren_blue' });
    Game.set('ch3_done'); await s.fadeOut(1.5); Audio.stopBgm(); await s.transfer('bedroom', 6, 5, 'down');
  }
}
// =====================================================================
// MARGINS — THE BLANK
// =====================================================================
{
  const g = grid(36, 24, 'p'); g.border('W'); g.rect(0, 0, 36, 2, 'W'); g.rect(10, 6, 6, 5, 'q'); g.rect(22, 14, 8, 5, 'q'); g.rect(4, 16, 5, 4, 'q');
  MAPS.blank = {
    name: 'The Blank', bgm: 'blank', battleBg: 'bg_blank', bgColor: '#f4f4f2', wallColor: '#e2e2e0', vignette: false, tiles: { p: 'paper', q: 'grass' }, solid: 'W', rows: g.rows(),
    entities: [
      ...trees([[6, 5], [14, 4], [20, 8], [28, 5], [32, 10], [8, 13], [16, 15], [30, 21], [12, 21], [24, 22], [33, 16]], 'ghosttree', 2.4),
      P('pencilstub', 12, 9, { h: 2 }), P('eraserblock', 26, 16, { h: 1.3, cw: 1.1 }), P('ghostchair', 6, 18, { h: 1.6 }), P('paperball', 18, 19, { h: 0.9 }), P('paperball', 22, 6, { h: 0.9 }),
      P('tree', 13, 8, { h: 2.2, cw: 0.5 }), P('flowerbush', 24, 15.5, { h: 1, solid: false }),
      { type: 'save', x: 3, y: 12 },
      P('stall', 7, 9, { h: 2, cw: 0.9 }), npc('dot3', 'dot', 7, 10.6, async s => { await s.say('Dot', Game.flag('dot3_met') ? "Still here. Still selling. It's how I stay drawn." : "Even here. Even HERE, Wren. Somebody has to keep the lights on. Wallet out.", { sprite: 'dot_front' }); Game.set('dot3_met'); await s.shop(['cookie', 'sandwich', 'juice', 'tea', 'bandage', 'star', 'eraser']); Audio.bgm('blank'); }),
      chest('b1', 14, 22, { item: 'star', n: 1 }), chest('b2', 33, 4, { charm: 'glasses' }), chest('b3', 5, 5, { item: 'tea', n: 2 }),
      sign(4, 11, '(the sign is blank)'), sign(20, 12, '(someone has written on the blank sign, in pencil: "it\'s easier to let it go")'),
      npc('grey1', 'greywren', 12, 12, async s => greyTalk(s, 1), { wander: false, cond: () => !Game.flag('grey1') }),
      npc('grey2', 'greywren', 26, 12, async s => greyTalk(s, 2), { wander: false, cond: () => Game.flag('grey1') && !Game.flag('grey2') }),
      npc('grey3', 'greywren', 33, 20, async s => greyTalk(s, 3), { wander: false, cond: () => Game.flag('grey2') && !Game.flag('grey3') }),
      enemy('e1', 'shaving', 9, 8, 'blank_a', { speed: 90 }), enemy('e2', 'doubt', 18, 10, 'blank_b', { speed: 80 }), enemy('e3', 'halfsketch', 28, 8, 'blank_c', { speed: 70 }), enemy('e4', 'shaving', 16, 20, 'blank_d', { speed: 90 }), enemy('e5', 'doubt', 30, 18, 'blank_e', { speed: 80 }), enemy('e6', 'halfsketch', 8, 21, 'blank_c', { speed: 70 }),
      P('doorframe', 33.5, 13, { h: 2.6, cw: 0.7, script: async s => finalDoor(s) }),
      trig('blank_intro', 1, 11, 2, 3, async s => { await s.narrate('There is no colour here. The ground is paper. The trees are outlines, and the outlines are going.'); await s.say('Bramble', "This is where the stories end up. Before they end.", { face: 'bramble_blue' }); await s.say('Pip', "I don't like it. I don't like a place with nothing to crash into.", { face: 'pip_blue' }); await s.say('Moth', "It's quiet. It's the quietest thing I've ever heard.", { face: 'moth_blue' }); await s.say('Wren', "There's a door. Over there. Let's go.", { face: 'wren_brave' }); }, { once: 'blank_intro' }),
    ],
  };
  async function greyTalk(s, n) {
    Game.set('grey' + n);
    if (n === 1) { await s.say('Grey Wren', "Hi. You look like me. I'm what he remembers of you, these days. Lines. No colour. It's not so bad.", { sprite: 'greywren_front' }); await s.say('Wren', "...", { face: 'wren_blue' }); await s.say('Grey Wren', "You stopped going downstairs. Three weeks. I counted. I'm the version of you that's easier to keep.", { sprite: 'greywren_front' }); }
    if (n === 2) { await s.say('Grey Wren', "The Blank isn't cruel. It's just tidy. It takes the page and the hurt goes with it. You could let it. Lots of people do.", { sprite: 'greywren_front' }); await s.say('Bramble', "Don't listen to the pencil, kid.", { face: 'bramble_brave' }); await s.say('Grey Wren', "The hedgehog would say that. He's got a shield. You drew it for him. Who drew yours?", { sprite: 'greywren_front' }); }
    if (n === 3) { await s.say('Grey Wren', `You've kept ${Game.pages} page${Game.pages === 1 ? '' : 's'}. ${Game.pages >= 4 ? "That's a lot. That's enough to remember him with, even after." : "That's not many. It's hard to remember someone with so few pages."}`, { sprite: 'greywren_front' }); await s.say('Grey Wren', "The door's right there. It asks a question. Answer it honestly. That's all I've got. I'm just lines.", { sprite: 'greywren_front' }); }
  }
  async function finalDoor(s) {
    if (Game.flag('blank_beaten')) return;
    await s.narrate('A door with no wall. Through it, white. More white than there is.');
    const r = await s.ask(null, 'Go through?', ['Go through', 'Not yet'], { blip: false, cancelIdx: 1 }); if (r) return;
    await s.fadeOut(1.5); Audio.stopBgm(); await s.title('The last page', ''); await s.fadeIn(1);
    await s.say('THE BLANK', "Hello, Wren.", { sprite: 'boss_blank' });
    await s.say('THE BLANK', "I am not the thing that is happening to him. I am just where it goes. I am very gentle. Ask anyone.", { sprite: 'boss_blank' });
    await s.say('Wren', "You're eating his stories.", { face: 'wren_brave' });
    await s.say('THE BLANK', "I am taking the weight. That is all a blank page is. Somewhere to put a thing down.", { sprite: 'boss_blank' });
    await s.say('Bramble', "Kid. Crayon. Now.", { face: 'bramble_brave' });
    Audio.sfx('encounter'); s.flash();
    const result = await s.battle('boss_blank', { bg: 'bg_blank', bgm: 'final', boss: true, canRun: false, canLose: true, onHalf: async b => {
      b.msgs = []; await sleep(0.3);
      await s.say('THE BLANK', "You are tired. You have been tired for three weeks. I can take that too.", { sprite: 'boss_blank' });
      await s.say('THE BLANK', "Let me have the pages. The hedgehog, the pilot, the moth. The kitchen. The cocoa. You will wake up and it will not hurt, because there will be nothing there to hurt.", { sprite: 'boss_blank' });
      const c = await s.ask('THE BLANK', "It is easier. Let go?", ['Let go.', 'No.'], { sprite: 'boss_blank' });
      if (c === 0) { await s.say('Wren', "...okay.", { face: 'wren_blue' }); Audio.sfx('erase'); return 'erase'; }
      await s.say('Wren', "No. It's supposed to hurt. That's how I know it was real.", { face: 'wren_brave' });
      await s.say('Pip', "WREN SAID NO. Did everyone hear that? I'm gonna crash into it SO hard.", { face: 'pip_giddy' });
      await s.say('Moth', "The unread page said we were brave. We should probably act like it.", { face: 'moth_neutral' });
      for (const p of b.party) if (!b.isDead(p)) { p.m.hp = Math.max(p.m.hp, Math.round(memberStats(p.m).hp * 0.6)); p.m.mood = 'brave'; }
      Audio.sfx('mood_brave'); b.msgs = ['Everyone got BRAVE!']; await sleep(1);
      return null;
    } });
    if (result === 'erase') { await s.fadeOut(0.5); return s.ending('erase'); }
    if (result === 'lose') { await s.narrate('Everyone faded. The page went white... but the book is still open.'); return s.gameOver(); }
    Game.set('blank_beaten');
    await s.narrate('The Blank does not scream. It just gets smaller, and smaller, and then it is a normal blank page, which is all it ever was.');
    await s.say('Bramble', "That's it? That's it. Huh.", { face: 'bramble_neutral' });
    await s.say('Moth', "It's still there. The blank. It's always going to be there.", { face: 'moth_blue' });
    await s.say('Wren', "Yeah. But it's a page. You can draw on a page.", { face: 'wren_neutral' });
    const m = s.map; m.entities.push(new Entity({ type: 'npc', id: 'grey_final', sprite: 'greywren', x: 31, y: 13, dir: 'right' }, m));
    await s.say('Grey Wren', "One question. Then you wake up.", { sprite: 'greywren_front' });
    if (Game.pages >= 4) {
      const c = await s.ask('Grey Wren', "He is going to forget all of it. Bramble. Pip. Moth. You. Will you keep drawing with him anyway?", ['Yes.', "I don't know."], { sprite: 'greywren_front' });
      if (c === 0) { await s.say('Wren', "Yes.", { face: 'wren_brave' }); await s.say('Bramble', "Told you. Grumpy little... yeah.", { face: 'bramble_giddy' }); await s.fadeOut(1.5); return s.ending('keep'); }
      await s.say('Wren', "I don't know. I want to. I don't know.", { face: 'wren_blue' }); await s.say('Grey Wren', "That's honest. That's a page too.", { sprite: 'greywren_front' }); await s.fadeOut(1.5); return s.ending('drift');
    }
    await s.say('Grey Wren', `You've only kept ${Game.pages} page${Game.pages === 1 ? '' : 's'}. It's hard to answer with so little to hold on to. Maybe next time, sit with him more.`, { sprite: 'greywren_front' });
    await s.say('Wren', "...", { face: 'wren_blue' }); await s.fadeOut(1.5); return s.ending('drift');
  }
}
