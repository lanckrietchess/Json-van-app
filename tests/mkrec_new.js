function flushPend(){const p=live.pend;live.pend=null;if(!p||!p.t)return;const s0=Math.max(live.lastEnd,p.s-.7),e0=Math.max(s0+.8,t_()-.2);live.lines.push({s:+s0.toFixed(2),e:+e0.toFixed(2),t:p.t});live.lastEnd=e0}
  function mkRec(){
    const R=SRC();if(!R)return null;
    const r=new R();r.continuous=true;r.interimResults=true;r.lang=S().lang;r.maxAlternatives=1;
    const gen=live.gen;
    r.onstart=()=>{if(gen===live.gen)live.openIdx=-1};
    r.onresult=e=>{
      if(gen!==live.gen)return;
      for(let i=e.resultIndex;i<e.results.length;i++){
        const res=e.results[i],txt=clean(res[0]&&res[0].transcript);if(!txt)continue;
        if(live.openIdx!==i){live.openIdx=i;live.openStart=t_()}
        if(res.isFinal){live.pend=null;const s=Math.max(live.lastEnd,live.openStart-.7),e2=Math.max(s+.8,t_()-.45);live.lines.push({s:+s.toFixed(2),e:+e2.toFixed(2),t:txt});live.lastEnd=e2;live.openIdx=-1}
        else live.pend={t:txt,s:live.openStart};
      }
    };
    r.onerror=e=>{
      const code=e&&e.error;
      if(code==="no-speech"||code==="aborted")return;
      if(!live.errShown){live.errShown=true;toast(code==="not-allowed"||code==="service-not-allowed"?"Live captions are blocked: allow the microphone and speech service for this site. Recording continues. You can still make captions from your script.":code==="audio-capture"?"The browser could not share the microphone with the speech service. Recording continues. Use the captions from your script, or try Chrome on a computer.":code==="network"?"The speech service needs an internet connection. Recording continues. You can still make captions from your script.":"Live captions stopped ("+(code||"error")+"). Recording continues. You can still make captions from your script.","err",6500)}
      if(code==="not-allowed"||code==="service-not-allowed"||code==="language-not-supported")live.want=false;
    };
    r.onend=()=>{if(gen!==live.gen)return;flushPend();if(live.want&&Rec.state==="recording")setTimeout(()=>{if(gen===live.gen&&live.want&&Rec.state==="recording"){try{r.start()}catch(e){}}},200)};
    return r;
  }
  