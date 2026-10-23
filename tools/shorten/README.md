# Short versions of long course texts (optional)

The app already folds any long course text to its first sentences with a **Read more** button (no tool needed). This tool goes one step
further: it asks Claude for a punchy rewrite of each long text, in your coach voice, and writes `short-texts.json`. The app then shows the
rewrite with a **Show full text** button instead of the plain fold. Your original text is never changed or lost.

    ANTHROPIC_API_KEY=sk-ant-... node shorten-texts.mjs /path/to/content.json --dry     # counts and a token estimate, calls nothing
    ANTHROPIC_API_KEY=sk-ant-... node shorten-texts.mjs /path/to/content.json --limit 10 --out ./try   # try ten first
    ANTHROPIC_API_KEY=sk-ant-... node shorten-texts.mjs /path/to/content.json --out ./out             # all of them

For your current content: 476 distinct long texts, about 65,000 input tokens and 23,000 output tokens (a few dollars at most).
It needs Node 18 or newer and no packages. It is resumable (`out/short-texts.cache.json`): run it again and only the missing ones are done;
`--retry-failed` retries the rejected ones.

**What keeps it safe**
- A rewrite is rejected unless it is at most 60% of the original, plain text, and **invents nothing**: every chess move, square, number and
  mid-sentence name in it must also be in the original. Rejections are listed with the reason in `out/short-texts-report.md`.
- The key is a hash of the exact original text. If you edit a course text later, its old rewrite stops matching and the app falls back to the
  fold, so a stale rewrite can never be shown.
- To remove a rewrite you do not like, delete its key from `short-texts.json`. To change one, edit its text there.
- Review `out/short-texts-report.md` (originals and rewrites side by side) before uploading. The model can still produce a rewrite that is
  true to the numbers and moves but changes the emphasis; that is what your review is for.

Then upload `out/short-texts.json` to the root of the Json-van-app repo, next to `mspc-notes.json`.

**Status:** tested against a mock of the API (request format, retries on 429 and 5xx, authentication errors, validation, resume). It has not
been run against the live API from here. Do a `--limit 10` run first.
Options: `--model` (default `claude-sonnet-5-5`), `--min` (shortest text to rewrite, default 300), `--concurrency` (default 3).
