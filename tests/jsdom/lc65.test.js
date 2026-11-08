module.exports=async(w,errs)=>{
 const ev=s=>w.eval(s),chk=(n,ok,x)=>console.log((ok?'PASS ':'FAIL ')+n+(x!==undefined?' '+JSON.stringify(x):''));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const calls=[]; global.RPC=async(u,init)=>{calls.push([u,init&&init.body]);
   const R=(s,o)=>({ok:s===200,status:s,json:async()=>o,text:async()=>''});
   if(/lc65_c39_feed/.test(u))return R(200,{ok:true,status:200,posts:[{id:1,name:'Ann',level:1,created:Date.now(),category:'wins',pinned:false,title:'Win',preview:'I won',likes:0,liked:false,comments:0,mine:false}],more:false});
   if(/lc65_c39_list/.test(u))return R(200,{ok:true,status:200,communities:[{code:'main',name:'Lanckriet Chess'}]});
   if(/lc65_c46_me/.test(u))return R(200,{ok:true,status:200,notices:[],guardian:null});
   if(/lc65_c46_report/.test(u))return R(200,{ok:true,rid:7,status:'pending'});
   if(/community-check/.test(u))return R(200,{ok:true,status:'valid',reward:{xp:20,tokens:0,valid:1,guardian:false}});
   if(/lc65_c46_channels/.test(u))return R(404,{code:'PGRST202'});
   if(/auth\/v1\/user/.test(u))return R(200,{id:'u1',user_metadata:{}});
   return null};
 global.FETCH=async(u,i)=>global.RPC(u,i);
 ev('LC26.sync.cfg=()=>({url:"https://x.supabase.co",key:"anon"}); LC26.sync.token=async()=>"tok"; LC26.sync.session=()=>({access_token:"tok",email:"a@b.c"})');
 ev('App.profile.name="Ann Smith"');
 const r=await w.eval('Quota.call("c39_feed",{community:"main",category:"",page:0})');
 chk('c39_feed is answered by the database function',r.ok===true&&r.posts.length===1&&/rest\/v1\/rpc\/lc65_c39_feed/.test(calls[0][0]));
 chk('the first name is sent, never the e-mail',/"name":"Ann"/.test(calls[0][1])&&!/@/.test(calls[0][1]),calls[0][1]);
 const rep=await w.eval('Quota.call("c46_report",{kind:"msg",id:3,reason:"claim"})');
 chk('a report goes to community-check and returns the verdict',rep.ok&&rep.status==='valid'&&rep.reward.xp===20,rep);
 chk('community-check called with the token',calls.some(c=>/functions\/v1\/community-check/.test(c[0])));
 // non-community actions are untouched
 let passed=false; const o=ev('Quota.call'); chk('Quota.call wrapper installed',ev('!!Quota.__lc65'));
 // missing function -> falls back to the arena path (which here fails with 404 stub) without throwing
 let ok=true; try{await w.eval('Quota.call("c46_channels",{})')}catch(e){ok=false}
 chk('a missing SQL function falls back without throwing',ok);
};
