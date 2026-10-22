#!/bin/sh
# usage: sh serve.sh [path/to/index.html]   builds the test site from the app folder and serves it on http://127.0.0.1:8765
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f /tmp/http.pid ] && kill "$(cat /tmp/http.pid)" 2>/dev/null
sleep 1
python3 "$HERE/build_site.py" "$@" || exit 1
(setsid nohup python3 "$HERE/server.py" >/tmp/http.log 2>&1 < /dev/null & echo $! > /tmp/http.pid)
sleep 1.5
curl -s -o /dev/null -w "served: index %{http_code}\n" http://127.0.0.1:8765/index.html
