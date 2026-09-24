# UNDRAWN — a sketchbook story

A short crayon-drawn JRPG in the spirit of OMORI, Undertale, Ib, End Roll and Re:Kinder,
with its own story, cast and mechanics. About two hours long, three endings.

Wren's grandfather, Pop, used to draw a bedtime story every night. Now Pop is forgetting,
and inside his sketchbook — the Margins — the pages are going blank. Wren, a grumpy hedgehog
knight, a paper-plane pilot who cannot land and a moth who reads too much go to find out why.

## Play

**Online:** https://m1omg.github.io/Undrawn/ (GitHub Pages, nothing to install).

**Locally:**

```
python3 play.py
```

That serves the folder on `http://127.0.0.1:8642/` and opens your browser (Chrome or Firefox).
Any static file server works too; opening `index.html` directly from disk does **not**
(browsers block audio/image loading over `file://`).

Controls: Arrows / WASD move · Shift run · Z / Enter / Space confirm & talk · X / Esc cancel ·
C / Tab menu · F fast-forward text.

## What is in it

- Real world (pencil-grey) and the Margins (crayon-coloured): bedroom, kitchen, porch,
  Scribble Meadow, Crumple Woods, the Crumple Gate, Teastain Marsh, The Blank.
- Four party members with distinct skill sets, a Doodle ultimate each and a follow-up move each.
- Emotion combat: BRAVE beats BLUE, BLUE beats GIDDY, GIDDY beats BRAVE, each with a second tier.
  HEART/INK resources, the shared SMUDGE gauge, follow-ups, TALK actions, charms, a shop.
- Visible roaming enemies, 16 enemy types, four bosses, chests, signposts, save bookmarks.
- Three real-world interludes with choices that keep **Memory Pages**; the page count and a final
  choice decide which of the three endings you get (KEEP, DRIFT, ERASE).
- Original music (14 tracks) and sound effects, synthesised in `tools/make_audio.py`.

## Art pipeline

All 70 planned images were generated with GPT Images through the Codex CLI
(`tools/gen_image.py`, prompts in `tools/manifest.py`) and sliced/cleaned with `tools/slice.py`:
every character in three views, the heroes' expression sheets, all 16 enemies, 8 prop sheets
(48 props), 14 ground tiles, 4 battle backgrounds, 8 cutscene/title/ending illustrations and the
item icons. Only "Grey Wren" is derived (a pencil filter over Wren's sprites).
`tools/proc_art.py` is a procedural crayon fallback that fills in any asset whose raw is missing,
so the game always runs even with an empty `assets/raw`.

To regenerate anything, delete its raw and run (add `--jobs 1` to go one at a time):

```
python3 tools/manifest.py --jobs 1      # generates only what is missing in assets/raw, then slices
python3 tools/manifest.py --post-only   # (re)slice / clean everything that already has a raw
python3 tools/proc_art.py               # regenerates procedural fallbacks only where no AI raw exists
python3 tools/list_assets.py            # refreshes assets/manifest.js
```

The game picks up whichever files exist under `assets/img/` — names are fixed, so nothing in the
code changes. `GEN_MODEL=gpt-reserve` (or another model id) selects the Codex model used to drive
the image tool; the quota belongs to the image tool itself, not the model.

## Files

```
index.html, play.py       entry points
src/core.js               assets, audio, input, scene stack, UI helpers, save/load
src/data.js               moods, skills, items, charms, party growth, enemies, encounter groups
src/dialog.js             dialog box, choices, cutscene cards, the async script API
src/map.js                exploration: tiles, collision, followers, roaming enemies, doors, chests
src/battle.js             turn-based combat
src/menu.js               pause menu and shop
src/title.js              title, endings, credits
src/maps.js               every map, NPC and story script
tools/                    asset generation, slicing, audio synthesis, headless playtest harness
assets/                   img/ (game-ready, 24 MB), raw/ (AI originals, 170 MB, only needed to re-slice), audio/, fonts/
DESIGN.md                 design document
```

## Testing

`tools/playtest.mjs` drives the game headlessly with Playwright (uses the system Chrome) and takes
screenshots; the scripts in `tools/tests/` play the whole game from the prologue to each ending.

```
node tools/playtest.mjs @tools/tests/full_run.txt
```

## Credits

Story, engine, music and sound: Claude (Anthropic). Character art: GPT Images via Codex.
Font: Patrick Hand by Patrick Wagesreiter (SIL OFL 1.1, see `assets/fonts/LICENSE.txt`).
Inspired by the feeling of OMORI, Undertale, Ib, End Roll and Re:Kinder — but drawn on our own paper.
