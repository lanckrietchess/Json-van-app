# Coach photos

Drag photos into the folder that matches the expression. Name them `<folder>_1.png`, `<folder>_2.png`, `<folder>_3.png`, ...

    neutral/neutral_1.png     thinking/thinking_1.png    serious/serious_1.png
    happy/happy_1.png         skeptical/skeptical_1.png  tough_love/tough_love_1.png

- Lowercase, underscore, number, no spaces. `Happy_3.png` and `happy3.png` are ignored.
- Square photos, about 512 x 512, under 150 KB each.
- Number from 1 without big holes (one gap is fine). Add as many as you like, up to 40 per folder.
- `neutral/neutral_1.png` is the safety net for every other folder: upload it first.
- With the GitHub Action (.github/workflows/coach-manifest.yml) `manifest.json` is rebuilt for you after every push.
  Without it the app finds the numbered files by itself. `.webp` and `.jpg` need the manifest.
