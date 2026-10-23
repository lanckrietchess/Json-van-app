/* The tech theme only changes CSS variables. This checks, with the WCAG formula, that no text colour gets harder to read than in the classic theme. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const find=(...c)=>c.map(f=>path.join(__dirname,...f)).find(f=>fs.existsSync(f));
const html=fs.readFileSync(find(['..','src','v25','index.v9.2.0.html'],['..','index.v9.2.0.html']),'utf8');
const css=fs.readFileSync(find(['..','src','v25','lc25.css'],['..','lc25.css']),'utf8');
const root=html.match(/:root\{([^}]*)\}/)[1];
const vars=src=>{const o={};for(const m of src.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6}|rgba?\([^)]*\))/g))o[m[1]]=m[2];return o};
const classic=vars(root);
const themeBlock=css.match(/html\[data-lc25-theme="tech"\]\{([^}]*)\}/)[1];
const tech=Object.assign({},classic,vars(themeBlock));
const bgs=['ink','ink-2','surface','raised'];
const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const fgs=['chalk','fog','dim','accent','good','miss','warn'];
let worse=[],minTech=99,minPair='',rows=[];
for(const bg of bgs)for(const fg of fgs){
  const a=ratio(classic[fg],classic[bg]),b=ratio(tech[fg],tech[bg]);
  rows.push([fg+' on '+bg,a.toFixed(2),b.toFixed(2)]);
  if(b<a-0.05)worse.push(fg+' on '+bg+': '+a.toFixed(2)+' -> '+b.toFixed(2));
  if(['chalk','accent','good','miss','warn'].includes(fg)&&b<minTech){minTech=b;minPair=fg+' on '+bg+' (classic '+a.toFixed(2)+')'}
}
assert.deepStrictEqual(Object.keys(vars(themeBlock)).sort(),['accent-line','accent-soft','dim','hair','ink','ink-2','raised','rule','surface'],'the theme changes only backgrounds, borders and the muted grey text');
for(const bg of bgs)assert(ratio(tech.dim,tech[bg])>=4.5,'the muted text must reach WCAG AA (4.5:1) on '+bg+': '+ratio(tech.dim,tech[bg]).toFixed(2));
assert.strictEqual(tech.ink,'#0a0e17');assert.strictEqual(tech.chalk,classic.chalk,'text colours are untouched');
assert.strictEqual(worse.length,0,'text that got harder to read:\n'+worse.join('\n'));
assert(minTech>=4.5,'body, accent and status colours stay at WCAG AA (4.5:1): lowest is '+minTech.toFixed(2)+' '+minPair);
const lowDim=rows.filter(r=>r[0].startsWith('dim')).map(r=>r[0]+' '+r[1]+'->'+r[2]);
console.log('ok   no text colour is harder to read in the tech theme than in the classic one (28 pairs checked)');
console.log('ok   chalk, accent, good, miss, warn stay above WCAG AA (4.5:1) on every surface; lowest is '+minTech.toFixed(2)+' = '+minPair);
console.log('ok   the muted "dim" text now reaches WCAG AA on every tech surface (classic -> tech): '+lowDim.join(', '));
console.log('\n2 passed');
