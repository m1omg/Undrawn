#!/usr/bin/env python3
"""All generated art assets. Run: manifest.py [--jobs 4] [--only substr]  (skips finished files)."""
import os, sys, subprocess, argparse, shutil
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "assets", "raw"); IMG = os.path.join(ROOT, "assets", "img")
GEN = os.path.join(ROOT, "tools", "gen_image.py"); SLICE = os.path.join(ROOT, "tools", "slice.py")

# ---- recurring character descriptions (keep identical everywhere for consistency)
WREN = ("Wren: a 10 year old kid with a round paper-white face, big black dot eyes, pink cheeks, messy dark brown bob haircut with a cowlick, "
        "oversized striped sweater with cream, blue, pink and yellow stripes, blue rolled-up jeans, red sneakers")
BRAMBLE = ("Bramble: a small grumpy hedgehog knight, brown spines, cream belly, tiny dented tin-pot helmet, a round wooden shield studded with thorns, "
           "a short red scarf, stubby legs, frowning determined face")
PIP = ("Pip: a tiny excitable pilot made of folded white paper, origami creases visible, round aviator goggles pushed up, a bright yellow scarf, "
       "two paper-plane wings on the back, a huge grin")
MOTH = ("Moth: a shy fluffy pale-green moth child with feathery antennae, big round glasses, wearing an oversized knitted grey cardigan, "
        "holding a small glowing paper lantern, gentle nervous smile")
MOM = ("Mom: a tired but kind woman in her forties, dark hair in a loose bun, green cardigan, jeans, slippers")
POP = ("Pop: a gentle elderly grandfather, bald with tufts of white hair, round glasses, bushy white moustache, brown knitted vest over a checked shirt, a pencil behind his ear")
DARA = ("Dara: an 11 year old neighbour kid with curly black hair in two puffs, a purple hoodie, shorts, roller skates slung over the shoulder")

VIEW3 = ("Character reference sheet for a video game sprite: the SAME character drawn three times in one horizontal row, evenly spaced with clear empty gaps between them: "
         "(1) front view facing the viewer, (2) side view facing left in profile, (3) back view seen from behind. Simple standing pose, arms at sides, "
         "chibi proportions with a big head, all three drawings identical in size, colours and style. Character: ")
FACE4 = ("Expression sheet: the SAME character's head and shoulders drawn four times in one horizontal row with clear gaps: "
         "(1) calm neutral, (2) fired-up brave angry with furrowed brows and gritted teeth, (3) blue sad teary with drooping eyes, (4) giddy laughing with squinting happy eyes and open mouth. "
         "Identical size and style. Character: ")
ENEMY = ("A single enemy creature for a turn-based RPG battle, seen from the front, centred, whole body visible, no ground shadow, nothing else in the image. ")
TILE = ("A seamless repeating ground texture for a 2D top-down RPG map, flat, evenly lit, filling the entire square image edge to edge with no border, no objects, no horizon: ")
PROPS6 = ("A sprite sheet of six separate objects for a 2D top-down RPG, arranged in a 3 by 2 grid with generous empty space between every object so none touch, "
          "each drawn from a slightly elevated three-quarter view, each complete and not cropped, no ground shadows: ")
BG = ("A wide background painting for a turn-based RPG battle screen, seen from ground level looking slightly ahead, calm composition with the lower third fairly empty and simple, no characters, no creatures: ")

A = []  # (relative out path, prompt, size, transparent, post)
def add(out, prompt, size="square", transparent=False, post=None): A.append((out, prompt, size, transparent, post))
def sl(dirname, names, rows=1, height=None): return dict(dir=dirname, names=names, rows=rows, height=height)

# characters (3 views)
for key, desc in dict(wren=WREN, bramble=BRAMBLE, pip=PIP, moth=MOTH, mom=MOM, pop=POP, dara=DARA).items():
    add(f"chars/{key}.png", VIEW3 + desc + ".", "landscape", True, sl("chars", [f"{key}_front", f"{key}_side", f"{key}_back"], 1, 192))
NPCS = dict(
    dot="Dot: a friendly round walking ink-blot shopkeeper, glossy black with a white apron, little stick arms, a tiny bowler hat, cheerful eyes",
    shell="Sir Shell: an old tortoise librarian with a shell made of stacked books, tiny spectacles on a chain, a cane",
    nimbus="Nimbus: a small fluffy cloud-shaped sheep with a sleepy face and tiny black legs",
    fold="Fold: an orange origami fox with sharp paper creases, a sly grin, a green bandana",
    twins="Two identical little mushroom children with red spotted caps standing side by side holding hands, treated as ONE character",
    steep="Steep: a fat green frog sitting inside a floral porcelain teacup, wearing a tiny captain's hat",
    beacon="Beacon: a tall thin white paper crane bird wearing a fisherman's yellow raincoat and holding a lantern",
    greywren="Grey Wren: a pencil-sketch version of a 10 year old kid with a round face, dot eyes, messy bob haircut and striped sweater, drawn ONLY in grey graphite pencil lines and grey shading, no colour at all, slightly unfinished with some lines fading away",
)
for key, desc in NPCS.items():
    add(f"chars/{key}.png", VIEW3 + desc + ".", "landscape", True, sl("chars", [f"{key}_front", f"{key}_side", f"{key}_back"], 1, 192))
# faces (4 expressions) for party
for key, desc in dict(wren=WREN, bramble=BRAMBLE, pip=PIP, moth=MOTH).items():
    add(f"faces/{key}.png", FACE4 + desc + ".", "landscape", True, sl("faces", [f"{key}_neutral", f"{key}_brave", f"{key}_blue", f"{key}_giddy"], 1, 256))
# enemies
ENEMIES = dict(
    scribblebunny="a bunny made entirely of a tangled loop of black scribbled crayon lines, with two big white eyes and long scribbly ears",
    dandelion="an angry dandelion puff with a fluffy white seed head that has a grumpy face, green leaf arms on hips",
    crayonsnail="a snail whose shell is a spiral of rainbow coloured crayon stubs, with a sleepy face and a slime trail of colour",
    boss_scribble="a huge menacing tangle of black and dark purple scribbled crayon lines forming a vaguely spider-like mass, with many small white eyes peeking out and a jagged mouth",
    paperwolf="a wolf folded from white origami paper with sharp creases, glaring red dot eyes, and pencil-scribbled fur marks",
    stickbandit="a mischievous stick-figure bandit drawn in thick black marker, wearing a red bandana mask and holding a tiny sack, standing with attitude",
    crumpledowl="an owl made of crumpled brown paper with huge round yellow eyes and torn paper feathers",
    boss_smudge="a tall gentlemanly figure made entirely of a grey charcoal smudge, with a dapper top hat, a monocle, a thin smeared smile, and long dripping smudge fingers",
    teajelly="a wobbly translucent brown jellyfish shaped like a soggy teabag with a string tail and a bored face",
    pageghost="a ghost made of a wet wrinkled sheet of lined notebook paper with faded blue lines, hollow eyes, floating",
    marshwasp="a wasp made of folded yellow and black striped paper with a stapled stinger and buzzing crumpled wings",
    boss_waspqueen="a huge regal paper wasp queen made of yellow and black striped paper, wearing a crown of bent staples, with four buzzing crumpled wings and a long stapled stinger, imperious expression",
    shaving="a small pale pink and white eraser shaving curl creature with two tiny black eyes, drifting, ghostly",
    doubt="a pencil-sketched grey unfinished copy of a small child in a striped sweater, drawn only in grey graphite lines, face mostly blank, edges dissolving into scribbles",
    halfsketch="a creature that is only half drawn: the left half is a fully coloured cute crayon cat, the right half is just faint pencil construction lines and blank white",
    boss_blank="a towering pale figure shaped like a giant white pencil eraser with softly rounded edges, a single calm grey eye in the middle, and its outline dissolving into blank white paper and eraser dust at the edges, quiet and unsettling",
)
for key, desc in ENEMIES.items():
    add(f"enemies/{key}.png", ENEMY + desc + ".", "square", True)
# battle backgrounds
add("battle/bg_meadow.png", BG + "a rolling crayon-green meadow with scribbled flowers, a cotton-cloud sky, and pale blue hills.", "landscape")
add("battle/bg_woods.png", BG + "a forest of tall trees made of crumpled paper, deep blue-purple dusk light, pencil-scribbled shadows.", "landscape")
add("battle/bg_marsh.png", BG + "a misty marsh coloured in tea-stain browns and olive greens, reeds, a distant paper lighthouse, warm lantern light.", "landscape")
add("battle/bg_blank.png", BG + "an almost entirely blank white page with faint half-erased pencil outlines of hills and trees fading into nothing, eraser dust in the air.", "landscape")
# tiles
TILES = dict(
    grass="soft crayon-green grass with light scribbled strokes",
    grass2="crayon-green grass scattered with tiny scribbled yellow and pink flowers",
    path="a sandy beige dirt path with small pebbles drawn in coloured pencil",
    water="calm blue water with wavy white crayon lines",
    leaves="a forest floor of fallen orange and brown paper leaves",
    marsh="muddy olive-brown marsh ground with tea-stain rings",
    shallows="shallow murky tea-coloured water with lily pads",
    paper="plain blank white drawing paper with a very faint pencil grid and a few eraser crumbs",
    wood="warm brown wooden floorboards drawn in coloured pencil",
    rug="a cosy woven rug pattern in faded red, cream and blue stripes",
    kitchen="checkered kitchen floor tiles in cream and pale blue",
    porch="weathered grey-brown porch wooden planks",
    stone="grey cobblestone drawn with crayon",
    dark="dark navy scribbled void",
)
for key, desc in TILES.items():
    add(f"tiles/{key}.png", TILE + desc + ".", "square", False)
# props (six per sheet)
add("props/meadow1.png", PROPS6 + "(1) a round bushy green crayon tree with a brown trunk, (2) a grey boulder, (3) a small wooden signpost, (4) a red mushroom with white dots, (5) a closed wooden treasure chest, (6) a little pink flower bush.", "landscape", True, sl("props", ["tree","boulder","signpost","mushroom","chest","flowerbush"], 2, 256))
add("props/meadow2.png", PROPS6 + "(1) a short wooden picket fence segment, (2) a tall red ribbon bookmark stuck upright in the ground like a flag, (3) a red and white picnic blanket with a basket, (4) a birdhouse on a pole, (5) a small market stall with a striped awning, (6) a wooden bridge plank segment seen from above.", "landscape", True, sl("props", ["fence","bookmark","picnic","birdhouse","stall","bridge"], 2, 256))
add("props/woods.png", PROPS6 + "(1) a tall tree made of crumpled white paper with pencil-scribbled bark, (2) a dead twisted black crayon tree, (3) a fallen log, (4) a tree stump, (5) a paper lantern hanging on a wooden stick, (6) a small stone statue of an origami crane.", "landscape", True, sl("props", ["papertree","deadtree","log","stump","lantern","cranestatue"], 2, 256))
add("props/marsh.png", PROPS6 + "(1) a clump of tall cattail reeds, (2) a floral porcelain teacup big enough to be a boat, (3) a large green lily pad with a pink flower, (4) a giant soggy teabag leaning on a stick, (5) a round white and red striped paper lighthouse, (6) a wooden dock post with rope.", "landscape", True, sl("props", ["reeds","teacup","lilypad","teabag","lighthouse","dockpost"], 2, 256))
add("props/blank.png", PROPS6 + "(1) a tree drawn only as a faint grey pencil outline with no colour, half erased, (2) a giant yellow pencil stub standing upright, (3) a big pink rectangular eraser block, (4) a crumpled ball of white paper, (5) a wooden chair drawn only in faint grey pencil, (6) a wooden door frame standing alone with no walls.", "landscape", True, sl("props", ["ghosttree","pencilstub","eraserblock","paperball","ghostchair","doorframe"], 2, 256))
add("props/bedroom.png", PROPS6 + "(1) a child's single bed with a blue quilt seen from above at an angle, (2) a small wooden desk with a lamp and an open sketchbook, (3) a bookshelf full of colourful books, (4) a toy box with a teddy bear peeking out, (5) a window with curtains showing night sky, (6) a bedroom door.", "landscape", True, sl("props", ["bed","desk","bookshelf","toybox","window","door"], 2, 256))
add("props/house.png", PROPS6 + "(1) a round kitchen table with two chairs, (2) a cream coloured fridge covered in child's drawings held by magnets, (3) a stove with a kettle, (4) a wooden rocking chair, (5) a potted plant, (6) a coat rack with a coat and a hat.", "landscape", True, sl("props", ["table","fridge","stove","rockingchair","plant","coatrack"], 2, 256))
add("props/misc.png", PROPS6 + "(1) a wooden barrel, (2) a stack of three books, (3) a small campfire with a kettle, (4) a wooden well, (5) a tent made of a blanket over a rope, (6) a crumpled paper ball with a face peeking out (a hiding creature).", "landscape", True, sl("props", ["barrel","books","campfire","well","tent","hidingball"], 2, 256))
# icons
add("ui/icons.png", "A sprite sheet of twelve small item icons for a video game inventory, arranged in a 4 by 3 grid with generous empty space between them so none touch: (1) a short stubby blue crayon, (2) a pink eraser, (3) a chocolate chip cookie, (4) a juice box with a straw, (5) a bandage plaster, (6) a gold star sticker, (7) a folded paper page with a heart, (8) an old brass key, (9) a small glowing lantern, (10) a sandwich, (11) a cup of tea, (12) a red ribbon bookmark.", "landscape", True, sl("ui", ["ic_crayon","ic_eraser","ic_cookie","ic_juice","ic_bandage","ic_star","ic_page","ic_key","ic_lantern","ic_sandwich","ic_tea","ic_bookmark"], 3, 128))
# scenes
add("scenes/title.png", f"Title screen illustration: {WREN}, asleep curled up on top of a giant open sketchbook, surrounded by scattered crayons, with a hedgehog knight, a paper-plane pilot and a lantern moth peeking from the drawn pages; soft warm lamplight, lots of quiet empty space in the upper half for a title.", "landscape")
add("scenes/memory_table.png", f"Warm memory: {POP} and a smaller 6 year old version of {WREN} sitting together at a kitchen table drawing in a sketchbook, sunlight through a window, mugs of cocoa.", "landscape")
add("scenes/bedroom_night.png", f"{WREN} sitting on a bed at night in a dim bedroom, hugging knees, looking at a sketchbook on the floor that glows softly with colours leaking out of it.", "landscape")
add("scenes/scene_porch.png", f"{POP} sitting alone on a wooden porch in a rocking chair at dusk, holding a pencil over a completely blank page, looking confused and gentle.", "landscape")
add("scenes/end_keep.png", f"Hopeful ending: {WREN} and {POP} at the kitchen table, Wren's small hand guiding Pop's hand as they draw a hedgehog together, both smiling, morning light.", "landscape")
add("scenes/end_drift.png", f"Bittersweet ending: {WREN} alone in a bedroom looking out of a rainy window, a closed sketchbook on the desk, muted colours.", "landscape")
add("scenes/end_erase.png", "A completely blank white sheet of paper with one small faint grey pencil outline of a tiny wren bird in the corner, nothing else.", "landscape")
add("scenes/margins_vista.png", "A dreamlike vista of a world drawn in crayon: rolling green meadows, a forest of paper trees, a tea-coloured marsh with a lighthouse, and in the far distance the land fades into blank white paper; seen from a hilltop.", "landscape")

def do(entry):
    out, prompt, size, transparent, post = entry
    raw = os.path.join(RAW, out); final_done = os.path.join(IMG, out)
    if not os.path.exists(raw):
        cmd = [sys.executable, GEN, raw, prompt, "--size", size] + (["--transparent"] if transparent else [])
        r = subprocess.run(cmd, capture_output=True, text=True)
        if not os.path.exists(raw):
            print("FAILED", out, r.stderr[-400:]); return False
    if post:
        cmd = [sys.executable, SLICE, raw, os.path.join(IMG, post["dir"])] + post["names"] + ["--rows", str(post["rows"])]
        if post["height"]: cmd += ["--height", str(post["height"])]
        r = subprocess.run(cmd, capture_output=True, text=True)
        print(r.stdout.strip()); 
        if r.stderr.strip(): print(r.stderr.strip())
    else:
        os.makedirs(os.path.dirname(final_done), exist_ok=True)
        if transparent:  # single sprite: clean halo, trim, cap size
            sys.path.insert(0, os.path.dirname(__file__)); from slice import clean_alpha
            from PIL import Image
            im = clean_alpha(Image.open(raw)); bb = im.getbbox(); im = im.crop(bb) if bb else im
            if im.height > 600: im = im.resize((round(im.width * 600 / im.height), 600), Image.LANCZOS)
            im.save(final_done)
        elif out.split('/')[0] in ('tiles', 'battle', 'scenes'):  # opaque: store as jpg for the web
            from PIL import Image
            im = Image.open(raw).convert('RGB')
            if out.startswith('tiles/') and im.width > 512: im = im.resize((512, 512), Image.LANCZOS)
            im.save(final_done[:-4] + '.jpg', 'JPEG', quality=88, optimize=True, subsampling=1)
        else: shutil.copy(raw, final_done)
    print("DONE", out); return True

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--jobs", type=int, default=4); ap.add_argument("--only", default=None); ap.add_argument("--list", action="store_true"); ap.add_argument("--post-only", action="store_true")
    a = ap.parse_args()
    todo = [e for e in A if (a.only is None or a.only in e[0])]
    if a.list:
        for e in todo: print(e[0])
        sys.exit()
    if a.post_only: todo = [e for e in todo if os.path.exists(os.path.join(RAW, e[0]))]
    else: todo = [e for e in todo if not os.path.exists(os.path.join(RAW, e[0])) or e[4]]  # redo slicing always
    print(len(todo), "assets to process")
    with ThreadPoolExecutor(a.jobs) as ex: res = list(ex.map(do, todo))
    print("finished:", sum(res), "/", len(res))
