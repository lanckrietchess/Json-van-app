#!/usr/bin/env python3
"""Runs the hub's test suites and checks their key results.

  python tests/run.py            all suites
  python tests/run.py mspc ai    only these

Suites: unit (server, Node), mspc, arena, formats (browser), server, ai, members,
community (browser + a local Arena server on ports 8787/8789/8799, Node 22.5+). Each browser
suite prints labelled results; the expectations below are what a correct build
prints. Exit code 1 when anything fails. Screenshots land in tests/shots/."""
import os, re, sys, subprocess, shutil
TESTS = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(TESTS)
EXPECT = {
  'release': [r"versions \[CONFIG\.version, assetVersion, sw, version\.json\]: \['9\.32\.0', '9\.32\.0', 'sw\.js\?v=9\.32\.0', '\{\"build\":\"9\.32\.0\"\}'\]",
              r"old address left in app/landing/stripe defaults: \[0, 0, 1\]", r"landing \[launch links, manifest link, install buttons\]: \[0, True, 5\]",
              r"manifest \[id, start_url, scope\]: \['/app\.html', '/app\.html\?source=pwa', '/app\.html'\]", r"reset target: https://lanckrietchesstrainerhub\.vercel\.app/app\.html\?fresh=1793615024470",
              r"assetlinks \[relation, package\]: \['delegate_permission/common\.handle_all_urls', 'com\.lanckrietchess\.app'\]", r"node tests/sw\.test\.js: 14 passed", r"node tests/sw\.test\.mjs: 10 passed, 0 failed", r"node tests/stripe\.test\.mjs: 12 passed, 0 failed",
              r"static \[leak question in the first-run steps, rating box is the fallback\]: \[0, True\]",
              r"connect \[username, rating fetched, email asked before review, save box on the first card\]: \['kyenzotest', 1234, False, False\]",
              r"library rows \[count, buttons\]: \[3, 'Analyze Game / Trim Game'\]", r"library phone \[overflow-x\]: 0",
              r"Analyze Game \[game on the board, a review started\]: \[True, 0\]", r"Trim Game \[reviewed without a click, onboarded, result scrolled into view\]: \[1, True, True\]",
              r"review badge \[one badge on the board, its kind matches the move\]: \[1, True\]", r"first-run questions seen on this road \[rating box, leak question\]: \[False, False\]",
              r"guest before the first review \[email ask, sign-in hint\]: \[False, False\]", r"guest right after the review, on the lesson \[email ask\]: False",
              r"guest left the lesson \[sheets open, ask text, Google, email form\]: \[1, 'To save your progress and personalized feedback, connect your email\.', True, True\]",
              r"signed in \[ask closed, message\]: \[True, \"Awesome, your progress is saved! Let's set up your personalized feedback in the MSPC Framework & Working Points\.\"\]",
              r"MSPC guide \[route, the \? pulses\]: \['#system', True\]", r"after the \? \[route, Game Library on the page\]: \['#trim', True\]",
              r"LC80 \[welcome, first step, steps, rating found, next step, done, elo, leak asked\]: \['Welcome', 'Connect your games', 2, 'Found kyenzotest: 1234\.', 'Do you know and use the MSPC system\?', True, 1234, False\]",
              r"owner tiers \[buttons, Pro, kept on a new tab, Free, Owner again\]: \[\['Owner\*', 'Pro', 'Free'\], \['pov:b2c-paid', True\], \['pov:b2c-paid', True\], 'pov:b2c-free', 'all'\]", r"owner switcher in a POV view \[reachable, not covered\]: \[True, True\]",
              r"studio phone record button \[label, height, inside the screen, nothing on top\]: \['Record', 48, True, True\]", r"studio desktop record button \[label, height, inside the screen, nothing on top\]: \['Record', 48, True, True\]",
              r"studio phone settings \[folded by default, opens, folds again\]: \[True, True, True\]", r"studio desktop settings \[folded by default, opens, folds again\]: \[True, True, True\]",
              r"studio recording \[while recording: Stop, timer runs, pause shown\], \[after: Record, Export shown, takes\]: \[\['Stop', True, False\], \['Record', True\]\]",
              r"studio scenes \[saved, board off, loaded back\]: \[\['Board and camera'\], True, True\]", r"studio subtitles \[position, size saved for Render edit\]: \[0\.3, 'l'\]",
              r"studio \[silence default, auto subtitles button\]: \['\.8', True\]", r"landing install click \[prompted, still on landing, message\]: \[1, True, 'Installing",
              r"landing phone \[overflow-x\]: 0", r"no prompt available: the button opens: /app\.html\?install=1", r"app \[CONFIG\.version, footer shows, SiteURL production\]: \['9\.32\.0', 'v9\.32\.0', 'https://lanckrietchesstrainerhub\.vercel\.app/'\]",
              r"preview check \[live, old live, per-commit link, localhost\]: \[False, False, True, False\]", r"service worker \[script, controls the page, caches\]: \['/sw\.js\?v=9\.32\.0', True, \[[^\]]*'lc-shell-nf1-9\.32\.0'[^\]]*\]\]",
              r"old 9\.25\.0 shell cache deleted: True", r"network-first: the page is the newest build: 9\.32\.0", r"owner \[owner account, admin on, switcher, label\]: \[True, True, True, 'Admin Mode", r"auto subtitles \[ok, on device, captions, track not mic, busy after, players left\]: \[True, True, [23], \['audio', False\], False, 0\]", r"auto subtitles \[first two lines, max 8 words, inside the clip\]: \[\['Every move starts with the opponent', 'what did their last move'\], [1-8], True\]"],
  'mspc': [r"\[multiple-choice buttons, interactive steps\]: \[0, 1\]", r"M, after tapping \w\d: Correct", r"S \(tap stage from the file\): Correct", r"P, check: Correct",
           r"after dragging 170px left \[columns, session, board px\]: \['\d+px \d+px', '\{\"trainer\":0\.\d+\}', \d+\]", r"phone \[handle hidden, inline columns, overflow-x\]: \[True, '', 0\]",
           r"clinic S, wrong phase: Not that phase", r"clinic C, Ndf6: Correct", r"clinic miscalc \[feedback, struggles, log\]: \['Tagged: .*\['calc'\], 1\]",
           r"iq answer box after two taps: d6, e4", r"iq reply: Yes, that is the threat", r"fixed coach answer: Tap Upgrades", r"defaults back \[M name, M tags\]: \['Move', 8\]"],
  'arena': [r"score after 3 MSPC solves, 1 opening, 1 miss \[state, live board\]: \[3, '1 Kyenzo Test \(you\) 3 solved'\]", r"bad codes \[html-name, garbage\]: \['\{\"pid\":\"\",\"name\":\"img src=x onerror=alert\(1\)\",\"rating\":null",
            r"friends: \[\['Hikaru', 'chesscom', 2810", r"board: 1 Anna 5 solved / 2 Kyenzo Test \(you\) 3 solved / 3 Bram 1 solved", r"friend blunder M: Correct", r"friend blunder C \(Ndf6\): Correct",
            r"weekly payout .*\"rank\":1,\"players\":3,\"prize\":3\}', 3, None, True, 0\]", r"opened link on a new device \[friends, search left, hash\]: \[\['Kyenzo Test ?'\], '', '#leaderboard', 0\]",
            r"staged \[route, played, best, opening, has game\]: \[\['admin', 'Ngf6', 'Ndf6', 'Caro-Kann', True\]\]", r"Phase A, first message: Macro reality check: 1 blunder", r"Phase D, conclusion: Working points",
            r"ManyChat link: https://ig\.me/m/lanckrietchess\?ref=MSPC_[A-Za-z]+", r"webhook fired, sessions stored: \[\[.*'https://hook\.example\.com/x'\], 3\]",
            r"sent to the queue \[queue size, staged left\]: \[1, \['sptest2'\]\]", r"admin saved \[tournament, sales, unpublished\]: \['\{\"on\":true,\"metric\":\"trim\""],
  'formats': [r"admin-published hub file \+ v5 .*'https://lanckriet-arena\.example\.workers\.dev', 'Move!', 1, 'MSPC', 7, .*'Trim Week'\]", r"your real content\.json \+ v5 .*'https://lanckriet-arena\.example\.workers\.dev', 'Move!', 1, 'MSPC', 7, .*'Trim Week'\]",
              r"your real content\.json as it is .*\['null', '-', 'Move', 0, '-', 7, .*'Weekly MSPC Sprint'\]", r"copy the v5 section \[valid JSON when pasted, starts with\]: \[True"],
  'server': [r"A synced \[pid, server rows\]: \['[a-z0-9]{14}'", r"B board \(server\): 1 Anna \(friend\) 4 solved / 2 Bram \(you\) 2 solved", r"B after Anna trained \[board, fresh card score\]: \['1 Anna \(friend\) 6 solved / 2 Bram \(you\) 2 solved', \[\['Anna', 6\]\]\]",
             r"B stages a free puzzle: 1", r"A solved Bram’s blunder: Correct Ndf6", r"admin: server queue: REPERTOIRE 5\.\.\.Ngf6 better: Ndf6 Caro-Kann, Anna", r"admin: sent \[review queue size, server queue now\]: \[1,",
             r"A board after Bram is banned: \[\[\"Anna\",8\]\]", r"admin: test connection: Connected\. The admin token works\.", r"admin: wrong token: Connected, but the admin token is not accepted\.",
             r"admin: saved \[published server address, token stays local\]: \['\{\"url\":\"http://127\.0\.0\.1:8787\"\}', True, True\]"],
  'ai': [r"A unlocks with the member key \[ok, tier, message, remote, key kept\]: \[True, 'vault'", r"A: the Pro coach answered: Coach \(test\)",
         r"Claude request \[.*\]: \['sk-e2e', '2023-06-01', 'claude-haiku-4-5-20251001', 'What does 5\.Qe2 threaten here\?', 'Server rules', True, True, True\]",
         r"B tries the same key \[ok, message\]: \[False, 'This key is already active on another device", r"B asks the AI anyway: refused", r"free player \[sales assistant uses AI, coach AI\]: \[False, 'refused",
         r"admin: Members and AI: .*AI coach on, model claude-haiku-4-5-20251001", r"after the reset, B unlocks: \[True, 'vault'\]", r"after the reset \[B asks, then A asks\]: \['answered: .*', 'refused: bound'\]",
         r"admin prompt test \(preview\): answered", r"preview used the new prompt: True", r"B: AI session conclusion: Coach \(test\)", r"the conclusion request carried the session: \[True, True\]"],
  'members': [r"before the server: unlocked on the device \[ok, tier, remote\]: \[True, 'vault', False\]", r"server goes live, weekly check \[result, tier kept\]: \[None, 'vault'\]", r"AI coach on this device: answered",
              r"re-enter the key \[ok, tier\]: \[True, 'vault'\]", r"weekly check after connecting: \[None, 'vault'\]", r"a second device with the same key \[ok, message\]: \[False, 'This key is already active on another device"],
  'community': [r"endpoint falls back to the Arena server \[A synced, B synced, endpoint\]: \[True, True, 'http://127\.0\.0\.1:8789'\]", r"A score board: \*1 Anna \d+ / 2 Bram \d+",
                r"A: the server ranks the score the device shows: True", r"B is asked once to share stats \[title, again\]: \['Help shape the next lessons', \[False, False\]\]", r"B score board \(phone\): \['1 Anna \d+ / \*2 Bram \d+', '.*2 ranked players\.'\]", r"B phone \[overflow-x\]: 0", r"B phone \[gap between your card and friends >= 12px\]: True",
                r"B volume board \(20 solved to rank\): 1 Anna 22 *\n", r"B volume board, accuracy: 1 Anna 92%", r"A verifies Chess\.com: \[True, True, 'KyenzoTest', 2105\]", r"B tries a wrong code: \[False, 'code'\]",
                r"B sees the ELO board: .*#1 KY KyenzoTest 2105", r"admin insights: Last 30 days, from players who share anonymous stats\. 2 on the leaderboard\. 1 Players 1 Drills finished 25% First-try accuracy 1 Coach questions",
                r"admin insights \[players on the board, question\]: \[True, True\]", r"admin insights, wrong token: The worker refused the admin secret\.", r"admin hides Bram: Bram \(hidden\), Anna", r"A board after the admin hid Bram: Anna / 1"],
  'touch': [r"touch drag without LC55 \[page scrolls, piece in the air\]: \[True, True\]", r"touch drag with LC55 \[page stays put, piece in the air\]: \[True, True\]",
            r"touch swipe from an empty square with LC55 \[page scrolls, no piece in the air\]: \[True, True\]", r"touch real app \[LC55 on, build, embedded copy equals lc55\.js\]: \[True, '9\.32\.0', True\]"],
  'lc56': [r"bot\ \[board\ starts\ above\ 560\ px,\ board\ ends\ inside\ the\ 844\ px\ screen,\ quest\ strip\ below\ the\ board,\ touch\-action\]:\ \[True,\ True,\ True,\ 'none'\]",
            r"trim\ \[board\ starts\ above\ 300\ px,\ controls\ under\ it,\ scan\ button\ in\ the\ controls\]:\ \[True,\ True,\ True\]",
            r"middlegame\ \[Instant\ Play\ above\ 460\ px,\ stats\ below\ it\]:\ \[True,\ True\]",
            r"endgame\ \[Instant\ Play\ above\ 460\ px,\ stats\ below\ it\]:\ \[True,\ True\]",
            r"openings\ \[Instant\ Play\ above\ 460\ px,\ stats\ below\ it\]:\ \[True,\ True\]",
            r"shuffle\ \[Start\ shuffling\ above\ 300\ px,\ options\ folded\]:\ \[True,\ True\]",
            r"endgame\ Instant\ Play\ \[drill\ with\ a\ board\ is\ on\ screen\]:\ True",
            r"middlegame\ Instant\ Play\ \[drill\ with\ a\ board\ is\ on\ screen\]:\ True",
            r"openings\ Instant\ Play\ \[repertoire\ drill\ with\ a\ board\ is\ on\ screen\]:\ True",
            r"shuffle\ \[Options\ opens,\ folds\ again,\ Start\ shows\ the\ tip\ screen,\ a\ board\ appears,\ the\ tip\ screen\ is\ gone\]:\ \[True,\ True,\ True,\ True\]",
            r"rated\ puzzles\ \[linked\ rating\ 1337\ used,\ no\ manual\ pick\ shown;\ no\ account\ starts\ at\ 1000\]:\ \[\[True,\ 1337,\ True\],\ \[True,\ 1000\]\]",
            r"auto\-continue\ \[next\ pressed\ by\ itself\ in\ under\ 900\ ms\]:\ \[True,\ True\]",
            r"scan,\ good\ photo\ \[native\ camera\ picker\ accept/capture,\ spinner\ on\ the\ board,\ resized\ to\ <=\ 1080\ px,\ token\ \+\ key\ sent\]:\ \[\['image/\*',\ 'environment'\],\ True,\ True,\ True,\ True\]",
            r"scan,\ good\ photo\ \[position\ is\ on\ the\ analysis\ board:\ rook\ d1,\ king\ g8,\ nothing\ else\]:\ \[True,\ True,\ True\]",
            r"scan,\ unreadable\ photo\ \[better\-lighting\ message,\ board\ untouched,\ page\ alive,\ spinner\ gone\]:\ \[True,\ True,\ True,\ True\]",
            r"scan,\ impossible\ position\ from\ the\ server\ \[rejected\ by\ chess\.js,\ message\ shown\]:\ \[True\]",
            r"scan,\ daily\ limit\ \[its\ own\ message\]:\ \[True\]",
            r"scan,\ no\ connection\ \[message,\ no\ crash,\ spinner\ gone\]:\ \[True,\ True\]",
            r"scan,\ free\ member\ \[no\ camera,\ upgrade\ pop\-up\]:\ \[True,\ True\]",
            r"scan,\ guest\ \[no\ camera,\ sign\-in\ hint\]:\ \[True,\ True\]",
            r"LC56\ \[embedded\ copy\ equals\ lc56\.js,\ build,\ init\]:\ \[True,\ '9\.32\.0',\ True\]"],
  'lc57': [r"sheet\ \[benefit\ wording,\ not\ the\ old\ two\-button\ text\]:\ \[True,\ True,\ True\]",
            r"sheet\ \[box\ NOT\ pre\-ticked,\ button\ off,\ No\ thanks\ present\]:\ \[False,\ True,\ True\]",
            r"sheet,\ ticked\ and\ accepted\ \[button\ on,\ consent\ stored,\ queued,\ mail\ sent,\ inbox\ message\ with\ the\ address\]:\ \[True,\ True,\ True,\ True,\ True\]",
            r"sheet,\ accepted\ \[old\ consent\ keys\ updated\ so\ the\ old\ prompts\ stay\ quiet\]:\ \[True,\ True\]",
            r"sheet,\ \"Enter\ the\ key\ now\"\ \[goes\ to\ Account\]:\ True",
            r"account\ card\ \[key\ field,\ mail\ note,\ unsubscribe\]:\ \[True,\ True,\ True\]",
            r"account\ card\ \[wrong\ key\ refused,\ right\ key\ \(any\ case,\ spaces\)\ works,\ token\ wallet\ is\ claimed,\ card\ says\ done\]:\ \[True,\ True,\ True\]",
            r"a\ second\ use\ is\ refused\ with\ its\ own\ message:\ \[False,\ True\]",
            r"unsubscribe\ \[consent\ off\ on\ the\ server,\ the\ card\ says\ so\]:\ \[False,\ True\]",
            r"mail\ not\ configured\ \[honest\ message,\ the\ key\ is\ on\ screen,\ no\ claim\ that\ a\ mail\ was\ sent\]:\ \[True,\ True,\ 1\]",
            r"mail\ not\ configured,\ Redeem\ now\ \[token\ credited\ once,\ wallet\ claimed\]:\ \[True,\ True\]",
            r"No\ thanks\ \[no\ consent,\ nothing\ queued,\ no\ mail,\ sheet\ closed,\ not\ asked\ again\]:\ \[False,\ False,\ 0,\ True,\ False\]",
            r"account\ card,\ first\ time\ \[unticked\ \+\ button\ off;\ ticking\ and\ accepting\ shows\ the\ key\ field\]:\ \[\[False,\ True\],\ True,\ True\]",
            r"LC57\ \[embedded\ copy\ equals\ lc57\.js,\ both\ old\ sheets\ hand\ over\ to\ it,\ build\]:\ \[True,\ 2,\ '9\.32\.0'\]"],
  'lc58': [r"before\ the\ scan\ \[no\ working\ points,\ no\ cached\ games\]:\ \[0,\ 0\]",
            r"scan\ of\ 4\ games\ \[4\ games\ cached,\ 4\ graphs\ saved,\ 4\ mistake\ counts,\ own\-colour\ leaks\ only:\ P\ and\ S/M,\ never\ the\ opponent's\ C\]:\ \[4,\ 4,\ 4,\ True\]",
            r"working\ points\ \[filled\ by\ the\ scan,\ 3\ at\ most,\ a\ toast\ told\ the\ member\]:\ \[3,\ True,\ True\]",
            r"MSPC\ System\ page\ \[shows\ the\ new\ working\ points\]:\ \[True\]",
            r"a\ second\ visit\ inside\ the\ cool\-down\ does\ not\ scan\ again:\ True",
            r"Game\ Library\ \[4\ rows,\ 4\ graphs,\ none\ says\ \"no\ graph\ yet\"\]:\ \[4,\ 4,\ 0\]",
            r"scan\ \[waits\ while\ a\ trainer\ is\ open\ \(0\ games\ analysed\),\ runs\ once\ the\ person\ leaves\ it\]:\ \[True,\ True,\ True\]",
            r"no\ linked\ account\ \[nothing\ scanned,\ nothing\ cached\]:\ \[0,\ 0\]",
            r"switched\ off\ \[lc58\-off\ stops\ it\]:\ 0",
            r"three\ working\ points\ already\ there\ \[kept,\ none\ added,\ no\ \"filled\ in\"\ toast\]:\ \[3,\ True\]",
            r"LC58\ \[embedded\ copy\ equals\ lc58\.js,\ build\]:\ \[True,\ '9\.32\.0'\]"],
  'lc59': [r"join\ at\ 1437\ \[Catch\-Up\ Bonus\ pop\-up:\ \+6,\ one\ token\ per\ hundred,\ tokens\ claimed\ into\ the\ wallet,\ no\ milestone\ pop\-up\ for\ hundreds\ below\ the\ start\]:\ \[True,\ 6,\ True,\ True\]",
            r"milestone\ 1500\ \[congratulation,\ the\ three\-step\ reward\ ladder,\ Peak\ Gain\ line,\ box\ unticked,\ fields\ hidden\ until\ ticked\]:\ \[True,\ True,\ True,\ \[False,\ True\]\]",
            r"ticking\ the\ website\ box\ shows\ first\ name\ \+\ message:\ True",
            r"allow\ without\ a\ first\ name\ \[refused\ with\ a\ clear\ message,\ nothing\ claimed\]:\ \[True,\ 6\]",
            r"allow\ \+\ first\ name\ \+\ real\ message\ \[3\ tokens,\ the\ wallet\ is\ claimed,\ message\ waits\ for\ the\ owner\]:\ \[3,\ True,\ 'pending',\ True\]",
            r"made\-up\ message\ \[exact\ \"Nice\ try!\ I\ actually\ check\ the\ messages\ manually\"\ answer,\ still\ 2\ tokens\ for\ the\ proof,\ a\ way\ to\ unlock\ the\ 3rd\]:\ \[True,\ True,\ 2,\ True\]",
            r"another\ made\-up\ try\ later\ \[the\ playful\ answer\ again,\ no\ token\]:\ 2",
            r"a\ real\ review\ later\ \[3rd\ token\ unlocked,\ once\]:\ \[3,\ 'pending'\]",
            r"box\ not\ ticked\ \[1\ token\ for\ 1600\ \+\ 1\ for\ the\ lower\ milestone\ 1500\ that\ was\ never\ claimed;\ no\ website\ consent\ recorded\]:\ \[2,\ False,\ True\]",
            r"\"Later\"\ \[the\ pop\-up\ does\ not\ come\ back\ for\ 24\ hours\]:\ True",
            r"Account\ card\ \[linked\ name,\ start,\ peak\ and\ gain,\ next\ milestone,\ catch\-up,\ a\ Claim\ button\ for\ the\ unclaimed\ 1500\]:\ \[True,\ True,\ True,\ True\]",
            r"Account\ card\ after\ allowing\ \[says\ it\ appears\ once\ checked,\ offers\ \"Take\ me\ off\ the\ website\",\ offers\ the\ review\ for\ the\ 3rd\ token\]:\ \[True,\ True\]",
            r"withdraw\ from\ the\ website\ \[server\ updated,\ card\ updated\]:\ \[False\]",
            r"no\ linked\ chess\ account\ \[no\ request,\ no\ pop\-up\]:\ \[0,\ True\]",
            r"function\ not\ deployed\ yet\ \(404\)\ \[silent:\ no\ pop\-up,\ no\ error\ toast,\ no\ crash\]:\ \[True,\ True,\ True\]",
            r"a\ second\ visit\ within\ 12\ hours\ \[no\ new\ rating\ read\]:\ True",
            r"owner\ sheet\ \[name,\ linked\ Chess\.com\ name\ with\ a\ profile\ link,\ start,\ PEAK\ and\ gain,\ the\ message,\ both\ statuses\]:\ \[True,\ True,\ True\]",
            r"owner\ approves\ result\ \(star\)\ and\ message\ \[server\ updated,\ the\ list\ refreshes\]:\ \[True,\ 'approved'\]",
            r"owner\ rejects\ the\ message:\ rejected",
            r"owner\ menu\ \[row\ \"Student\ proofs\ and\ messages\"\ opens\ the\ same\ sheet\]:\ True",
            r"LC59\ \[embedded\ copy\ equals\ lc59\.js,\ owner\ row\ in\ lc49\.js\ and\ its\ copy\]:\ \[True,\ True,\ True\]"],
  'lc59land': [r"section\ order\ \[video,\ Wall\ of\ Love,\ Proof\ Queue,\ method,\ price\ contrast\ \+\ feature\ stack,\ pricing,\ install,\ FAQ\]:\ \['walkthrough',\ 'love',\ 'proof',\ 'how',\ 'price\-contrast',\ 'pricing',\ 'install',\ 'faq'\]",
            r"Founding\ Member\ banner\ \[moved\ down\ into\ the\ price\ contrast,\ no\ longer\ the\ first\ thing\ on\ the\ page\]:\ \[True,\ True,\ True\]",
            r"Proof\ Queue\ ranking\ \[1\)\ message\ \+\ result\ by\ Peak\ Gain:\ Anna\ 200\ then\ Dan\ 150,\ 2\)\ results:\ Eli\ 400\ then\ Bob\ 300,\ 3\)\ message\ only:\ Cleo;\ the\ owner's\ own\ cards\ after\ the\ members\]:\ \['Anna:1',\ 'Dan:1',\ 'Eli:2',\ 'Bob:2',\ 'Cleo:3'\]",
            r"old\ verified\ card\ of\ Bob\ is\ not\ shown\ twice:\ True",
            r"Peak\ Gain\ wording\ \[badge,\ \+200\ ELO,\ start\ to\ peak,\ days,\ quote\]:\ \[True,\ True,\ True,\ True,\ True\]",
            r"message\-only\ card\ \[no\ numbers\ at\ all\]:\ True",
            r"Wall\ of\ Love\ order\ \[message\ \+\ result\ by\ Peak\ Gain\ first\ \(Anna,\ Dan\),\ message\ only\ last\ \(Cleo\)\]:\ \['Anna',\ 'Dan',\ 'Cleo'\]",
            r"Wall\ of\ Love\ \[visible,\ 3\ messages,\ names,\ gain\ only\ where\ a\ result\ exists\]:\ \[True,\ 3,\ 2\]",
            r"landing\ phone\ \[no\ sideways\ scroll\]:\ 0",
            r"no\ members\ yet\ \[Wall\ of\ Love\ hidden,\ the\ Founder\ and\ Proof\ of\ concept\ cards\ stay,\ honest\ note\]:\ \[True,\ 2,\ True\]",
            r"feature\ stack\ \[18\+\ ticks\ in\ the\ Lanckriet\ Chess\ card\ against\ 3\ to\ 4\ in\ each\ market\ card\]:\ \[True,\ True\]",
            r"feature\ stack\ names\ what\ exists\ \[complete\ app,\ FEN\ scanner,\ gamification,\ three\ trainers,\ token\ loops\]:\ \[True,\ True,\ True,\ True,\ True,\ True,\ True\]",
            r"Founding\ line\ \[EUR\ 199\.50,\ about\ EUR\ 16\.60\ a\ month,\ under\ EUR\ 0\.55\ a\ day,\ shown\ while\ the\ first\ launch\ tier\ is\ open\]:\ \[True,\ True,\ True,\ True\]",
            r"copy\ \[hero:\ 355\ to\ 2105\ and\ \+630\ in\ 6\ weeks;\ no\ \"2\ months\";\ method\ line;\ no\ lifetime\ /\ forever;\ no\ promise\ of\ a\ rating\]:\ \[True,\ True,\ True,\ True,\ True,\ True,\ True\]"],
  'lc60': [r"endgame\ lesson\ \[speaker\ buttons\ on\ the\ voiced\ paragraphs,\ \"Listen\ to\ this\ lesson\"\ bar,\ Stop\ hidden,\ index\ read\ once\]:\ \[True,\ \[True,\ True\],\ 1\]",
            r"speaker\ button\ \[at\ least\ 28\ px\ wide,\ really\ tappable\]:\ \[True,\ True\]",
            r"one\ paragraph\ \[plays:\ button\ turns\ on,\ the\ paragraph\ is\ highlighted,\ the\ clip\ is\ requested;\ when\ it\ ends\ everything\ resets\]:\ \[\['true',\ True,\ True\],\ True,\ True\]",
            r"Listen\ to\ this\ lesson\ \[plays\ several\ different\ clips\ one\ after\ the\ other,\ Stop\ ends\ it\ and\ nothing\ more\ is\ requested\]:\ \[True,\ True,\ True\]",
            r"middlegame\ lesson\ \[also\ gets\ the\ speakers;\ the\ index\ is\ NOT\ requested\ again\]:\ \[True,\ 1\]",
            r"no\ audio\ files\ yet\ \[no\ buttons,\ no\ bar,\ ONE\ index\ request,\ lesson\ text\ still\ there\]:\ \[0,\ 1,\ True\]",
            r"no\ audio\ files\ yet,\ another\ lesson\ \[still\ only\ one\ index\ request\ in\ 6\ hours\]:\ 1",
            r"browser\ cleaning\ \+\ SHA\-1\ equals\ the\ Python\ script\ for\ markdown,\ arrows,\ dashes,\ emoji,\ spaces:\ \[True\]",
            r"LC60\ \[embedded\ copy\ equals\ lc60\.js,\ build\]:\ \[True,\ True\]"],
}
ORDER = ['unit', 'mspc', 'arena', 'formats', 'server', 'ai', 'members', 'community', 'touch', 'lc56', 'lc57', 'lc58', 'lc59', 'lc59land', 'lc60', 'release']
NEEDS_NODE = {'unit', 'server', 'ai', 'members', 'community'}
def node_ok():
    try: v = subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip().lstrip('v').split('.'); return (int(v[0]), int(v[1])) >= (22, 5)
    except Exception: return False
def run(name):
    if name in NEEDS_NODE and not node_ok(): return None, 'skipped: needs Node.js 22.5 or newer'
    if name == 'unit':
        p = subprocess.run(['node', 'test/unit.mjs'], cwd=REPO + '/server', capture_output=True, text=True, timeout=300)
        fails = [l for l in p.stdout.splitlines() if l.startswith('FAIL')]
        return ('ALL PASSED' in p.stdout and not fails), '\n'.join(fails) or p.stdout.strip().splitlines()[-1]
    os.makedirs(TESTS + '/.run', exist_ok=True)
    f = TESTS + '/.run/' + name + '.py'
    open(f, 'w', encoding='utf-8').write(open(TESTS + '/harness.py', encoding='utf-8').read() + '\n' + open(TESTS + '/suites/' + name + '.py', encoding='utf-8').read())
    p = subprocess.run([sys.executable, f], capture_output=True, text=True, timeout=900, env=dict(os.environ, LC_TESTS=TESTS))
    out = p.stdout
    missing = [e for e in EXPECT[name] if not re.search(e, out)]
    bad = [l for l in out.splitlines() if l.startswith('FAIL')]
    errors = re.search(r"^ERRORS (\d+)", out, re.M)
    if not errors: bad.append('no ERRORS line: the suite did not finish')
    elif errors.group(1) != '0': bad.append('ERRORS ' + errors.group(1) + ' (console or page errors, see the lines after it)')
    ok = not missing and not bad
    detail = '' if ok else '\n'.join(['  missing: ' + m for m in missing] + ['  ' + b for b in bad])
    open(TESTS + '/.run/' + name + '.log', 'w', encoding='utf-8').write(out + '\n--- stderr ---\n' + p.stderr)
    return ok, detail or '%d expectations met' % len(EXPECT[name])
if __name__ == '__main__':
    todo = [a for a in sys.argv[1:] if a in ORDER] or ORDER
    failed = 0
    for n in todo:
        ok, detail = run(n)
        print(('SKIP ' if ok is None else 'PASS ' if ok else 'FAIL ') + n.ljust(8) + ' ' + detail.split('\n')[0] if ok is not False else 'FAIL ' + n.ljust(8) + '\n' + detail, flush=True)
        if ok is False: failed += 1
    print('\n' + ('ALL SUITES PASSED' if not failed else str(failed) + ' SUITE(S) FAILED: full output in tests/.run/<suite>.log'))
    sys.exit(1 if failed else 0)
