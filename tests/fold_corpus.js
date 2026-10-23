/* Runs the fold over every long text in content.json and prints statistics plus a sample to read. */
const fs=require('fs');const {make}=require('./harness');
const {L}=make();
const content=JSON.parse(fs.readFileSync(process.env.CONTENT||'/mnt/project/content.json','utf8'));
const texts=[];
(function walk(o,path){
  if(Array.isArray(o))o.forEach(v=>walk(v,path));
  else if(o&&typeof o==='object')for(const k of Object.keys(o)){if(path.length===0&&!['trees','lists'].includes(k))continue;walk(o[k],path.concat(k))}
  else if(typeof o==='string'&&o.length>=300&&!/privacy|copy/.test(path.join('/')))texts.push({t:o,p:path.filter(x=>!/^c$/.test(x)).slice(-3).join('/')});
})(content,[]);
let folded=0,heads=[],ratio=[],badSplit=[];
for(const x of texts){
  const f=L.fold.parts(x.t,280);
  if(!f)continue;folded++;heads.push(f.head.length);ratio.push(f.head.length/f.full.length);
  /* a head must be a true prefix of the normalized text (apart from a trailing ellipsis), so nothing is reworded or invented */
  const h=f.head.replace(/\u2026$/,'');if(!f.full.startsWith(h))badSplit.push(x.t.slice(0,80));
  /* a head should not end in the middle of a move number */
  if(/(^|\s)\d{1,3}\.$/.test(h))badSplit.push('ends on a standalone move number: '+h.slice(-40));
}
const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
console.log(`long texts ${texts.length} | folded ${folded} | not folded (leftover too small) ${texts.length-folded}`);
console.log(`head length: avg ${Math.round(avg(heads))}, max ${Math.max(...heads)} | head is ${Math.round(avg(ratio)*100)}% of the text on average`);
console.log('heads that are not an exact opening of the text, or end on a move number:',badSplit.length);badSplit.slice(0,5).forEach(b=>console.log('  -',b));
const pick=(re)=>texts.filter(x=>re.test(x.t)&&L.fold.parts(x.t,280));
const samples=[...pick(/\b\d+\.\s?[A-Z][a-z]/).slice(0,2),...pick(/e\.g\./).slice(0,1),...texts.filter(x=>L.fold.parts(x.t,280)).slice(40,42)];
for(const x of samples.slice(0,5)){const f=L.fold.parts(x.t,280);console.log('\n['+x.p+'] '+x.t.length+' chars -> head '+f.head.length+':\n  HEAD: '+f.head+'\n  NEXT: '+f.full.slice(f.head.replace(/\u2026$/,'').length).slice(0,70)+'...')}
process.exit(badSplit.length?1:0);
