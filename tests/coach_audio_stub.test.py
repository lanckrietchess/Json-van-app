import http.server,json,threading
calls=[]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n=int(self.headers['Content-Length']);b=json.loads(self.rfile.read(n));calls.append((self.path,self.headers.get('xi-api-key'),b['text']))
        if self.headers.get('xi-api-key')!='good': self.send_response(401);self.end_headers();return
        self.send_response(200);self.send_header('Content-Type','audio/mpeg');self.end_headers();self.wfile.write(b'ID3'+b'x'*400)
    def log_message(self,*a):pass
s=http.server.HTTPServer(('127.0.0.1',8799),H);threading.Thread(target=s.serve_forever,daemon=True).start()
import subprocess,os,sys
env=dict(os.environ,ELEVENLABS_API_BASE='http://127.0.0.1:8799',ELEVENLABS_API_KEY='good',ELEVENLABS_VOICE_ID='v1')
r=subprocess.run([sys.executable,'tools/make_coach_audio.py'],capture_output=True,text=True,env=env,cwd='.');print(r.stdout.strip().splitlines()[-1])
idx=json.load(open('assets/audio/coach/index.json'))['clips'];print('clips in index',len(idx),'files',len(os.listdir('assets/audio/coach'))-1)
n0=len(calls);r=subprocess.run([sys.executable,'tools/make_coach_audio.py'],capture_output=True,text=True,env=env,cwd='.');print('second run:',r.stdout.strip().splitlines()[0],'| new calls',len(calls)-n0)
env['ELEVENLABS_API_KEY']='bad';import shutil;shutil.rmtree('assets');r=subprocess.run([sys.executable,'tools/make_coach_audio.py'],capture_output=True,text=True,env=env,cwd='.');print('bad key:',r.stdout.strip().splitlines()[-2][:60])
