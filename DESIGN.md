# UNDRAWN — design document

A short (2–3 h) crayon-drawn JRPG about a kid named **Wren** whose grandfather, Pop, used to
draw bedtime stories for them. Pop's memory is fading. Every night Wren climbs into the
**Margins** — the world inside Pop's sketchbook — where the stories still live. But the pages
are going blank, one by one, and something called **the Blank** is erasing them.

Inspired by the *feel* of Omori / Undertale / Ib / End Roll / Re:Kinder (dream world vs. muted
real world, emotion-driven turn-based combat, warm humour over a sad core, choices that decide
the ending), but with its own story, mechanics and cast.

## Emotional core
Grief-in-advance (anticipatory loss), guilt about pulling away from someone who is changing,
and the discovery that keeping a story alive is a choice you make every day.
Real-world (pencil, grey) chapters show Wren avoiding Pop. Margins chapters are colourful.

## Cast (party)
| Name | Origin | Role | Weapon | Signature |
|---|---|---|---|---|
| **Wren** | the kid | balanced, leader | crayon "Stubby" | Sketch skills, can *Redraw* (revive) |
| **Bramble** | a grumpy hedgehog knight from Pop's story "The Hedgehog Who Wouldn't Share" | tank / Brave | thorn shield | Taunt, Thornwall |
| **Pip** | a paper-plane pilot, always over-excited | speed / Giddy | paper darts | multi-hit, Encore |
| **Moth** | a shy lantern-moth who reads too much | healer / Blue | lamp | Lullaby, Dim (debuffs) |

Wren's real-world scenes: Mom, Pop (grandfather), neighbour kid **Dara**.

## Emotion system ("Moods")
Neutral → **BRAVE** (red) / **BLUE** (blue) / **GIDDY** (yellow). Each has tier 2:
FEARLESS / DROWNING / MANIC (stronger effects, bigger penalties).
- BRAVE: ATK ×1.3, DEF ×0.8. Beats BLUE (×1.5 dmg), weak to GIDDY.
- BLUE: DEF ×1.3, SPD ×0.7, basic hits also drain enemy INK. Beats GIDDY, weak to BRAVE.
- GIDDY: SPD ×1.3, crit ×2, accuracy ×0.8. Beats BRAVE, weak to BLUE.
Resources: **HEART** (HP) and **INK** (MP). HEART 0 = **FADED** (must be *Redrawn*).
**Smudge gauge** (party-shared) fills when taking damage; at 100 % a *Doodle* (ultimate)
becomes available. After a basic attack, the acting character may trigger a **Follow-up** with
an ally if that ally is idle (costs Smudge).

## Structure
1. **Prologue — Bedroom (real)**: pencil-grey. Wren won't go downstairs to see Pop. Sleeps.
2. **Ch.1 — Scribble Meadow**: tutorial, meet Bramble. Boss: *The Scribble* (a tangle).
3. **Ch.2 — Crumple Woods**: paper trees, meet Pip. Side quests. Boss: *Mister Smudge*.
4. **Interlude — Kitchen (real)**: Pop calls Wren by the wrong name. Choice: stay or leave.
5. **Ch.3 — Teastain Marsh**: meet Moth, the lighthouse of unread pages. Boss: *The Wasp Queen*.
6. **Interlude — Porch (real)**: Mom talks about Pop's diagnosis. Memory pages.
7. **Ch.4 — The Blank**: erased pages, fights against Wren's own doubts. Final: *The Blank*.
8. **Endings**: KEEP (collected ≥ 4 memory pages, chose to sit with Pop) / DRIFT (default) /
   ERASE (accepted the Blank's offer to "forget so it stops hurting").

## Tech
Vanilla JS + Canvas, 16:10 canvas 960×600, 48 px tiles, data-driven maps in `data/maps.js`.
Assets generated with GPT Images via Codex (`tools/gen_image.py`), post-processed with Pillow.
Music/SFX synthesised in Python (`tools/make_audio.py`) — soft music-box / piano / lo-fi.
Run: `python3 play.py` (serves the folder and opens the browser).
