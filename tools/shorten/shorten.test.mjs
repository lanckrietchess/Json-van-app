import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fnv,textKey,normText} from './textkey.mjs';
import {validateShort,chessTokens} from './validate.mjs';
let n=0;const t=async(name,fn)=>{try{await fn();n++;console.log('ok  ',name)}catch(e){console.log('FAIL',name,'\n     ',e.stack.split('\n').slice(0,3).join('\n      '));process.exitCode=1}};

const ORIG='Before every move, find out what your opponent\u2019s last move did. Then check what your own move allows: after 12.Rxe4 the rook points at h7 and Nxe5+ is in the air. Most games at this level end with one unforced error: a piece left where it could be taken, or a threat nobody noticed. This chapter makes that check automatic so the rest of the course stands on a safe floor.';

await t('key: FNV-1a test vectors and whitespace-insensitive',()=>{
  assert.strictEqual(fnv(''),'811c9dc5');assert.strictEqual(fnv('a'),'e40c292c');assert.strictEqual(fnv('foobar'),'bf9cf968');
  assert.strictEqual(textKey('a  b\n c'),textKey(' a b c '));assert(/^[0-9a-f]{8}:\d+$/.test(textKey('x')));
});
await t('validate: a good rewrite passes',()=>{
  const v=validateShort(ORIG,'Check what their last move did, then what yours allows. After 12.Rxe4 watch h7 and Nxe5+. One unforced error ends most games.');
  assert(v.ok,v.reasons.join(';'));
});
await t('validate: rejects an invented move, square, number or name',()=>{
  const r=s=>validateShort(ORIG,s);
  let v=r('Check their last move first, then yours. Play Qh5 next and the attack wins quickly for you.');assert(!v.ok&&/move or square.*Qh5/.test(v.reasons.join(';')),v.reasons.join(';'));
  v=r('Check their last move first, then yours. The idea is worth 3 pawns in a typical game at this level.');assert(!v.ok&&/number.*3/.test(v.reasons.join(';')),v.reasons.join(';'));
  v=r('Check their last move first, then yours. As Capablanca showed, one unforced error ends most games.');assert(!v.ok&&/name.*Capablanca/.test(v.reasons.join(';')),v.reasons.join(';'));
  v=r('Check their last move first, then your own d5 idea. One unforced error ends most games at once.');assert(!v.ok&&/d5/.test(v.reasons.join(';')),v.reasons.join(';'));
});
await t('validate: rejects empty, too short, too long, markdown, preamble, assistant voice',()=>{
  const r=s=>validateShort(ORIG,s);
  assert(!r('').ok&&r('').reasons[0]==='empty');assert(r('Check.').reasons.some(x=>/too short/.test(x)));
  assert(r(ORIG.slice(0,330)).reasons.some(x=>/not short enough/.test(x)));
  assert(r('**Check** their last move, then yours. One unforced error ends most games for you.').reasons.some(x=>/markdown/.test(x)));
  assert(r('Here is a short version: check their last move, then yours. One error ends most games.').reasons.some(x=>/preamble/.test(x)));
  assert(r('As an AI, I would say: check their last move, then yours. One error ends most games.').reasons.some(x=>/assistant/.test(x)));
});
await t('validate: chess token extraction covers castling, captures, checks, promotions and squares',()=>{
  const tk=new Set(chessTokens('O-O Nxe5+ exd5 e4 Qh5# a8=Q 12.Rxe4 O-O-O Bb5'));
  for(const x of['O-O','Nxe5','exd5','e4','Qh5','a8=Q','Rxe4','O-O-O','Bb5'])assert(tk.has(x),'missing '+x+' in '+[...tk]);
  assert.strictEqual(validateShort('Castle with O-O and play exd5 soon, then Nxe5+ wins the pawn on e5 for you.','Castle with O-O, then exd5 and Nxe5+ wins the pawn on e5 for you.',{maxRatio:1,minChars:10}).ok,true);
});

/* ---------- mock Anthropic API ---------- */
const fixture={trees:[{id:'t1',tree:[{m:'e4',n:['ALPHA '+ORIG,'BRAVO '+ORIG,'CHARLIE '+ORIG,'DELTA '+ORIG,'Short note.'],c:[]}]}],lists:{bridge:[{id:'b1',explanation:'ECHO '+ORIG}]},copy:{'privacy.s1.text':'LEGAL '.repeat(100)}};
const GOOD='Check what their last move did, then what yours allows. After 12.Rxe4 watch h7 and Nxe5+. One unforced error ends most games.';
function mock(){
  const log=[];const attempts={};
  const srv=http.createServer((req,res)=>{
    let body='';req.on('data',d=>body+=d);req.on('end',()=>{
      const j=JSON.parse(body||'{}');const text=j.messages&&j.messages[0]&&j.messages[0].content||'';const tag=(text.match(/^(ALPHA|BRAVO|CHARLIE|DELTA|ECHO)/)||[])[1]||'?';
      log.push({url:req.url,method:req.method,headers:req.headers,body:j,tag});
      attempts[tag]=(attempts[tag]||0)+1;
      const send=(code,obj,h={})=>{res.writeHead(code,{'content-type':'application/json',...h});res.end(JSON.stringify(obj))};
      if(req.headers['x-api-key']==='bad-key')return send(401,{type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}});
      if(tag==='CHARLIE'&&attempts[tag]===1)return send(429,{type:'error',error:{type:'rate_limit_error'}},{'retry-after':'0'});
      if(tag==='DELTA')return send(500,{type:'error',error:{type:'api_error'}});
      if(tag==='BRAVO')return send(200,{content:[{type:'text',text:'Check their last move, then yours. Play Qh5 next and win. One error ends most games.'}],usage:{input_tokens:50,output_tokens:20}});
      send(200,{content:[{type:'text',text:GOOD}],stop_reason:'end_turn',usage:{input_tokens:50,output_tokens:30}});
    });
  });
  return new Promise(r=>srv.listen(0,'127.0.0.1',()=>r({srv,log,attempts,port:srv.address().port})));
}
const run=(args,env)=>new Promise(res=>{const p=spawn('node',['shorten-texts.mjs',...args],{env:{...process.env,SHORTEN_BACKOFF_MS:'5',...env}});let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);p.on('close',code=>res({code,out}))});

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'short-'));const cf=path.join(dir,'content.json');fs.writeFileSync(cf,JSON.stringify(fixture));
const m=await mock();const base='http://127.0.0.1:'+m.port,OUT=path.join(dir,'out');
await t('tool: --dry counts only the long, displayable texts (not legal copy, not short notes) and calls nothing',async()=>{
  const r=await run([cf,'--dry','--out',OUT,'--base-url',base],{ANTHROPIC_API_KEY:'k'});assert.strictEqual(r.code,0,r.out);
  assert(/long texts \(>= 300 chars\): 5\b/.test(r.out)&&/to do 5/.test(r.out),r.out);assert.strictEqual(m.log.length,0);
});
await t('tool: refuses to run without a key',async()=>{const r=await run([cf,'--out',OUT,'--base-url',base],{ANTHROPIC_API_KEY:''});assert.strictEqual(r.code,1);assert(/ANTHROPIC_API_KEY/.test(r.out))});
await t('tool: first run sends correct requests, retries the 429, rejects the invented move, records the failing server',async()=>{
  const r=await run([cf,'--out',OUT,'--base-url',base,'--concurrency','2'],{ANTHROPIC_API_KEY:'sk-test'});assert.strictEqual(r.code,0,r.out);
  const q=m.log[0];assert.strictEqual(q.method,'POST');assert.strictEqual(q.url,'/v1/messages');assert.strictEqual(q.headers['x-api-key'],'sk-test');assert.strictEqual(q.headers['anthropic-version'],'2023-06-01');assert(/application\/json/.test(q.headers['content-type']));
  assert.strictEqual(q.body.model,'claude-sonnet-5-5');assert(q.body.max_tokens>=200&&q.body.max_tokens<=1000);assert(/Never add a move, number, name or claim/.test(q.body.system));assert(/Plain text only/.test(q.body.system));
  assert.strictEqual(q.body.messages.length,1);assert.strictEqual(q.body.messages[0].role,'user');assert(q.body.messages[0].content.length>300,'the original text is sent whole');
  assert.strictEqual(m.attempts.CHARLIE,2,'429 retried once');assert.strictEqual(m.attempts.DELTA,5,'persistent 500 tried 5 times, then given up');
  const o=JSON.parse(fs.readFileSync(path.join(OUT,'short-texts.json'),'utf8'));
  assert.strictEqual(o.count,3);const keys=Object.keys(o.texts);
  assert(keys.includes(textKey('ALPHA '+ORIG))&&keys.includes(textKey('CHARLIE '+ORIG))&&keys.includes(textKey('ECHO '+ORIG)),'accepted ones are keyed by the original');
  assert(!keys.includes(textKey('BRAVO '+ORIG)),'the invented Qh5 was rejected');assert(!keys.includes(textKey('DELTA '+ORIG)));
  assert(Object.values(o.texts).every(x=>x===GOOD),'text stored as returned');assert(/tokens used/.test(r.out));
  const rep=fs.readFileSync(path.join(OUT,'short-texts-report.md'),'utf8');assert(/Rejected \(2\)/.test(rep)&&/adds a move or square/.test(rep)&&/request failed: HTTP 500/.test(rep)&&/Short: Check what their last move did/.test(rep));
});
await t('tool: a second run is free (cache), and --retry-failed retries only the failures',async()=>{
  const before=m.log.length;let r=await run([cf,'--out',OUT,'--base-url',base],{ANTHROPIC_API_KEY:'sk-test'});assert.strictEqual(m.log.length,before,'no requests');assert(/already done 5 \| to do 0/.test(r.out),r.out);
  r=await run([cf,'--out',OUT,'--base-url',base,'--retry-failed'],{ANTHROPIC_API_KEY:'sk-test'});const tags=m.log.slice(before).map(x=>x.tag);
  assert(tags.every(x=>x==='BRAVO'||x==='DELTA')&&tags.includes('BRAVO')&&tags.includes('DELTA'),tags.join(','));
});
await t('tool: an authentication error stops the run with exit code 2 instead of burning retries',async()=>{
  const out2=path.join(dir,'out2');const before=m.log.length;const r=await run([cf,'--out',out2,'--base-url',base,'--concurrency','1'],{ANTHROPIC_API_KEY:'bad-key'});
  assert.strictEqual(r.code,2,r.out);assert(/Stopping: HTTP 401/.test(r.out));assert.strictEqual(m.log.length-before,1,'one request, no retries: '+(m.log.length-before));
});
await t('tool: the overlay file has the shape the app loads ({texts:{key:string}})',()=>{
  const o=JSON.parse(fs.readFileSync(path.join(OUT,'short-texts.json'),'utf8'));
  assert(o.texts&&typeof o.texts==='object'&&!Array.isArray(o.texts));assert(Object.entries(o.texts).every(([k,v])=>/^[0-9a-f]{8}:\d+$/.test(k)&&typeof v==='string'));
});
m.srv.close();
console.log('\n'+n+' passed');
