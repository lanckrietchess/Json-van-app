/* Writes short-texts.json: a punchy rewrite for each long course text, validated against the original.
   usage: ANTHROPIC_API_KEY=... node shorten-texts.mjs <content.json> [--out ./out] [--model claude-sonnet-5-5] [--min 300] [--concurrency 3]
                                                       [--limit N] [--dry] [--retry-failed] [--base-url https://api.anthropic.com]
   The course data is only READ. A rewrite that adds any move, square, number or name is rejected. Resumable (cache file). */
import fs from 'node:fs';
import path from 'node:path';
import {textKey,normText} from './textkey.mjs';
import {validateShort} from './validate.mjs';

const args=process.argv.slice(2);
const file=args[0];if(!file||file.startsWith('--')){console.error('usage: ANTHROPIC_API_KEY=... node shorten-texts.mjs <content.json> [--out dir] [--model m] [--min 300] [--concurrency 3] [--limit N] [--dry] [--retry-failed] [--base-url url]');process.exit(1)}
const opt=(k,d)=>{const i=args.indexOf(k);return i<0?d:(args[i+1]===undefined||args[i+1].startsWith('--')?true:args[i+1])};
const OUT=opt('--out','./out'),MODEL=opt('--model','claude-sonnet-5-5'),MIN=+opt('--min',300),CONC=Math.max(1,+opt('--concurrency',3)),LIMIT=+opt('--limit',0);
const DRY=args.includes('--dry'),RETRY_FAILED=args.includes('--retry-failed'),BASE=String(opt('--base-url','https://api.anthropic.com')).replace(/\/$/,'');
const KEY=process.env.ANTHROPIC_API_KEY||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BACKOFF=+process.env.SHORTEN_BACKOFF_MS||1000;      // retry delay base; the test lowers it

/* ---------- 1. collect the long texts that the app folds (course notes, debriefs, annotations), not legal copy, settings or bots ---------- */
const content=JSON.parse(fs.readFileSync(file,'utf8'));
const found=new Map();
(function walk(o,p){
  if(Array.isArray(o))o.forEach(v=>walk(v,p));
  else if(o&&typeof o==='object'){for(const k of Object.keys(o)){if(p.length===0&&!['trees','lists'].includes(k))continue;walk(o[k],p.concat(k))}}
  else if(typeof o==='string'&&normText(o).length>=MIN){const k=textKey(o);if(!found.has(k))found.set(k,{key:k,text:o,where:p.filter(x=>x!=='c').slice(-3).join('/')})}
})(content,[]);
let items=[...found.values()];if(LIMIT)items=items.slice(0,LIMIT);
const chars=items.reduce((a,b)=>a+normText(b.text).length,0);
console.log(`long texts (>= ${MIN} chars): ${found.size}${LIMIT?' (limited to '+items.length+')':''} | ${chars} characters | about ${Math.round(chars/4)} input tokens and ${Math.round(chars/4*0.35)} output tokens`);

fs.mkdirSync(OUT,{recursive:true});
const cacheFile=path.join(OUT,'short-texts.cache.json');
const cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
const todo=items.filter(i=>!cache[i.key]||(cache[i.key].fail&&RETRY_FAILED));
console.log(`already done ${items.length-todo.length} | to do ${todo.length}`);
if(DRY)process.exit(0);
if(!KEY){console.error('Set ANTHROPIC_API_KEY (or use --dry).');process.exit(1)}

/* ---------- 2. ask the model, one text per request ---------- */
const SYSTEM=`You rewrite long chess-course paragraphs as a short version in the voice of a friendly, direct chess coach (Coach Lanckriet).
Rules:
1. Write at most 3 short sentences, and at most 40% of the original length.
2. Keep the one most important idea and the practical instruction. Drop the rest.
3. Keep every chess move, square, number, rating and rule code exactly as written. Never add a move, number, name or claim that is not in the original.
4. Plain text only: no markdown, no bullet points, no quotation marks, no emoji, no preamble.
5. Speak to the student as "you".
Reply with the rewritten text and nothing else.`;
async function ask(text){
  let lastErr;
  for(let attempt=0;attempt<5;attempt++){
    try{
      const r=await fetch(BASE+'/v1/messages',{method:'POST',headers:{'x-api-key':KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
        body:JSON.stringify({model:MODEL,max_tokens:400,temperature:0.3,system:SYSTEM,messages:[{role:'user',content:text}]})});
      if(r.status===429||r.status>=500){const ra=+r.headers.get('retry-after');lastErr=new Error('HTTP '+r.status);await sleep(Math.min(30000,(ra>0?ra*1000:BACKOFF*2**attempt)));continue}
      if(!r.ok){const b=await r.text();throw Object.assign(new Error('HTTP '+r.status+': '+b.slice(0,200)),{fatal:true})}
      const j=await r.json();
      const out=(j.content||[]).filter(b=>b&&b.type==='text').map(b=>b.text).join('');
      return{text:out,usage:j.usage||null};
    }catch(e){if(e.fatal)throw e;lastErr=e;await sleep(Math.min(30000,BACKOFF*2**attempt))}
  }
  throw lastErr||new Error('failed');
}

/* ---------- 3. run, validate, resume ---------- */
let done=0,ok=0,rejected=0,errors=0,inTok=0,outTok=0;const t0=Date.now();
async function work(i){
  try{
    const r=await ask(i.text);
    if(r.usage){inTok+=r.usage.input_tokens||0;outTok+=r.usage.output_tokens||0}
    const v=validateShort(i.text,r.text);
    cache[i.key]=v.ok?{short:v.text,model:MODEL,at:Date.now()}:{fail:v.reasons,tried:v.text,model:MODEL,at:Date.now()};
    v.ok?ok++:rejected++;
  }catch(e){
    if(e.fatal){console.error('\nStopping: '+e.message);fs.writeFileSync(cacheFile,JSON.stringify(cache));process.exit(2)}
    cache[i.key]={fail:['request failed: '+e.message],model:MODEL,at:Date.now()};errors++;
  }
  done++;
  if(done%20===0||done===todo.length){fs.writeFileSync(cacheFile,JSON.stringify(cache));const el=(Date.now()-t0)/1000;console.log(`  ${done}/${todo.length}  ok ${ok}  rejected ${rejected}  errors ${errors}  ${Math.round(el)}s`)}
}
let next=0;await Promise.all(Array.from({length:Math.min(CONC,todo.length||1)},async()=>{while(next<todo.length){const i=todo[next++];await work(i)}}));
fs.writeFileSync(cacheFile,JSON.stringify(cache));
if(inTok||outTok)console.log(`tokens used: ${inTok} in, ${outTok} out`);

/* ---------- 4. write the overlay and the review report ---------- */
const texts={};let accepted=0;
for(const i of items){const c=cache[i.key];if(c&&c.short){texts[i.key]=c.short;accepted++}}
fs.writeFileSync(path.join(OUT,'short-texts.json'),JSON.stringify({version:1,generated:new Date().toISOString().slice(0,10),model:MODEL,count:accepted,texts}));
const esc=s=>String(s).replace(/\|/g,'\\|').replace(/\n/g,' ');
const rep=['# Short texts: review report','',`${accepted} rewrites accepted of ${items.length} long texts. Nothing in your course data changed; the app shows a rewrite with a "Show full text" button.`,'',
 'To drop a rewrite you do not like: delete its key from `short-texts.json` (the app then folds the original instead). To change one, edit its text there.','',
 `## Rejected (${items.length-accepted})`,'','| Where | Why | Original (start) |','|---|---|---|',
 ...items.filter(i=>!(cache[i.key]&&cache[i.key].short)).slice(0,300).map(i=>`| ${i.where} | ${esc(((cache[i.key]||{}).fail||['not run']).join('; '))} | ${esc(normText(i.text).slice(0,120))} |`),'',
 `## Accepted: original and rewrite side by side`,'',
 ...items.filter(i=>cache[i.key]&&cache[i.key].short).flatMap(i=>[`**${i.where}**`,'',`> ${normText(i.text).slice(0,400)}${normText(i.text).length>400?'…':''}`,'',`Short: ${cache[i.key].short}`,''])];
fs.writeFileSync(path.join(OUT,'short-texts-report.md'),rep.join('\n'));
console.log(`wrote ${accepted} rewrites to ${OUT}/short-texts.json | rejected ${items.length-accepted} | report: ${OUT}/short-texts-report.md`);
