# v25 source

- `index.v9.2.0.html` is the rollback copy and the base the v25 layer is applied to.
- `lc25.js` and `lc25.css` are the readable source of the v25 module and its styles (inlined into `index.html`).
- `sw.orig.js` is the 9.2.0 service worker.
- `apply_patches.py` builds `index.html` and `sw.js` (next to itself) from the 9.2.0 files plus `lc25.js`/`lc25.css`. Every hook is an exact-match
  `once(old, new, name)` that fails loudly if the base file changed, so the build can never half-apply. Run `python3 apply_patches.py`, then compare
  the output with the shipped `index.html` (`cmp`). Do not hand-edit `index.html`: edit the source and rebuild.
