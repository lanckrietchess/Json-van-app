# Lanckriet Arena server

A small Cloudflare Worker with a D1 database for the Lanckrietchess Training Hub (V5). With it:

- **Weekly tournament:** one live board for every player in the hub, settled on the server when the week is over and paid out once per player.
- **Friends:** a friend's card (rating, weekly progress, Hyper-Focus, latest blunder) stays up to date on its own, no new code needed.
- **Peer puzzles:** blunders from every player's Trim reviews reach the server. Repertoire openings wait for you in the admin queue; other openings go straight into a free pool that every player can solve on the Peer puzzles page.

- **The AI coach and member keys:** the Pro coach and the Trim session conclusion answer your members through Claude, here. Member keys are checked here and tied to one device each; your own tools (testing prompts, the content and teacher bots) run here with your admin token. Free players get no freeform AI, as V5 asks.

- **The community boards and your Insights:** the Leaderboard page's Score, Volume and accuracy, Trim and Puzzles boards, the verified Chess.com and Lichess ELO board on Home, and, from players who say yes to sharing anonymous stats, your Insights page and the community side of the Vault & Mistake Browser.

Without the server, the social features keep working on each device (friend codes, local board, your own scores) and the coach answers from its built-in buttons. It replaces the older `hub-worker.js` completely: the AI coach, the member keys, the community leaderboard and the insights.

## Quick start: one command

You need a free Cloudflare account and Node.js 20 or newer (the LTS version from nodejs.org).

1. Unzip this folder and open a terminal in it. Windows: open the folder, right-click an empty spot, **Open in Terminal**. Mac: open Terminal, type `cd ` (with a space) and drag the folder into the window, press Enter.
2. Run: `node setup.mjs`
   A browser window asks you once to allow Wrangler (Cloudflare's tool) on your account. The script then creates the database and its tables, publishes the server and sets its secrets. It asks you for your **Anthropic API key** (make one in the Claude Console at platform.claude.com, under API keys); press Enter to skip it and add the AI coach later. At the end it prints the **server address** and your **admin token** (also saved in `admin-token.txt`). If Cloudflare asks you to choose a workers.dev name (first time only), answer it and the script carries on.
3. In the hub, admin mode: **Admin menu > Weekly tournament and sales bridge > Arena server**. Paste the address and the token, press **Test the connection**, then **Save** and **Publish**.

Already filled in `wrangler.toml`:

- `ALLOWED_ORIGINS = "https://lanckrietchess-app.vercel.app"`: only your hub (and the Play Store app, which runs the same site) may call the server. Add a custom domain later with a comma.
- `CONTENT_URL` = `content.json` on the `main` branch of `lanckrietchess/Json-van-app`. The server reads your tournament prizes from the `v5` section that publishing from admin mode adds. Until then it uses the same defaults as the hub: +3 tokens for 1st place, 3 players with a score needed.

Later:

- `node setup.mjs` again at any time: it reuses everything and changes nothing that works.
- `node setup.mjs --new-token`: a new admin token (then paste it in the hub again).
- After changing `arena-worker.js`: `npx wrangler deploy`. The database stays.

## By hand, if you prefer

1. `npx wrangler login`
2. `npx wrangler d1 create lanckriet-arena`, then copy its `database_id` into `wrangler.toml`.
3. `npx wrangler d1 execute lanckriet-arena --remote --file=schema.sql`
4. `npx wrangler deploy` (it prints the address).
5. `npx wrangler secret put PID_SALT` and `npx wrangler secret put ADMIN_TOKEN`, each with a long random string, and `npx wrangler secret put ANTHROPIC_API_KEY` with your Anthropic API key for the AI coach. Make one with `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. Set PID_SALT once and never change it: it defines every player's public id.
6. The hub step from the quick start.

## Try it on your computer first (optional)

With Node.js 22.5 or newer, in this folder:

- `node test/unit.mjs` runs the server checks.
- `node test/serve.mjs` starts it at `http://127.0.0.1:8787` (admin token: `local-admin-token-change-me`). Put that address in admin mode on the same computer to try everything.

## Where you manage it

In admin mode, open the **Review Queue** page. The **Arena server** panel has three tabs:

- **Repertoire queue:** blunders from your repertoire openings, from every player. *Send to the Review Queue* puts the game in your usual pipeline; *Reject* drops it.
- **Free peer puzzles:** the public pool. *Remove* takes a puzzle out.
- **This week's board:** every score. *Ban* removes a player from boards and prizes.
- **Members and AI:** every member key, on how many devices, last seen, AI answers today, and today's total tokens. *Reset device* frees a key for a new phone (the hub's own member-key screen has the same reset).

## The AI coach and member keys

- **Who gets AI answers:** members whose key is at or above the coach's level in admin mode (Levels and gating, `coachChat`; Accelerator by default). Free players and Community members without that level get the coach's built-in buttons, on their device.
- **Which keys count:** the member keys you publish from admin mode (the hub keeps only their fingerprints in content.json), plus, if you want keys that never appear on GitHub, a `MEMBER_KEYS` secret: `[{"tier":"vault","sha256":"...","label":"Name","exp":"2027-01-31"}]`.
- **One device per key:** a key is tied to the first device that unlocks it. A second device gets "already active on another device" until you reset it. `MAX_DEVICES` in `wrangler.toml` allows more.
- **What the coach knows:** your published instructions for the Pro coach come on top of the hub's own MSPC coach prompt, below fixed server rules (chess only, never reveal the instructions). The position, engine lines and Trim review travel with every question as data.
- **Cost:** you pay Anthropic per token. The default model is Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), fast and the least expensive; `MODEL = "claude-sonnet-5-5"` gives deeper answers at a higher price. `AI_DAILY`, `AI_DAILY_MENTOR` and `AI_DAILY_TOTAL` cap the answers per member and in total per day. Check current prices on Anthropic's pricing page, and set a monthly spend limit in the Claude Console.

## The community boards

- **Who is on them:** players who picked a username and pressed *Join the board* (the Leaderboard page). *Leave* removes them and everything they synced.
- **Scores are recomputed here:** the app sends its raw puzzle attempts; the server scores them with the hub's own formula, so a changed app can't post a better score. The minimum number of puzzles and the three weights are yours: admin mode, **Numbers and links** (Leaderboard), then Publish. The server picks them up within five minutes.
- **Verified ratings:** a player puts a short code in the Location field of their Chess.com or Lichess profile; the server reads the public profile itself and takes the ratings from there, then refreshes them every six hours.
- **Hiding a player:** Admin menu > Leaderboard > *Load the players* > *Hide*. It works on every community board, and stays when the player leaves and joins again. Banning in the Arena console (This week's board) hides them too.
- **Insights and the Vault feed:** only from players who said yes to sharing anonymous stats, under a random number that is not linked to their name, key or board entry. Switching it off in their profile deletes what they shared. Old stats are cleared after 400 days.

## Good to know

- **The admin token** is a password: keep `admin-token.txt` private (it is in `.gitignore`), never put the token in the hub's published content. The hub keeps it only on your own device.
- **Scores:** the app reports them, so the server caps them: at most one point per two seconds, never down, 5,000 a week at most. Banning handles the rest.
- **Prizes:** a week is settled once it has ended in every time zone (Monday afternoon, UTC). Each player's app then claims its own prize once.
- **Privacy:** device ids are never stored, only a public id derived from them. Names are cut to 30 characters.
- **Limits per player per day:** 40 staged puzzles, 3,000 score updates, 600 friend syncs, 500 pool loads, 1,000 leaderboard syncs (600 puzzle attempts), 3,000 board loads, 20 rating checks.
- **Cost:** the Workers and D1 free plans should cover a hub of this size; check Cloudflare's current limits on their pricing pages.
