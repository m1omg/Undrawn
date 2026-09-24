// ===== UNDRAWN data: moods, skills, items, party, enemies =====
'use strict';
const MOODS = {
  neutral: { name: 'CALM', color: '#f4ecd8', atk: 1, def: 1, spd: 1, crit: 0, acc: 1, tier: 0, base: 'neutral' },
  brave: { name: 'BRAVE', color: '#ff6b57', atk: 1.3, def: 0.8, spd: 1, crit: 0, acc: 1, tier: 1, base: 'brave' },
  fearless: { name: 'FEARLESS', color: '#ff2e1a', atk: 1.6, def: 0.6, spd: 1, crit: 0.1, acc: 1, tier: 2, base: 'brave' },
  blue: { name: 'BLUE', color: '#6fa8ff', atk: 0.9, def: 1.3, spd: 0.7, crit: 0, acc: 1, tier: 1, base: 'blue' },
  drowning: { name: 'DROWNING', color: '#2d5fd6', atk: 0.8, def: 1.6, spd: 0.5, crit: 0, acc: 1, tier: 2, base: 'blue' },
  giddy: { name: 'GIDDY', color: '#ffd23c', atk: 1, def: 1, spd: 1.3, crit: 0.25, acc: 0.8, tier: 1, base: 'giddy' },
  manic: { name: 'MANIC', color: '#ffb300', atk: 1.1, def: 0.9, spd: 1.6, crit: 0.45, acc: 0.65, tier: 2, base: 'giddy' },
};
// attacker base beats defender base
const MOOD_BEATS = { brave: 'blue', blue: 'giddy', giddy: 'brave' };
function moodAdvantage(a, d) {
  const A = MOODS[a].base, D = MOODS[d].base;
  if (A === 'neutral' || D === 'neutral') return 1;
  if (MOOD_BEATS[A] === D) return 1.5; if (MOOD_BEATS[D] === A) return 0.75; return 1;
}
function moodUp(cur, base) { // apply a mood: same base tiers up, other base replaces
  if (base === 'neutral') return 'neutral';
  const c = MOODS[cur];
  if (c.base === base) return c.tier >= 2 ? cur : Object.keys(MOODS).find(k => MOODS[k].base === base && MOODS[k].tier === c.tier + 1);
  return base;
}

// ---- Skills. target: enemy | enemies | ally | allies | self | dead
const SKILLS = {
  attack: { name: 'Attack', cost: 0, target: 'enemy', power: 1, desc: 'A plain hit with your weapon.', basic: true },
  sketch_slash: { name: 'Sketch Slash', cost: 4, target: 'enemy', power: 1.35, desc: 'A quick crayon slash. Strong, cheap.', anim: 'slash' },
  cheer: { name: 'Cheer', cost: 5, target: 'ally', mood: 'giddy', desc: 'Make an ally GIDDY. Speedy, crit-happy, a bit clumsy.' },
  grit: { name: 'Grit Teeth', cost: 5, target: 'self', mood: 'brave', desc: 'Become BRAVE. Hit harder, guard worse.' },
  breath: { name: 'Deep Breath', cost: 6, target: 'self', mood: 'neutral', heal: 0.3, desc: 'Calm down and heal 30% HEART.' },
  redraw: { name: 'Redraw', cost: 12, target: 'dead', revive: 0.45, desc: 'Draw a FADED friend back in with 45% HEART.' },
  bold_lines: { name: 'Bold Lines', cost: 10, target: 'enemies', power: 1.0, desc: 'Thick strokes hit every enemy.', anim: 'slash' },
  thornwall: { name: 'Thornwall', cost: 5, target: 'self', taunt: 2, buff: { def: 1.4, turns: 2 }, desc: 'Bristle up. Enemies target Bramble for 2 turns, DEF up.' },
  bristle: { name: 'Bristle', cost: 4, target: 'self', mood: 'brave', desc: 'Get BRAVE. Someone has to.' },
  shield_bash: { name: 'Shield Bash', cost: 6, target: 'enemy', power: 1.2, moodOn: 'blue', moodChance: 0.7, desc: 'Bonk. May make the enemy BLUE.' },
  roll: { name: 'Roll', cost: 10, target: 'enemies', power: 0.9, braveBonus: 1.4, desc: 'Curl up and roll over everyone. Better when BRAVE.' },
  darts: { name: 'Paper Darts', cost: 6, target: 'enemy', power: 0.55, hits: 3, desc: 'Three paper darts. Each can crit.', anim: 'dart' },
  loop: { name: 'Loop-de-loop', cost: 5, target: 'self', mood: 'giddy', desc: 'Whee! Become GIDDY.' },
  dizzy_dive: { name: 'Dizzy Dive', cost: 7, target: 'enemy', power: 1.1, moodOn: 'giddy', moodChance: 0.8, desc: 'Dive-bomb. Makes the enemy GIDDY (and clumsy).' },
  tailwind: { name: 'Tailwind', cost: 9, target: 'allies', buff: { spd: 1.3, turns: 3 }, desc: 'Everyone gets faster for 3 turns.' },
  gale: { name: 'Paper Gale', cost: 12, target: 'enemies', power: 0.85, giddyBonus: 1.4, desc: 'A storm of paper. Better when GIDDY.', anim: 'dart' },
  mend: { name: 'Mend', cost: 6, target: 'ally', heal: 0.35, healFlat: 10, desc: 'Patch an ally up: 35% HEART + a bit.' },
  lullaby: { name: 'Lullaby', cost: 7, target: 'enemies', moodOn: 'blue', moodChance: 0.9, desc: 'A soft song. Every enemy turns BLUE and slow.' },
  dim: { name: 'Dim', cost: 5, target: 'enemy', debuff: { atk: 0.7, turns: 3 }, desc: 'Turn the lantern down. Enemy ATK drops.' },
  read_aloud: { name: 'Read Aloud', cost: 9, target: 'allies', heal: 0.22, mood: 'neutral', desc: 'Heal everyone 22% and calm all moods.' },
  moonbeam: { name: 'Moonbeam', cost: 12, target: 'enemy', power: 1.9, magic: true, desc: 'A beam of quiet light. Ignores half of DEF.', anim: 'beam' },
  // doodles (ultimates)
  d_wren: { name: 'BIG CRAYON', cost: 0, doodle: true, target: 'enemies', power: 2.4, desc: 'Draw one enormous crayon and drop it on everyone.', anim: 'slash' },
  d_bramble: { name: 'HEDGEHOG FORTRESS', cost: 0, doodle: true, target: 'allies', heal: 0.3, buff: { def: 1.6, turns: 3 }, desc: 'Everyone hides behind Bramble. Heal 30%, DEF way up.' },
  d_pip: { name: 'PAPER STORM', cost: 0, doodle: true, target: 'enemy', power: 0.7, hits: 5, desc: 'Five screaming paper planes.', anim: 'dart' },
  d_moth: { name: 'BEDTIME STORY', cost: 0, doodle: true, target: 'allies', heal: 1, revive: 0.5, mood: 'neutral', desc: 'Full heal, redraw the faded, calm everyone.' },
  // follow-ups
  f_wren: { name: 'Doodle Jab', cost: 0, follow: true, target: 'enemy', power: 0.7, moodOn: 'blue', moodChance: 0.5, desc: 'Wren adds a jab that may make the target BLUE.' },
  f_bramble: { name: 'Shield Slam', cost: 0, follow: true, target: 'enemy', power: 0.85, taunt: 1, desc: 'Bramble slams in and draws attention.' },
  f_pip: { name: 'Double Dart', cost: 0, follow: true, target: 'enemy', power: 0.45, hits: 2, desc: 'Pip flicks two darts.' },
  f_moth: { name: 'Little Light', cost: 0, follow: true, target: 'actor', heal: 0.18, desc: 'Moth heals whoever just attacked.' },
};

const ITEMS = {
  cookie: { name: 'Cookie', icon: 'ic_cookie', price: 12, use: { heal: 30 }, target: 'ally', desc: 'A chocolate-chip cookie. Heals 30 HEART.' },
  sandwich: { name: 'Sandwich', icon: 'ic_sandwich', price: 35, use: { heal: 90 }, target: 'ally', desc: 'Pop makes them with too much mustard. Heals 90 HEART.' },
  juice: { name: 'Juice Box', icon: 'ic_juice', price: 18, use: { ink: 20 }, target: 'ally', desc: 'Apple. Restores 20 INK.' },
  tea: { name: 'Cup of Tea', icon: 'ic_tea', price: 45, use: { heal: 40, all: true }, target: 'allies', desc: 'Warm and quiet. Heals everyone 40 HEART.' },
  bandage: { name: 'Bandage', icon: 'ic_bandage', price: 40, use: { revive: 0.35 }, target: 'dead', desc: 'Redraws a FADED friend with 35% HEART.' },
  star: { name: 'Star Sticker', icon: 'ic_star', price: 120, use: { heal: 9999, ink: 9999 }, target: 'ally', desc: 'A gold star. Fully restores one friend.' },
  crayon: { name: 'Crayon Stub', icon: 'ic_crayon', price: 10, use: { dmg: 28 }, target: 'enemy', desc: 'Throw it. 28 damage, ignores DEF.' },
  eraser: { name: 'Eraser', icon: 'ic_eraser', price: 15, use: { mood: 'neutral' }, target: 'any', desc: 'Rub out any mood on one target.' },
  // key items
  page: { name: 'Memory Page', icon: 'ic_page', key: true, desc: 'A page Pop drew. It smells like cocoa.' },
  key_gate: { name: 'Crumple Gate Key', icon: 'ic_key', key: true, desc: 'An old brass key. Fold gave it up eventually.' },
  lantern: { name: 'Moth\'s Lantern', icon: 'ic_lantern', key: true, desc: 'A paper lantern that never goes out.' },
  puff: { name: 'Cloud Puff', icon: 'ic_star', key: true, desc: 'A bit of Nimbus that blew away.' },
  bookmark: { name: 'Pop\'s Bookmark', icon: 'ic_bookmark', key: true, desc: 'A red ribbon. It marks the page where the story stopped.' },
};
const CHARMS = {
  tincup: { name: 'Tin Cup', stats: { hp: 12 }, desc: 'Bramble drinks from it. +12 HEART.' },
  luckycoin: { name: 'Lucky Coin', stats: { luck: 4 }, desc: 'Heads. +4 LUCK.' },
  thornring: { name: 'Thorn Ring', stats: { atk: 4 }, desc: 'Ouch. +4 ATK.' },
  scarf: { name: 'Wool Scarf', stats: { def: 4 }, desc: 'Itchy but warm. +4 DEF.' },
  wings: { name: 'Paper Wings', stats: { spd: 4 }, desc: 'They flap on their own. +4 SPD.' },
  glasses: { name: 'Pop\'s Old Glasses', stats: { atk: 2, def: 2, spd: 2, luck: 2, hp: 8 }, desc: 'Everything looks a bit clearer. +2 to everything, +8 HEART.' },
  inkwell: { name: 'Little Inkwell', stats: { ink: 12 }, desc: 'Never quite empty. +12 INK.' },
};

const PARTY = {
  wren: { name: 'Wren', color: '#ff8fb1', base: { hp: 42, ink: 22, atk: 8, def: 6, spd: 7, luck: 5 }, grow: { hp: 6, ink: 3, atk: 1.7, def: 1.2, spd: 1, luck: 0.5 },
    skills: { 1: ['sketch_slash', 'cheer'], 3: ['grit'], 5: ['redraw'], 8: ['bold_lines'], 11: ['breath'] }, doodle: 'd_wren', follow: 'f_wren', weapon: 'Stubby the crayon' },
  bramble: { name: 'Bramble', color: '#c98c4a', base: { hp: 58, ink: 12, atk: 9, def: 10, spd: 4, luck: 3 }, grow: { hp: 8, ink: 1.5, atk: 1.6, def: 1.7, spd: 0.6, luck: 0.3 },
    skills: { 1: ['thornwall', 'bristle'], 4: ['shield_bash'], 7: ['roll'] }, doodle: 'd_bramble', follow: 'f_bramble', weapon: 'Thorn shield' },
  pip: { name: 'Pip', color: '#ffd23c', base: { hp: 34, ink: 18, atk: 7, def: 4, spd: 11, luck: 8 }, grow: { hp: 5, ink: 2.5, atk: 1.5, def: 0.8, spd: 1.4, luck: 0.8 },
    skills: { 1: ['darts', 'loop'], 4: ['dizzy_dive'], 7: ['tailwind'], 10: ['gale'] }, doodle: 'd_pip', follow: 'f_pip', weapon: 'Paper darts' },
  moth: { name: 'Moth', color: '#a8e6a1', base: { hp: 36, ink: 30, atk: 5, def: 5, spd: 6, luck: 6 }, grow: { hp: 5, ink: 4, atk: 1.1, def: 1.1, spd: 0.9, luck: 0.6 },
    skills: { 1: ['mend', 'lullaby'], 4: ['dim'], 7: ['read_aloud'], 10: ['moonbeam'] }, doodle: 'd_moth', follow: 'f_moth', weapon: 'Lantern' },
};
function xpForLevel(l) { return Math.floor(18 * Math.pow(l, 1.55)); }
function newMember(id, level = 1) {
  const p = PARTY[id]; const m = { id, level, xp: 0, mood: 'neutral', charm: null, skills: [] };
  for (let l = 1; l <= level; l++) if (p.skills[l]) m.skills.push(...p.skills[l]);
  const s = memberStats(m); m.hp = s.hp; m.ink = s.ink; return m;
}
function memberStats(m) {
  const p = PARTY[m.id]; const out = {};
  for (const k of ['hp', 'ink', 'atk', 'def', 'spd', 'luck']) out[k] = Math.round(p.base[k] + p.grow[k] * (m.level - 1));
  if (m.charm && CHARMS[m.charm]) for (const [k, v] of Object.entries(CHARMS[m.charm].stats)) out[k] = (out[k] || 0) + v;
  return out;
}
function gainXp(m, amount) { // returns list of learned skills, or null if no level up
  m.xp += amount; const learned = []; let leveled = false;
  while (m.level < 30 && m.xp >= xpForLevel(m.level + 1)) {
    m.level++; leveled = true; const ls = PARTY[m.id].skills[m.level] || []; m.skills.push(...ls); learned.push(...ls);
    const s = memberStats(m); m.hp = Math.min(s.hp, m.hp + Math.round(s.hp * 0.3)); m.ink = Math.min(s.ink, m.ink + 5);
  }
  return leveled ? learned : null;
}

// ---- Enemies. acts: list of {name, weight, power, target, moodOn, self, heal, drainInk, msg}
const ENEMIES = {
  scribblebunny: { name: 'Scribble Bunny', hp: 26, atk: 6, def: 3, spd: 8, xp: 9, stickers: 5, scale: 0.55, drops: { cookie: 0.3 },
    acts: [{ name: 'Hop', w: 3, power: 1, msg: '{e} hops on {t}!' }, { name: 'Tangle', w: 2, power: 0.6, moodOn: 'blue', msg: '{e} tangles {t} in scribbles.' }, { name: 'Twitch', w: 1, msg: '{e} twitches its ears. Nothing happens.' }],
    flavor: ['It is drawn in one long line.', 'The bunny cannot decide which end is the front.'] },
  dandelion: { name: 'Grumpelion', hp: 32, atk: 7, def: 4, spd: 4, xp: 12, stickers: 7, scale: 0.55, drops: { juice: 0.25 },
    acts: [{ name: 'Puff', w: 3, power: 0.55, target: 'allies', msg: '{e} puffs seeds at everyone!' }, { name: 'Sneeze', w: 2, power: 1.2, msg: '{e} sneezes right at {t}.' }, { name: 'Sulk', w: 1, self: 'blue', msg: '{e} sulks and turns BLUE.' }],
    flavor: ['Wishes were made on it. None came true.', 'It is angry about the wind.'] },
  crayonsnail: { name: 'Crayon Snail', hp: 44, atk: 5, def: 9, spd: 2, xp: 14, stickers: 8, scale: 0.55, drops: { crayon: 0.5 },
    acts: [{ name: 'Slime', w: 3, power: 0.9, moodOn: 'blue', moodChance: 0.4, msg: '{e} leaves a colourful smear on {t}.' }, { name: 'Hide', w: 2, self: 'blue', msg: '{e} hides in its shell.' }, { name: 'Nibble', w: 2, power: 1, msg: '{e} nibbles {t}.' }],
    flavor: ['Its shell is a rainbow of stubs.', 'It leaves a trail of colour.'] },
  boss_scribble: { name: 'THE SCRIBBLE', boss: true, hp: 205, atk: 10, def: 6, spd: 6, xp: 90, stickers: 60, scale: 1.05, drops: { star: 1 },
    acts: [{ name: 'Lash', w: 3, power: 1.1, msg: 'THE SCRIBBLE lashes at {t}!' }, { name: 'Tangle Everything', w: 2, power: 0.5, target: 'allies', moodOn: 'blue', moodChance: 0.6, msg: 'THE SCRIBBLE tangles everyone!' }, { name: 'Scribble Storm', w: 1, power: 0.9, target: 'allies', every: 3, msg: 'THE SCRIBBLE STORMS!' }],
    flavor: ['Every mistake Wren ever scratched out.', 'It has too many eyes and none of them blink.'] },
  paperwolf: { name: 'Paper Wolf', hp: 58, atk: 12, def: 6, spd: 10, xp: 26, stickers: 14, scale: 0.6, drops: { cookie: 0.3 },
    acts: [{ name: 'Bite', w: 4, power: 1.1, msg: '{e} bites {t}!' }, { name: 'Howl', w: 2, self: 'brave', msg: '{e} howls and turns BRAVE.' }],
    flavor: ['Folded from a page of a scary story.', 'Its creases are sharp enough to cut.'] },
  stickbandit: { name: 'Stick Bandit', hp: 46, atk: 10, def: 5, spd: 9, xp: 24, stickers: 22, scale: 0.6, drops: { crayon: 0.4 },
    acts: [{ name: 'Swipe', w: 3, power: 1, msg: '{e} swipes at {t}.' }, { name: 'Pocket', w: 2, power: 0.6, steal: 6, msg: '{e} pockets some of your stickers!' }, { name: 'Pose', w: 1, self: 'giddy', msg: '{e} strikes a pose. So GIDDY.' }],
    flavor: ['Drawn in two seconds by someone in a hurry.', 'It claims it has a horse somewhere.'] },
  crumpledowl: { name: 'Crumpled Owl', hp: 64, atk: 9, def: 8, spd: 6, xp: 30, stickers: 16, scale: 0.6, drops: { juice: 0.3 },
    acts: [{ name: 'Hoot', w: 2, target: 'allies', moodOn: 'blue', moodChance: 0.5, msg: '{e} hoots a very sad hoot.' }, { name: 'Peck', w: 3, power: 1.2, msg: '{e} pecks {t}!' }, { name: 'Ruffle', w: 1, self: 'blue', heal: 0.15, msg: '{e} ruffles and smooths out a little.' }],
    flavor: ['Someone crumpled it and then felt bad.', 'It knows a lot and says nothing useful.'] },
  boss_smudge: { name: 'MISTER SMUDGE', boss: true, hp: 440, atk: 16, def: 9, spd: 8, xp: 220, stickers: 140, scale: 1.05, drops: { bandage: 1 },
    acts: [{ name: 'Smear', w: 3, power: 1.1, moodOn: 'blue', moodChance: 0.5, msg: 'MISTER SMUDGE smears {t}.' }, { name: 'Monocle Glint', w: 1, self: 'brave', msg: 'MISTER SMUDGE polishes his monocle. BRAVE.' }, { name: 'Ink Rain', w: 2, power: 0.7, target: 'allies', msg: 'MISTER SMUDGE tips his hat. Ink rains down!' }, { name: 'Freshen Up', w: 1, heal: 0.12, msg: 'MISTER SMUDGE dabs himself tidy.' }],
    flavor: ['A grey thumbprint that learned manners.', 'He insists it was an accident.'] },
  teajelly: { name: 'Tea Jelly', hp: 80, atk: 15, def: 7, spd: 5, xp: 40, stickers: 20, scale: 0.6, drops: { tea: 0.2 },
    acts: [{ name: 'Steep', w: 3, power: 1.1, msg: '{e} steeps onto {t}.' }, { name: 'Soggy', w: 2, power: 0.5, target: 'allies', moodOn: 'blue', moodChance: 0.4, msg: '{e} makes everything soggy.' }],
    flavor: ['Left in too long.', 'Bitter, but polite about it.'] },
  pageghost: { name: 'Page Ghost', hp: 66, atk: 17, def: 4, spd: 9, xp: 42, stickers: 18, scale: 0.6, drops: { juice: 0.35 },
    acts: [{ name: 'Wail', w: 2, drainInk: 8, msg: '{e} wails. {t} loses INK.' }, { name: 'Haunt', w: 3, power: 1.1, msg: '{e} flutters through {t}!' }, { name: 'Sob', w: 1, self: 'blue', msg: '{e} sobs. BLUE.' }],
    flavor: ['A page nobody read.', 'Its lines are still faintly blue.'] },
  marshwasp: { name: 'Paper Wasp', hp: 60, atk: 18, def: 5, spd: 12, xp: 44, stickers: 22, scale: 0.55, drops: { cookie: 0.3 },
    acts: [{ name: 'Sting', w: 3, power: 1.2, crit: 0.3, msg: '{e} stings {t}!' }, { name: 'Buzz', w: 2, self: 'giddy', msg: '{e} buzzes in circles. GIDDY.' }],
    flavor: ['Folded with too many corners.', 'Stapled shut at the back.'] },
  boss_waspqueen: { name: 'THE WASP QUEEN', boss: true, hp: 820, atk: 23, def: 12, spd: 12, xp: 480, stickers: 260, scale: 1.1, drops: { star: 1 },
    acts: [{ name: 'Royal Sting', w: 3, power: 1.3, crit: 0.2, msg: 'THE WASP QUEEN stings {t}!' }, { name: 'Swarm', w: 2, power: 0.75, target: 'allies', msg: 'THE WASP QUEEN calls the swarm!' }, { name: 'Command', w: 1, self: 'brave', msg: 'THE WASP QUEEN issues a command. BRAVE.' }, { name: 'Staple', w: 2, power: 0.9, moodOn: 'blue', moodChance: 0.8, msg: 'THE WASP QUEEN staples {t} to the page.' }],
    flavor: ['Her crown is bent staples.', 'She only wanted a tidy hive.'] },
  shaving: { name: 'Eraser Shaving', hp: 96, atk: 21, def: 10, spd: 10, xp: 70, stickers: 26, scale: 0.5, drops: { juice: 0.3 },
    acts: [{ name: 'Rub', w: 3, power: 1.1, msg: '{e} rubs against {t}. Colour fades.' }, { name: 'Drift', w: 2, power: 0.6, target: 'allies', msg: '{e} drifts through everyone.' }],
    flavor: ['What is left after a mistake is fixed.', 'It is very light.'] },
  doubt: { name: 'A Doubt', hp: 130, atk: 23, def: 11, spd: 9, xp: 95, stickers: 30, scale: 0.7, drops: { eraser: 0.5 },
    acts: [{ name: '"You forgot."', w: 2, target: 'allies', moodOn: 'blue', moodChance: 0.7, msg: 'A Doubt whispers: "You forgot him first."' }, { name: 'Copy', w: 3, power: 1.2, msg: 'A Doubt copies {t}\'s attack!' }, { name: '"It\'s fine."', w: 1, self: 'giddy', msg: 'A Doubt giggles: "It\'s fine. It\'s fine."' }],
    flavor: ['It has Wren\'s handwriting.', 'It knows exactly what to say.'] },
  halfsketch: { name: 'Half-Sketch', hp: 120, atk: 22, def: 14, spd: 7, xp: 88, stickers: 28, scale: 0.65, drops: { sandwich: 0.3 },
    acts: [{ name: 'Half Bite', w: 3, power: 1.1, msg: '{e} bites {t} with the finished half.' }, { name: 'Unfinish', w: 2, drainInk: 10, msg: '{e} steals some INK from {t}.' }, { name: 'Wait', w: 1, msg: '{e} waits to be finished.' }],
    flavor: ['Pop started it. Nobody finished it.', 'The left half purrs.'] },
  boss_blank: { name: 'THE BLANK', boss: true, hp: 1500, atk: 28, def: 15, spd: 10, xp: 0, stickers: 0, scale: 1.25, drops: {},
    acts: [{ name: 'Erase', w: 3, power: 1.2, drainInk: 6, msg: 'THE BLANK erases part of {t}.' }, { name: 'Silence', w: 2, target: 'allies', moodOn: 'blue', moodChance: 0.7, msg: 'THE BLANK says nothing. The nothing is heavy.' }, { name: 'White Out', w: 1, power: 0.9, target: 'allies', every: 4, msg: 'THE BLANK WHITES EVERYTHING OUT.' }, { name: 'Smooth', w: 1, heal: 0.06, msg: 'THE BLANK smooths itself flat.' }],
    flavor: ['It is not angry. That is the worst part.', 'It offers to make it stop hurting.'] },
};
const GROUPS = {
  meadow_a: ['scribblebunny'], meadow_b: ['scribblebunny', 'scribblebunny'], meadow_c: ['dandelion'], meadow_d: ['crayonsnail', 'scribblebunny'], meadow_e: ['dandelion', 'crayonsnail'],
  woods_a: ['paperwolf'], woods_b: ['stickbandit', 'stickbandit'], woods_c: ['crumpledowl'], woods_d: ['paperwolf', 'stickbandit'], woods_e: ['crumpledowl', 'paperwolf'],
  marsh_a: ['teajelly'], marsh_b: ['pageghost', 'pageghost'], marsh_c: ['marshwasp', 'marshwasp'], marsh_d: ['teajelly', 'pageghost'], marsh_e: ['marshwasp', 'teajelly', 'pageghost'],
  blank_a: ['shaving', 'shaving'], blank_b: ['doubt'], blank_c: ['halfsketch'], blank_d: ['doubt', 'shaving'], blank_e: ['halfsketch', 'doubt'],
  boss_scribble: ['boss_scribble'], boss_smudge: ['boss_smudge'], boss_waspqueen: ['boss_waspqueen', 'marshwasp'], boss_blank: ['boss_blank'],
};
