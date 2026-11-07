#!/usr/bin/env python3
"""Lesson audio for Coach Lanckriet (build 9.31.0). Runs on YOUR computer, uses only the Python standard library.

What it does: reads the lesson texts from content.json (idea, takeaway, every learn paragraph of the endgame and middlegame courses,
the MSPC debrief of every lesson, the principle of every puzzle, and optionally the move notes of the opening trees), asks ElevenLabs to read each text ONCE in your voice,
and saves one mp3 per text in assets/audio/lessons/. A text is never read twice: the file name comes from the text itself, so an unchanged
text is skipped, and a changed text gets a new file. The list of everything that exists is assets/audio/lessons/index.json.
Then you push the new files to GitHub like any other file. Nothing calls ElevenLabs while people use the app, and no key is ever in the repo.

Setup (once): create a file called .env next to content.json with these two lines (no quotes needed):
    ELEVENLABS_API_KEY=your key
    ELEVENLABS_VOICE_ID=the id of your voice
optional:  ELEVENLABS_MODEL=eleven_multilingual_v2   and   ELEVENLABS_BASE=https://api.elevenlabs.io   (the second one is only for tests)
.env is private: never upload it (it is listed in .gitignore when you use the git ignore line at the bottom of this help).

Usage (open a terminal in the repo folder):
    python3 tools/make_lesson_audio.py --dry                    show what would be generated and how many characters it costs (calls nothing)
    python3 tools/make_lesson_audio.py                          generate every missing clip (default scope: takeaway, idea, learn, debrief, principle)
    python3 tools/make_lesson_audio.py --scope takeaway         only the takeaways (the shortest, a good first run)
    python3 tools/make_lesson_audio.py --scope notes            the move notes of the opening trees (about 870 clips)
    python3 tools/make_lesson_audio.py --budget 9000            stop after about 9000 characters (free plans have a monthly limit); run again next month
    python3 tools/make_lesson_audio.py --limit 5                generate at most 5 clips (a quick test)
    python3 tools/make_lesson_audio.py --force                  generate everything again
    python3 tools/make_lesson_audio.py --out assets/audio/lessons --content content.json

The script stops by itself when ElevenLabs says the key is wrong (401) or the plan is used up (quota), and waits and retries a few times on a
busy answer (429 / 5xx). Press Ctrl+C at any time: finished clips are kept and the next run continues where this one stopped.
Git ignore line for the key file:  .env   (add it to .gitignore).
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCOPES = ("takeaway", "idea", "learn", "debrief", "principle", "notes")
DEFAULT_SCOPES = ("takeaway", "idea", "learn", "debrief", "principle")
MAX_CHARS = 4500   # one clip never gets longer than this (ElevenLabs allows 5000)


def load_env(path):
    """KEY=value lines, # comments, optional quotes; real environment variables win."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def clean(text):
    """What is spoken: no markdown, no emoji or symbols that sound strange, one space between words."""
    t = str(text or "")
    t = re.sub(r"\*\*|__|`", "", t)
    t = re.sub(r"(?m)^[ \t]*[-\u2022*][ \t]+", "", t)   # bullet markers at the start of a line are not read out
    t = t.replace("\u2192", " to ").replace("\u2013", " to ").replace("\u2014", ", ").replace("->", " to ")
    t = re.sub(r"[\u2600-\u27BF\U0001F300-\U0001FAFF\u2190-\u21FF\u2B00-\u2BFF\uFE0F]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


LABEL = re.compile(r"^[A-Za-z]{0,4}\d+(?:\.\d+)*\s*\([^)]{1,30}\)\.\s*")   # "R0.1 (Law). " is a label in the lesson, not part of what is read


def clip_id(text):
    """The file name comes from the text only: the same sentence under two headings is ONE clip."""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def collect(content, scopes):
    """-> list of {id, kind, src, text}; the same text under two sources is one clip."""
    out, seen = [], {}

    def add(kind, src, raw):
        t = clean(raw)
        if len(t) < 12:
            return
        t = t[:MAX_CHARS]
        cid = clip_id(t)
        if cid in seen:
            seen[cid]["srcs"].append(src)
            return
        c = {"id": cid, "kind": kind, "src": src, "srcs": [src], "text": t}
        seen[cid] = c
        out.append(c)

    lists = (content.get("lists") or {})
    for name in ("courses.endgame", "courses.middlegame"):
        for it in lists.get(name) or []:
            if not isinstance(it, dict):
                continue
            ref = name + ":" + str(it.get("id", ""))
            if "idea" in scopes:
                add("idea", ref + "/idea", it.get("idea"))
            if "takeaway" in scopes:
                add("takeaway", ref + "/takeaway", it.get("takeaway"))
            if "learn" in scopes:
                for i, p in enumerate(it.get("learn") or []):
                    if isinstance(p, str):
                        for j, line in enumerate(l for l in LABEL.sub("", p).split("\n") if l.strip()):   # one clip per line / bullet, as the lesson shows them
                            add("learn", ref + "#" + str(i) + ("." + str(j) if j else ""), line)
            if "debrief" in scopes:
                for i, d in enumerate(it.get("debrief") or []):
                    t = d.get("t") if isinstance(d, dict) else d
                    if isinstance(t, str):
                        for j, line in enumerate(l for l in t.split("\n") if l.strip()):
                            add("debrief", ref + "/debrief" + str(i) + ("." + str(j) if j else ""), line)
    if "principle" in scopes:
        for name in ("middlegame", "endgame"):
            for it in lists.get(name) or []:
                if isinstance(it, dict):
                    add("principle", name + ":" + str(it.get("id", "")) + "/principle", it.get("principle"))
    if "notes" in scopes:
        def walk(o, ref):
            if isinstance(o, dict):
                if isinstance(o.get("m"), str) and isinstance(o.get("n"), str):
                    add("note", ref + ":" + o["m"], o["n"])
                for k, v in o.items():
                    walk(v, ref)
            elif isinstance(o, list):
                for v in o:
                    walk(v, ref)
        for t in content.get("trees") or []:
            walk(t.get("tree") if isinstance(t, dict) else t, "tree:" + str((t or {}).get("id", "")))
    return out


def synth(base, key, voice, model, text, tries=4):
    """One ElevenLabs text-to-speech call -> mp3 bytes. Raises RuntimeError('stop: ...') for errors that make every next call pointless."""
    url = base.rstrip("/") + "/v1/text-to-speech/" + voice + "?output_format=mp3_44100_128"
    body = json.dumps({"text": text, "model_id": model, "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}}).encode("utf-8")
    for attempt in range(tries):
        req = urllib.request.Request(url, data=body, method="POST", headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            if len(data) < 200:
                raise RuntimeError("the answer was not audio")
            return data
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode("utf-8", "ignore")[:300]
            except Exception:
                pass
            if e.code in (401, 403):
                raise RuntimeError("stop: ElevenLabs refused the key (" + str(e.code) + "). Check ELEVENLABS_API_KEY.")
            if e.code == 402 or "quota" in detail.lower():
                raise RuntimeError("stop: the ElevenLabs plan is used up. Run again after it resets, or use --budget.")
            if e.code == 404:
                raise RuntimeError("stop: voice not found (404). Check ELEVENLABS_VOICE_ID.")
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(min(30, 2 * (attempt + 1) * (2 if e.code == 429 else 1)) * float(os.environ.get("LC_AUDIO_WAIT", "1")))
                continue
            raise RuntimeError("ElevenLabs answered " + str(e.code) + " " + detail)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt < tries - 1:
                time.sleep(2 * (attempt + 1) * float(os.environ.get("LC_AUDIO_WAIT", "1")))
                continue
            raise RuntimeError("no connection to ElevenLabs: " + str(getattr(e, "reason", e)))
    raise RuntimeError("gave up")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Lesson audio for Coach Lanckriet", add_help=True)
    ap.add_argument("--dry", action="store_true", help="show what would be generated, call nothing")
    ap.add_argument("--scope", default=",".join(DEFAULT_SCOPES), help="comma list of: " + ", ".join(SCOPES))
    ap.add_argument("--budget", type=int, default=0, help="stop after about this many characters (0 = no limit)")
    ap.add_argument("--limit", type=int, default=0, help="generate at most this many clips (0 = no limit)")
    ap.add_argument("--force", action="store_true", help="generate clips that already exist again")
    ap.add_argument("--content", default=os.path.join(ROOT, "content.json"))
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "audio", "lessons"))
    ap.add_argument("--env", default=os.path.join(ROOT, ".env"))
    a = ap.parse_args(argv)
    scopes = [s.strip() for s in a.scope.split(",") if s.strip()]
    bad = [s for s in scopes if s not in SCOPES]
    if bad:
        print("Unknown scope:", ", ".join(bad), "(use:", ", ".join(SCOPES) + ")")
        return 2
    load_env(a.env)
    if os.environ.get("CACHE_AUDIO_ENABLED", "true").lower() in ("0", "false", "no"):
        print("CACHE_AUDIO_ENABLED is off: nothing to do.")
        return 0
    with open(a.content, encoding="utf-8") as fh:
        content = json.load(fh)
    clips = collect(content, scopes)
    os.makedirs(a.out, exist_ok=True)
    idx_path = os.path.join(a.out, "index.json")
    index, refs = {}, {}
    if os.path.exists(idx_path):
        try:
            old = json.load(open(idx_path, encoding="utf-8"))
            index, refs = old.get("clips", {}), old.get("refs", {})
        except Exception:
            index, refs = {}, {}
    for c in clips:   # every source of a finished clip points to it (texts that were already voiced earlier are linked too)
        if c["id"] in index:
            for sr in c["srcs"]:
                refs[sr] = c["id"]
    todo = [c for c in clips if a.force or not (c["id"] in index and os.path.exists(os.path.join(a.out, c["id"] + ".mp3")))]
    chars = sum(len(c["text"]) for c in todo)
    by = {}
    for c in todo:
        by[c["kind"]] = by.get(c["kind"], 0) + 1
    print("Texts found: %d | already done: %d | to generate: %d (%d characters)" % (len(clips), len(clips) - len(todo), len(todo), chars))
    if by:
        print("  to generate by kind:", ", ".join(k + " " + str(n) for k, n in sorted(by.items())))
    if a.dry:
        for c in todo[:8]:
            print("  -", c["id"], "|", c["src"], "|", c["text"][:70])
        if len(todo) > 8:
            print("  ... and", len(todo) - 8, "more. Nothing was generated (--dry).")
        return 0
    if not todo:
        print("Nothing to do.")
        return 0
    key, voice = os.environ.get("ELEVENLABS_API_KEY", ""), os.environ.get("ELEVENLABS_VOICE_ID") or os.environ.get("VOICE_ID", "")
    if not key or not voice:
        print("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID. Put them in the .env file (see the top of this script).")
        return 2
    base = os.environ.get("ELEVENLABS_BASE", "https://api.elevenlabs.io")
    model = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    done = spent = 0
    code = 0
    try:
        for c in todo:
            if a.limit and done >= a.limit:
                print("Limit reached.")
                break
            if a.budget and spent + len(c["text"]) > a.budget:
                print("Budget reached (%d characters). Run again later to continue." % spent)
                break
            try:
                data = synth(base, key, voice, model, c["text"])
            except RuntimeError as e:
                msg = str(e)
                if msg.startswith("stop: "):
                    print(msg[6:])
                    code = 1
                    break
                print("  skipped", c["id"], "-", msg)
                continue
            tmp = os.path.join(a.out, c["id"] + ".mp3.part")
            with open(tmp, "wb") as fh:
                fh.write(data)
            os.replace(tmp, os.path.join(a.out, c["id"] + ".mp3"))
            index[c["id"]] = {"file": c["id"] + ".mp3", "kind": c["kind"], "src": c["src"], "chars": len(c["text"]), "text": c["text"][:80], "at": int(time.time())}
            for sr in c["srcs"]:
                refs[sr] = c["id"]
            done += 1
            spent += len(c["text"])
            if done % 10 == 0:
                json.dump({"v": 1, "voice": voice, "clips": index, "refs": refs}, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                print("  %d done (%d characters)" % (done, spent))
    except KeyboardInterrupt:
        print("Stopped. Finished clips are kept.")
        code = 130
    json.dump({"v": 1, "voice": voice, "clips": index, "refs": refs}, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Generated %d clips (%d characters). Index: %s" % (done, spent, os.path.relpath(idx_path, ROOT)))
    return code


if __name__ == "__main__":
    sys.exit(main())
