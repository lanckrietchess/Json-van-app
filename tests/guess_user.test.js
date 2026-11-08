
const App={profile:{name:'Kyenzo',chess_com_username:'KyenzoCC',lichess_username:'kyenzoLI'}};
const Elo={acct:k=>k==='chesscom'?{user:'LinkedName'}:null};
function guessUser(h){const names=[App.profile.name,App.profile.chess_com_username,App.profile.lichess_username].concat((()=>{try{return["chesscom","lichess"].map(k=>{const a=Elo.acct(k);return a&&a.user})}catch(e){return[]}})()).map(x=>String(x||"").trim().toLowerCase()).filter(Boolean);const bl=String(h.Black||"").toLowerCase(),wh=String(h.White||"").toLowerCase();if(names.indexOf(bl)>=0)return"b";if(names.indexOf(wh)>=0)return"w";return/^(you|me)$/i.test(h.Black||"")?"b":"w"}
const t=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
t('chess.com name as Black',guessUser({White:'rival',Black:'kyenzocc'})==='b');
t('lichess name as White',guessUser({White:'KYENZOLI',Black:'rival'})==='w');
t('linked Elo account as Black',guessUser({White:'x',Black:'LinkedName'})==='b');
t('profile name still works',guessUser({White:'Kyenzo',Black:'x'})==='w');
t('unknown players default to White like before',guessUser({White:'a',Black:'b'})==='w');
t('"me" as Black still works',guessUser({White:'a',Black:'Me'})==='b');
