# Tests

Regression suites for the hub and the Arena server. They run offline: the CDN libraries come from `tests/vendor`, the course data from `tests/fixtures` (snapshots of Kyenzo's content), and the Claude API is simulated.

## Setup (once)

- Python 3.10+: `pip install playwright` then `python -m playwright install chromium`
- Node.js 22.5 or newer, for the server suites (they use Node's built-in SQLite as a stand-in for Cloudflare D1)

## Run

- `python tests/run.py` runs everything and ends with ALL SUITES PASSED.
- `python tests/run.py mspc arena` runs only those suites.
- Full output of each suite: `tests/.run/<suite>.log`. Screenshots: `tests/shots/`.

| Suite | What it proves |
|---|---|
| unit | the Arena server, action by action: boards, caps, settlement, friends, puzzles, member keys, AI limits, per-IP limits, and the 17 community actions (scores checked against the hub's own lcScore) (Node only) |
| mspc | no multiple choice left; interactive M, S, P and C steps; the Blunder Clinic; resizable panels; Trim board taps; fixed coach answers |
| arena | tournament counting, friend codes (and hostile ones), Chess.com follows, punishing a friend's blunder, weekly payout, share links, peer staging, Trim macro check and conclusion, ManyChat bridge, admin |
| formats | admin settings load from an admin-published file, from a hand-made data file with a `v5` section, and defaults without one |
| server | three devices on one local Arena server: live board, fresh friend cards, community puzzles, admin queue, bans, connection test |
| ai | member unlock, the Pro coach through a simulated Claude API (exact request checked), one device per key, free players never use AI, admin tools, AI session conclusion |
| members | members who unlocked before the server existed keep access and get tied to their key quietly |
| community | the classic community protocol on a local Arena server: two devices (desktop and phone) on the score and volume boards, a Chess.com account verified from a (mocked) public profile, the coach's Insights from anonymous stats, hiding a player |

The browser suites print labelled results; `tests/run.py` holds the lines a correct build must print. When behaviour changes on purpose, update those expectations in the same commit.
