// Headless playtest harness: node tools/playtest.mjs "<script>"  where script is ; separated steps:
//  k:KeyZ  (press key)  h:ArrowRight:800 (hold key ms)  w:500 (wait ms)  s:name (screenshot)  j:<js> (eval in page)  e (dump console errors)
import path from 'node:path'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.env.SHOT_DIR || '/tmp/claude-1000/-home-mroz-Dokumenty-fable51highomorilike/fb56f77f-508e-4307-9a0c-8d8d837e933c/scratchpad/shots'; fs.mkdirSync(OUT, { recursive: true });
let raw = process.argv[2] || ''; if (raw.startsWith('@')) raw = fs.readFileSync(raw.slice(1), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).join('|');
const steps = raw.split('|').map(s => s.trim()).filter(Boolean);
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: +(process.env.DPR || 1) });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
await page.goto('http://127.0.0.1:8642/index.html'); await page.waitForTimeout(1500);
await page.evaluate(() => { window.__endings = []; const os = Game.set.bind(Game); Game.set = (k, v = true) => { if (String(k).startsWith('ending_')) window.__endings.push(k); return os(k, v); }; window.T = {
  place: (x, y, d) => { const m = Scenes.top(); m.player.x = (x + .5) * TILE; m.player.y = (y + .5) * TILE; m.player.dir = d ? d : 'down'; m.player.trail = []; return Game.map + ' ' + x + ',' + y; },
  clear: () => { const m = Scenes.stack.find(s => s.constructor.name === 'MapScene'); let n = 0; for (const e of m.entities) if (e.type === 'enemy' && !e.boss) { e.dead = true; n++; } return 'cleared ' + n; },
  top: () => Scenes.top().constructor.name, weaken: (id, hp) => { ENEMIES[id].hp = hp; return id; },
  state: () => JSON.stringify({ map: Game.map, top: Scenes.top().constructor.name, stack: Scenes.stack.map(s => s.constructor.name), party: Game.party, pages: Game.pages, msgs: Scenes.top().msgs ? Scenes.top().msgs : null, flags: Object.keys(Game.flags).filter(k => Game.flags[k] === true) }) }; });
for (const st of steps) {
  const [cmd, ...rest] = st.split(':'); const arg = rest.join(':');
  if (cmd === 'k') { await page.keyboard.press(arg); await page.waitForTimeout(120); }
  else if (cmd === 'h') { const [key, ms] = arg.split(':'); await page.keyboard.down(key); await page.waitForTimeout(+ms); await page.keyboard.up(key); await page.waitForTimeout(80); }
  else if (cmd === 'w') await page.waitForTimeout(+arg);
  else if (cmd === 'a' || cmd === 'd') { // a: advance dialogs AND battles until the map is free; d: dialogs only (stops at a battle)
    for (let i = 0; i < (+arg || 40); i++) {
      const free = await page.evaluate((stopAtBattle) => { const t = Scenes.top(); const n = t && t.constructor.name; return (stopAtBattle && n === 'BattleScene') || n === 'EndingScene' || n === 'CreditsScene' || n === 'TitleScene' || (n === 'MapScene' && !t.locked && Scenes.fade.a === 0); }, cmd === 'd');
      if (free) break; await page.keyboard.press('KeyZ'); await page.waitForTimeout(260);
    }
  }
  else if (cmd === 'u') { // wait until JS condition is true (max 60s)
    const t0 = Date.now(); let ok = false;
    while (Date.now() - t0 < 60000) { try { ok = await page.evaluate(arg); } catch (e) { ok = false; } if (ok) break; await page.waitForTimeout(200); }
    console.log('until', arg.slice(0, 60), ok ? 'ok' : 'TIMEOUT');
  }
  else if (cmd === 'b') { // auto-battle: spam Z while a BattleScene is on top and no choice is up
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      const st = await page.evaluate(() => ({ top: Scenes.top().constructor.name, inBattle: Scenes.stack.some(s => s.constructor.name === 'BattleScene') }));
      if (!st.inBattle || st.top === 'ChoiceScene') break; await page.keyboard.press('KeyZ'); await page.waitForTimeout(220);
    }
    console.log('battle ended ->', await page.evaluate(() => Scenes.top().constructor.name));
  }
  else if (cmd === 'c') { // advance dialogs until a ChoiceScene shows, then pick the option with this exact text
    const t0 = Date.now(); let picked = false;
    while (Date.now() - t0 < 90000) {
      const info = await page.evaluate(() => { const t = Scenes.top(); return { n: t.constructor.name, opts: t.options || null }; });
      if (info.n === 'ChoiceScene') { const idx = info.opts.indexOf(arg); if (idx < 0) { console.log('choice not found', arg, info.opts); break; } for (let i = 0; i < idx; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); } await page.keyboard.press('KeyZ'); picked = true; break; }
      await page.keyboard.press('KeyZ'); await page.waitForTimeout(240);
    }
    console.log('choice', arg, picked ? 'picked' : 'NOT picked');
  }
  else if (cmd === 'f') { await page.evaluate(() => { Game.fastText = true; }); }
  else if (cmd === 's') { await page.screenshot({ path: path.join(OUT, arg + '.png') }); console.log('shot', arg); }
  else if (cmd === 'j') { try { const r = await page.evaluate(arg); console.log('js>', JSON.stringify(r)); } catch (e) { console.log('js error', e.message); } }
  else if (cmd === 'e') { console.log(errors.length ? errors.join('\n') : 'no console errors'); errors.length = 0; }
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors'); await browser.close();
