"""Static server for /tmp/site. If /tmp/wasm-delay holds a number, .wasm downloads are delayed by that many milliseconds (to test slow engine loads)."""
import http.server,socketserver,os,time,sys
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k):super().__init__(*a,directory=os.environ.get('SITE_DIR','/tmp/site'),**k)
    def do_GET(s):
        if s.path.split('?')[0].endswith('.wasm') and os.path.exists('/tmp/wasm-delay'):
            try:time.sleep(int(open('/tmp/wasm-delay').read().strip())/1000)
            except Exception:pass
        super().do_GET()
    def log_message(s,*a):pass
class S(socketserver.ThreadingMixIn,http.server.HTTPServer):daemon_threads=True;allow_reuse_address=True
S(('127.0.0.1',8765),H).serve_forever()
