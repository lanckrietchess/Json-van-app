const fs=require('fs');const src=fs.readFileSync(__dirname+'/mkrec_new.js','utf8');
let now=0;const t_=()=>now;const clean=t=>String(t).trim();const toast=()=>{};
const live={rec:null,lines:[],openIdx:-1,openStart:0,want:true,errShown:false,lastEnd:0,gen:1,pend:null};
const Rec={state:'recording'};let created=[];
class SR{constructor(){created.push(this);this.started=0}start(){this.started++}stop(){}}
const SRC=()=>SR,S=()=>({lang:'en-US'});
const fn=new Function('live','t_','clean','toast','Rec','SRC','S',src+';return{mkRec,flushPend}');
const {mkRec,flushPend}=fn(live,t_,clean,toast,Rec,SRC,S);
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FAIL',n))};
const r=mkRec();
// interim only, then the session ends (silence / stop): the text must survive
now=3;r.onresult({resultIndex:0,results:[Object.assign([{transcript:'the knight is loose'}],{isFinal:false})]});
t('interim is kept as pending',live.pend&&live.pend.t==='the knight is loose');
now=6;r.onend();
t('onend flushes the interim text as a caption line',live.lines.length===1&&live.lines[0].t==='the knight is loose',live.lines);
// final result clears pending and adds one line
now=8;r.onresult({resultIndex:0,results:[Object.assign([{transcript:'check their threat first'}],{isFinal:true})]});
t('final adds exactly one more line',live.lines.length===2&&live.pend===null);
// restart after onend is delayed, not synchronous
const before=created[0].started; r.onend(); t('restart is delayed',created[0].started===before);
// a restarted session resets the index
live.openIdx=5;r.onstart();t('onstart resets the result index',live.openIdx===-1);
// stale generation is ignored
live.gen=2;r.onresult({resultIndex:0,results:[Object.assign([{transcript:'old'}],{isFinal:true})]});t('old session results ignored',live.lines.length===2);
console.log(ok+' passed, '+bad+' failed');process.exit(bad?1:0);
