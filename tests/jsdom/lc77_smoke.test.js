// 9.38.3: e-books as PDF (upload, save, publish), the Course builder, the Books Vault copy, the Preview pill.
module.exports=async(w,errs)=>{
  const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);const ev=s=>w.eval(s);const wait=ms=>new Promise(x=>setTimeout(x,ms));
  ok('LC77 defined, no init errors, no in-app editor any more',ev('typeof LC77!=="undefined"&&typeof LC77.editor==="undefined"')&&!errs.some(e=>/lc77|LC77/.test(e)));
  ev(`LC26.sync.session=()=>({email:"lanckrietchess@gmail.com"});LC26.sync.token=async()=>"tok";LC26.sync.cfg=()=>({url:"https://x.supabase.co",key:"anon"});window.__saved=[];window.__up=[];
    LC26.sync.http=async(path,o)=>{const b=JSON.parse(o.body||"{}");
      if(/lc70_admin_get/.test(path))return{status:200,data:{ok:true,item:{id:"bp",kind:"book",status:"draft",title:"The 2000+ Blueprint",blurb:"",cover:"",ebook_url:"",tokens:100,pro_included:true,videos:[{title:"Intro",url:"https://youtu.be/abcdefghijk",folder:"Module 1"}]}}};
      if(/lc70_admin_upsert/.test(path)){window.__saved.push(b);return{status:200,data:{ok:true,id:"bp"}}}
      return{status:200,data:{ok:true}}};
    window.fetch=async(u,o)=>{window.__up.push([u,o&&o.headers&&o.headers["Content-Type"]]);return{ok:true,status:200,json:async()=>({})}};`);
  const pdf=new w.File(["%PDF-1.4 test"],"blueprint.pdf",{type:"application/pdf"});
  const u=await ev('LC77.uploadPdf')(pdf,"bp");
  ok('PDF upload goes to the lc78-books bucket and gives a public https link',/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/lc78-books\/bp\/.+\.pdf$/.test(u.url||"")&&w.__up.some(x=>/object\/lc78-books\//.test(x[0])&&x[1]==="application/pdf"));
  const bad=await ev('LC77.uploadPdf')(new w.File(["x"],"book.docx",{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),"bp");
  ok('a Word file is refused with a clear message',/not a PDF/.test(bad.error||""));
  await ev('LC77.pdf("bp")');await wait(200);
  const sh=w.document.querySelector('.lc77-sheet');ok('E-book (PDF) sheet: upload, link, read in the app, publish',!!sh&&!!sh.querySelector('[data-lc77-pdf]')&&!!sh.querySelector('[data-lc77-try]')&&!!sh.querySelector('[data-lc77-pub]'));
  sh.querySelector('[name="ebook_url"]').value='https://x.supabase.co/storage/v1/object/public/lc78-books/bp/a.pdf';
  sh.querySelector('[data-lc77-pdfform]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(300);
  ok('the PDF address is saved on the item',w.__saved.some(x=>x.p&&x.p.ebook_url==='https://x.supabase.co/storage/v1/object/public/lc78-books/bp/a.pdf'));
  w.document.querySelectorAll('.sheet-wrap').forEach(x=>x.remove());
  await ev('LC77.builder("bp")');await wait(200);
  const cb=w.document.querySelector('#lc77-cb');
  ok('Course builder: token lock, modules, YouTube thumbnail',!!cb&&!!cb.querySelector('[data-cbf="tokens"]')&&!!cb.querySelector('img.lc77-th[src*="abcdefghijk"]'));
  cb.querySelector('[data-cb="add"]').click();await wait(50);const urls=w.document.querySelectorAll('#lc77-cb [data-lf="url"]');
  urls[1].value='https://youtu.be/zyxwvutsrqp';urls[1].dispatchEvent(new w.Event('change',{bubbles:true}));await wait(1200);
  ok('a new YouTube lesson is saved into the course',w.__saved.some(x=>JSON.stringify(x.p.videos||[]).includes('zyxwvutsrqp')));
  w.document.querySelector('#lc77-cb [data-cb="close"]').click();await wait(200);
  const src=w.document.documentElement.innerHTML;
  ok('Books Vault: no "lazy school" wording',!/lazy school|Puzzle Addicts|Us vs\. the lazy/i.test(src));
  ok('no written-book calls left in the reader',!/lc77_doc_get|lc77_doc_meta/.test(src));
};
