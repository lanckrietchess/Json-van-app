/* The app must be all English. Static guard over the shipped files. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const find=(...c)=>c.map(f=>path.join(__dirname,...f)).find(f=>fs.existsSync(f));
const html=fs.readFileSync(find(['..','index.html'],['..','..','index.html']),'utf8');
let n=0;const t=(name,fn)=>{try{fn();n++;console.log('ok  ',name)}catch(e){console.log('FAIL',name,'\n     ',e.message);process.exitCode=1}};
/* Dutch words that are NOT English words, so one hit is meaningful (two distinct hits in one string flags it) */
const STRONG=new Set('niet zijn wordt worden maar ook deze jouw jij wij onze hebben heeft kunnen moet willen geen zich omdat toch zeer nieuwe speel schaak stukken beurt gebruiker wachtwoord opslaan verwijderen annuleren volgende vorige sluiten openen instellingen gegevens leren oefenen mijn'.split(' '));
const dutchHits=s=>{const w=new Set((s.toLowerCase().match(/[a-z\u00e0-\u00ff]+/g)||[]).filter(x=>STRONG.has(x)));return[...w]};
const strings=o=>{const out=[];(function walk(x){if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk);else if(typeof x==='string'&&x.length>=12)out.push(x)})(o);return out};

t('dates and times never use the phone\u2019s locale: every toLocale call names an English locale',()=>{
  const bad=[...html.matchAll(/toLocale(?:Date|Time)?String\(\s*(?:\)|\[\s*\])/g)].map(m=>html.slice(Math.max(0,m.index-40),m.index+60).replace(/\n/g,' '));
  assert.deepStrictEqual(bad,[],'locale-less calls:\n'+bad.join('\n'));
  const named=[...html.matchAll(/toLocale(?:Date|Time)?String\(\s*"([a-zA-Z-]+)"/g)].map(m=>m[1]);assert(named.length>=10);
  assert(named.every(l=>/^en(-[A-Z]{2})?$/.test(l)),'a non-English locale is named: '+[...new Set(named.filter(l=>!/^en(-[A-Z]{2})?$/.test(l)))]);
  assert(!/new Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat)\(\s*(?:\)|undefined|navigator)/.test(html),'Intl without an English locale');
});
t('the page declares English and asks browsers not to offer translation',()=>{
  assert(/<html lang="en" translate="no">/.test(html));assert(/<meta name="google" content="notranslate">/.test(html));
  const m=JSON.parse(fs.readFileSync(find(['..','manifest.webmanifest'],['..','..','manifest.webmanifest']),'utf8'));assert.strictEqual(m.lang,'en');
});
t('the Dutch/French regulator name is gone from the privacy text (the one remaining mention is the removal rule itself)',()=>{
  assert.strictEqual((html.match(/Gegevensbeschermingsautoriteit/g)||[]).length,1,'only inside LC25.english.fix');
  assert(/LC25\.english|english\.fix/.test(html)&&/\(www\.dataprotectionauthority\.be\)/.test(html),'the default privacy text now names only the English authority and its URL');
});
t('my own code and styles contain no Dutch strings',()=>{
  for(const f of [['..','src','v25','lc25.js'],['..','lc25.js']]){const p=find(f);if(!p)continue;
    const src=fs.readFileSync(p,'utf8');const bad=[];
    for(const m of src.matchAll(/"((?:[^"\\\n]|\\.){12,})"|'((?:[^'\\\n]|\\.){12,})'/g)){const s=m[1]||m[2];if(dutchHits(s).length>=2)bad.push(s.slice(0,80))}
    assert.deepStrictEqual(bad,[],'Dutch-looking strings: '+bad.join(' | '));break}
});
t('course content, generated notes and puzzle files contain no Dutch text',()=>{
  const files=[['/mnt/project/content.json'],[__dirname,'..','mspc-notes.json'],[__dirname,'..','puzzle-alts.json'],[__dirname,'..','..','mspc-notes.json']].map(a=>a.length===1?a[0]:path.join(...a)).filter(f=>fs.existsSync(f));
  assert(files.length>=1);
  for(const f of files){const bad=strings(JSON.parse(fs.readFileSync(f,'utf8'))).filter(s=>dutchHits(s).length>=2).map(s=>s.slice(0,80));assert.deepStrictEqual(bad,[],path.basename(f)+': '+bad.slice(0,3).join(' | '))}
});
t('the detector itself works (it flags real Dutch, passes English)',()=>{
  assert(dutchHits('Je moet je wachtwoord opslaan en niet vergeten, want het is mijn account.').length>=3);
  assert.strictEqual(dutchHits('Before every move, ask what your opponent threatens. Then check what your own move allows.').length,0);
  assert.strictEqual(dutchHits('Play the move: want to win? door the knight on heel e5.').length,0,'English words that look Dutch are not in the list');
});
console.log('\n'+n+' passed');
