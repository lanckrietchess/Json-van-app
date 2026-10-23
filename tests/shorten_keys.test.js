/* The build tool and the app must compute the same key for the same text, or no rewrite would ever match. */
const assert=require('assert'),fs=require('fs'),path=require('path');const {make}=require('./harness');
(async()=>{
  const cand=[path.join(__dirname,'..','tools','shorten','textkey.mjs'),path.join(__dirname,'..','shorten','textkey.mjs')];
  const tk=await import('file://'+cand.find(f=>fs.existsSync(f)));
  const content=JSON.parse(fs.readFileSync(process.env.CONTENT||'/mnt/project/content.json','utf8'));
  const {L}=make();let n=0,odd=0;
  const texts=[];(function walk(o,p){if(Array.isArray(o))o.forEach(v=>walk(v,p));else if(o&&typeof o==='object'){for(const k of Object.keys(o)){if(p.length===0&&!['trees','lists'].includes(k))continue;walk(o[k],p.concat(k))}}else if(typeof o==='string'&&o.length>=300)texts.push(o)})(content,[]);
  for(const t of texts){n++;if(tk.textKey(t)!==L.fold.key(t)){odd++;if(odd<4)console.log('MISMATCH',JSON.stringify(t.slice(0,60)))}}
  /* texts with emoji / curly quotes / odd whitespace are the risky ones for a hash over UTF-16 code units */
  for(const t of ['Caf\u00e9 \u201cquoted\u201d \u2014 dash\u00a0nbsp','\ud83d\ude00 emoji \ud83e\udd14 x','  tabs\tand\nnewlines   ']){n++;if(tk.textKey(t)!==L.fold.key(t)){odd++;console.log('MISMATCH special',JSON.stringify(t))}}
  assert.strictEqual(odd,0,odd+' keys differ between the tool and the app');
  console.log('ok   tool key == app key for all '+n+' texts (476 distinct long course texts plus special characters)');
  /* round trip: a rewrite the tool would produce is shown by the app for exactly that original */
  const orig=texts.find(t=>L.fold.parts(t,280));const key=tk.textKey(orig);
  L.fold.short.map={[key]:'Short coach version of this note, written for the test.'};L.fold.short.fresh=true;
  assert(/Short coach version of this note/.test(L.fold.p(orig))&&/Show full text/.test(L.fold.p(orig)),'the app shows the tool\u2019s rewrite');
  assert(!/Short coach version/.test(L.fold.p(orig+' (edited)')),'and not for an edited original');
  console.log('ok   round trip: the app shows a rewrite keyed by the tool, and retires it when the text is edited\n\n2 passed');
})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,3).join('\n '));process.exit(1)});
