#!/usr/bin/env python3
"""Generate one image through the Codex CLI image tool.

usage: gen_image.py OUT.png "prompt text" [--size square|portrait|landscape] [--transparent] [--model M]
Falls back to gpt-5.6-luna if the default model errors (usage limits etc).
"""
import argparse, subprocess, sys, os, tempfile, shutil, time, json, re

STYLE = ("Art style: cute hand-drawn children's storybook illustration made with wax crayon and "
         "colored pencil on paper, thick slightly wobbly sketchy outlines, soft pastel colors, "
         "visible crayon texture, flat lighting, no gradients, no photorealism, no 3D render, no text, "
         "no watermark, no signature.")

def run(out, prompt, size, transparent, model, tries=2):
    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    workdir = tempfile.mkdtemp(prefix="gen_")
    sizes = {"square": "1024x1024 square", "portrait": "1024x1536 portrait", "landscape": "1536x1024 landscape"}
    bg = ("The background MUST be fully transparent (real alpha channel, PNG), nothing behind the subject."
          if transparent else "")
    full = (f"Use your built-in image generation tool exactly once to create ONE {sizes[size]} PNG image, "
            f"then copy the generated file to {workdir}/out.png and print its size. Do not edit or retouch it, "
            f"do not create any other files, do not ask questions.\n\nImage prompt:\n{prompt}\n\n{STYLE} {bg}")
    env = os.environ.get("GEN_MODEL")
    models = [model] if model else [env] if env else ["gpt-reserve", "gpt-5.6-luna"]
    last = ""
    for m in models:
        for attempt in range(tries):
            cmd = ["codex", "exec", "-s", "workspace-write", "--skip-git-repo-check", "-C", workdir, "-c", "model_reasoning_effort=\"low\""]
            if m: cmd += ["-m", m]
            cmd.append(full)
            try:
                p = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
            except subprocess.TimeoutExpired:
                last = "timeout"; continue
            last = (p.stdout + p.stderr)[-1500:]
            if os.path.exists(os.path.join(workdir, "out.png")):
                shutil.move(os.path.join(workdir, "out.png"), out)
                shutil.rmtree(workdir, ignore_errors=True)
                print(f"OK {out} (model={m or 'default'})")
                return True
            # try to recover from codex generated_images dir mentioned in the log
            mm = re.findall(r"(/home/[^\s\"']+generated_images/[^\s\"']+\.png)", last)
            if mm and os.path.exists(mm[-1]):
                shutil.copy(mm[-1], out); shutil.rmtree(workdir, ignore_errors=True)
                print(f"OK(recovered) {out} (model={m or 'default'})")
                return True
            if "usage" in last.lower() and "limit" in last.lower():
                break  # switch model
            time.sleep(3)
    print(f"FAIL {out}\n{last}", file=sys.stderr)
    shutil.rmtree(workdir, ignore_errors=True)
    return False

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("out"); ap.add_argument("prompt")
    ap.add_argument("--size", default="square", choices=["square", "portrait", "landscape"])
    ap.add_argument("--transparent", action="store_true")
    ap.add_argument("--model", default=None)
    a = ap.parse_args()
    sys.exit(0 if run(a.out, a.prompt, a.size, a.transparent, a.model) else 1)
