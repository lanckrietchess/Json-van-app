#!/usr/bin/env python3
"""make_coach_audio.py (build 9.33.0): voices the fixed coach texts of the app (Alarm Signals, Action Steps, the four MSPC questions,
the "next 2 to 3 games" orders) once, in the owner's ElevenLabs voice. Python standard library only; run it on your own computer.

  python3 tools/make_coach_audio.py --dry          shows the number of clips and characters, nothing is sent
  python3 tools/make_coach_audio.py                makes the missing clips

Needs a .env next to content.json with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (never upload it).
Reads  tools/coach_audio_texts.json  (made by tools/coach_audio_texts.mjs from the app's own texts).
Writes assets/audio/coach/<hash>.mp3 and assets/audio/coach/index.json ({"clips": {<hash>: {"file": "<hash>.mp3"}}}).
<hash> = first 16 hex characters of the SHA-1 of the CLEANED text; clean() below is the same as LC60's clean() in app.html.
The app shows a small speaker button next to a text only when its clip exists.
"""
import hashlib, json, os, re, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "audio", "coach")
MAX_CHARS = 1200
API = os.environ.get("ELEVENLABS_API_BASE", "https://api.elevenlabs.io")

def clean(text):
    s = str(text if text is not None else "")
    s = re.sub(r"\*\*|__|`", "", s)
    s = re.sub(r"^[ \t]*[-\u2022*][ \t]+", "", s, flags=re.M)
    s = s.replace("\u2192", " to ").replace("\u2013", " to ").replace("\u2014", ", ").replace("->", " to ")
    s = re.sub("[\u2600-\u27BF\U0001F300-\U0001FAFF\u2190-\u21FF\u2B00-\u2BFF\uFE0F]", "", s)
    return re.sub(r"\s+", " ", s).strip()[:MAX_CHARS]

def hash_of(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]

def load_env():
    for p in (os.path.join(ROOT, ".env"), os.path.join(os.getcwd(), ".env")):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8"):
                m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*?)\s*$", line)
                if m and m.group(1) not in os.environ:
                    os.environ[m.group(1)] = m.group(2).strip('"\'')

def speak(text, key, voice):
    body = json.dumps({"text": text, "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")}).encode()
    req = urllib.request.Request(API + "/v1/text-to-speech/" + voice, data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def main(argv):
    dry = "--dry" in argv
    texts = json.load(open(os.path.join(HERE, "coach_audio_texts.json"), encoding="utf-8"))["texts"]
    seen, todo = {}, []
    for t in texts:
        c = clean(t)
        if c and hash_of(c) not in seen:
            seen[hash_of(c)] = c
    idx_path = os.path.join(OUT, "index.json")
    idx = json.load(open(idx_path))["clips"] if os.path.exists(idx_path) else {}
    for h, c in seen.items():
        if h not in idx or not os.path.exists(os.path.join(OUT, idx[h]["file"])):
            todo.append((h, c))
    chars = sum(len(c) for _, c in todo)
    print("%d texts, %d clips to make, %d characters" % (len(seen), len(todo), chars))
    if dry or not todo:
        return 0
    load_env()
    key, voice = os.environ.get("ELEVENLABS_API_KEY"), os.environ.get("ELEVENLABS_VOICE_ID")
    if not key or not voice:
        print("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env"); return 2
    os.makedirs(OUT, exist_ok=True)
    made = 0
    try:
        for h, c in todo:
            try:
                audio = speak(c, key, voice)
            except urllib.error.HTTPError as e:
                print("ElevenLabs answered %s: stopping (wrong key or used-up plan?)" % e.code); break
            if len(audio) < 200:
                print("Empty audio for", h); continue
            open(os.path.join(OUT, h + ".mp3"), "wb").write(audio)
            idx[h] = {"file": h + ".mp3"}
            made += 1
            json.dump({"clips": idx}, open(idx_path, "w"), indent=1)
            time.sleep(0.3)
    except KeyboardInterrupt:
        print("Stopped. What was made is kept.")
    print("made %d clips; upload the folder assets/audio/coach/ (the mp3 files AND index.json)" % made)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
