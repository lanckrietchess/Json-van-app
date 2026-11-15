// 9.45.0: the pure parts of the Studio scenes (LC79) and the in-app funnel (LC85). Run: node tests/lc85_unit.test.js (needs `npm install` in tests/).
const fs=require('fs'),path=require('path');const {Chess}=require('chess.js');global.Chess=Chess;
global.Store={m:{},get(k,d){return k in this.m?this.m[k]:d},set(k,v){this.m[k]=v}};global.toast=()=>{};
global.window=global;global.location={hash:"",host:"lanckrietchesstrainerhub.vercel.app",origin:"https://lanckrietchesstrainerhub.vercel.app"};global.document={querySelector:()=>null,querySelectorAll:()=>[]};
const load=(f,n)=>{const src=fs.readFileSync(path.join(__dirname,'..',f),'utf8');return new Function(src.replace('/*@@module '+n+'*/','').replace('/*@@end '+n+'*/','')+';return '+n.toUpperCase()+';')()};
const LC79=load('lc79.js','lc79'),LC85=load('lc85.js','lc85'),LC86=load('lc86.js','lc86');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+m)};
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
// srcRect: no transform = centre crop of a 16:9 source into a square
let r=LC79.srcRect(1600,900,1,{});ok(near(r.sw,900)&&near(r.sh,900)&&near(r.sx,350)&&near(r.sy,0),'1:1 from 16:9, centred');
// zoom 2x halves the window, still centred
r=LC79.srcRect(1600,900,1,{z:2});ok(near(r.sw,450)&&near(r.sx,575)&&near(r.sy,225),'zoom 2x');
// pan to the far left / right edge of the cropped area
r=LC79.srcRect(1600,900,1,{px:-1});ok(near(r.sx,0),'pan left reaches the edge');
r=LC79.srcRect(1600,900,1,{px:1});ok(near(r.sx+r.sw,1600),'pan right reaches the edge');
// crop: the window never leaves the cropped area
r=LC79.srcRect(1000,1000,1,{l:.2,r:.1,t:.3,b:0,px:-1,py:1});ok(r.sx>=200-1e-6&&r.sx+r.sw<=900+1e-6&&r.sy>=300-1e-6&&r.sy+r.sh<=1000+1e-6,'crop keeps the window inside (got '+JSON.stringify(r)+')');
// free (non-square) crop: a tall target out of a wide source
r=LC79.srcRect(1920,1080,9/16,{l:.1,r:.1});ok(near(r.sh,1080)&&near(r.sw,1080*9/16),'9:16 out of a cropped 16:9');
// limits: crop over 45% and silly zooms are clamped
r=LC79.srcRect(100,100,1,{l:.9,z:99});ok(r.cw>=10-1e-6&&r.sw>=r.cw/12-1e-6,'clamped crop and zoom');
// scenes: split and bubble in portrait and landscape
let R=LC79.sceneRects('split',9/16);ok(R.inp.h===.6&&R.cam.y===.6&&R.cam.h===.4,'split portrait: input on top, camera under');
R=LC79.sceneRects('split',16/9);ok(R.inp.w===.64&&R.cam.x===.64,'split landscape: input left, camera right');
R=LC79.sceneRects('pip',9/16);ok(R.inp.w===1&&R.inp.h===1&&R.cam.x+R.cam.w<1&&R.cam.y+R.cam.h<1,'bubble: input fills the stage, camera inside');
ok(near(R.cam.h,R.cam.w*9/16),'bubble camera is round (square in pixels)');
ok(LC79.sceneRects('classic',1).inp===null,'classic has no input block');
// the board inside the block: square in pixels, inside the block, size and pan
const A=9/16,inp={x:0,y:0,w:1,h:.6};let b=LC79.boardIn(inp,A,{});ok(near(b.w*A,b.h)&&b.x>=0&&b.x+b.w<=1+1e-9&&b.y+b.h<=.6+1e-9,'board fills the block as a square');
b=LC79.boardIn(inp,A,{bs:.5,px:1,py:1});ok(near(b.h,.28125)&&near(b.x+b.w,1)&&near(b.y+b.h,.6),'half size, pushed to the bottom right corner');
// grace period
ok(LC85._t.inGrace(0,1,3)&&LC85._t.inGrace(0,2.9*864e5,3)&&!LC85._t.inGrace(0,3*864e5,3)&&!LC85._t.inGrace(0,1,0),'grace: on for 3 days, off at 0');
ok(JSON.stringify(LC85.cleanCfg({graceDays:'40',fbOn:true,x:1}))==='{"graceDays":30,"fbOn":true}'&&JSON.stringify(LC85.cleanCfg([]))==='{}','settings are cleaned');
ok(LC85._t.NOFB.test('admin')&&LC85._t.NOFB.test('studio')&&!LC85._t.NOFB.test('trim'),'no 💬 on admin and Studio pages');
ok(/See how Anna rated the Opening trainer/.test(LC85._t.quoteHTML({who:'Anna',stars:5,text:'Great',feature:'openings',same:true},'the Opening trainer')),'social proof line names the member and the feature');
ok(!/<script/.test(LC85._t.quoteHTML({who:'<script>',stars:5,text:'<script>x</script>'},'x')),'quotes are escaped');
// 9.46.0 LC86: the Wall of Love items and initials
const ci=LC86._t.cleanItems([{t:'img',url:'https://a.b/c.png',cap:'<x>'},{t:'img',url:'http://a.b/c.png'},{t:'msg',from:'coach',text:'  Hi  '},{t:'msg',text:''},{t:'x'},null]);
ok(JSON.stringify(ci)==='[{"t":"img","url":"https://a.b/c.png","cap":"x"},{"t":"msg","from":"coach","text":"Hi"}]','wall items: only https screenshots and real chat lines, no angle brackets');
ok(LC86._t.cleanItems(Array(40).fill({t:'msg',text:'a'})).length===24,'wall items: at most 24');
ok(LC86._t.initials('Igor P.')==='IP'&&LC86._t.initials('mathijs')==='M'&&LC86._t.initials('')==='?','initials');
ok(!/<script/.test(LC86._t.avatarHTML({name:'<script>',avatar:'javascript:x'})),'avatar HTML is escaped and only https');
console.log('RESULT '+pass+' passed '+fail+' failed');process.exit(fail?1:0);
