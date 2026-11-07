const LC55=(()=>{
  "use strict";
  /* LC55 (build 9.29.0): moving a piece on a phone never scrolls the page.
     Cause (read in chessboard.js 1.0.0, which the app loads from cdnjs): while a piece is dragged, chessboard.js stops the page from scrolling
     with evt.preventDefault() inside a touchmove handler that jQuery registers on window. Chrome and Safari treat touchmove listeners on
     window / document / body as PASSIVE unless asked otherwise, so that preventDefault is ignored: the page scrolls (or pulls to refresh)
     under the finger while a piece is in the air.
     Fix: ONE native, non-passive touchmove listener (capture phase) that cancels the gesture ONLY while chessboard.js has a piece in the air.
     chessboard.js shows its dragged piece as an <img class="piece-417db"> that is a direct child of <body> and hidden (display:none) the rest of
     the time, so "in the air" = such an image is visible. Everything else is untouched: a swipe that starts on the page, a tap, a swipe over
     a display-only board, the Studio and every other touch handler keep working exactly as before.
     Also: no long-press image menu / text selection on a piece (iOS "touch callout"). */
  let on=false,blocked=0;
  const CSS=".board-b72b1 img.piece-417db,body>img.piece-417db{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}";
  function dragging(){
    try{
      const list=document.querySelectorAll("body>img.piece-417db");
      for(let i=0;i<list.length;i++)if(list[i].style.display!=="none")return true;
    }catch(e){}
    return false;
  }
  function guard(e){
    if(!e||!e.cancelable)return;
    if(dragging()){e.preventDefault();blocked++}
  }
  function init(){
    if(on)return;on=true;
    try{
      const st=document.createElement("style");st.id="lc55-css";st.textContent=CSS;
      (document.head||document.documentElement).appendChild(st);
    }catch(e){}
    try{document.addEventListener("touchmove",guard,{passive:false,capture:true})}catch(e){}
  }
  return{init:init,dragging:dragging,guard:guard,stats:()=>({on:on,blocked:blocked}),version:"9.29.0"};
})();
