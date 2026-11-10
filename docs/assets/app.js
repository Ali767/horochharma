/* Swedish pronunciation lessons engine — ICDL for All / ali-saleem.com
   Each lesson page calls LESSON({...}) with its data. */
(function(){
"use strict";
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=(a,n)=>shuffle(a).slice(0,n);
const fmt=t=>{t=Math.max(0,t||0);return (t/60|0)+":"+String(t%60|0).padStart(2,"0")};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s).replace(/[{}]/g,"");
const normW=s=>s.toLowerCase().replace(/[.,:;!?”“"«»–—()¿¡]/g," ").replace(/\s+/g," ").trim();
const words=s=>normW(s).split(" ").filter(Boolean);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const VOWELS=["a","e","i","o","u","y","å","ä","ö"];
const CONFUSE={a:["å","ä","e"],e:["ä","i","ö"],i:["e","y","ä"],o:["å","u","ö"],u:["o","y","ö"],y:["u","i","ö"],"å":["o","a","u"],"ä":["e","a","ö"],"ö":["ä","e","y"]};

/* vowel/spelling highlight: {x} marks the sound letter(s) */
function hl(raw,k){
  return esc(raw).replace(/\{([^}]+)\}((?:ck|([bdfgjklmnprstv])\3)?)/g,(m,v,d)=>{
    const c=k==="L"?"vL":k==="S"?"vS":"vM";
    return `<span class="${c}">${v}</span>`+(d&&k==="S"?`<span class="dbl">${d}</span>`:d);
  });
}
const trHtml=t=>t?esc(t).replace(/\[([^\]]+)\]/g,'<span class="vc">$1</span>'):"";

/* mouth shapes (lips seen from the front) */
const MOUTH={
  open:{rx:30,ry:22,ar:"فم مفتوح واسع"},
  half:{rx:32,ry:13,ar:"فم نصف مفتوح"},
  spread:{rx:40,ry:7,ar:"شفاه ممدودة كالابتسامة"},
  smile:{rx:44,ry:5,ar:"ابتسامة مشدودة"},
  round:{rx:18,ry:16,ar:"شفاه مدوّرة"},
  tight:{rx:10,ry:10,ar:"شفاه مضمومة بقوة (كالصفير)"},
  pout:{rx:13,ry:8,ar:"شفاه مضمومة ومشدودة للأمام"},
  oval:{rx:22,ry:20,ar:"شفاه مدوّرة مفتوحة"}
};
function mouthSvg(k){
  const m=MOUTH[k]||MOUTH.half;
  return `<svg viewBox="0 0 110 70" aria-hidden="true"><ellipse cx="55" cy="35" rx="${m.rx+9}" ry="${m.ry+8}" fill="#d9776f"/><ellipse cx="55" cy="35" rx="${m.rx}" ry="${m.ry}" fill="#3b1a1a"/>${m.ry>9?`<rect x="${55-m.rx*.6}" y="${35-m.ry}" width="${m.rx*1.2}" height="${Math.min(6,m.ry*.35)}" rx="2" fill="#fff"/>`:""}</svg>`;
}

window.LESSON=function(L){
  const ALL=window.LESSONS||[];
  /* ---------- flatten ---------- */
  const IT=[];
  L.g.forEach((g,gi)=>g.it.forEach(x=>{
    const raw=x[2], sv=clean(raw), sent=g.k==="M"||words(sv).length>=3;
    IT.push({id:IT.length,gi,k:x[5]||g.k,s:x[0],e:x[1],raw,sv,ar:x[3]||"",tr:x[4]||"",sent,
      marks:[...raw.matchAll(/\{([^}]+)\}/g)].map(m=>m[1].toLowerCase())});
  }));
  const IX=IT.filter(x=>x.k!=="X"), W=IX.filter(x=>!x.sent), M=IX.filter(x=>x.sent);
  const LS=W.filter(x=>x.k==="L"||x.k==="S");
  const hasLen=LS.some(x=>x.k==="L")&&LS.some(x=>x.k==="S");
  const MARKED=W.filter(x=>x.marks.length===1);
  const markSet=[...new Set(MARKED.map(x=>x.marks[0]))];
  const pairs=(L.pairs||[]).map(p=>p.map(w=>IT.find(x=>x.sv.toLowerCase()===w.toLowerCase())).filter(Boolean)).filter(p=>p.length===2);
  const partner=it=>{for(const p of pairs){if(p[0]===it)return p[1];if(p[1]===it)return p[0]}return null};
  const idx=ALL.findIndex(x=>x.n===L.n), prev=ALL[idx-1], next=ALL[idx+1];
  store.set("svp:seen:"+L.n,"1");

  /* ---------- page ---------- */
  const app=$("#app");
  const tabs=[["learn","💡 كيف أنطق؟"],["listen","🦜 اسمع وكرّر"],["write","✍️ الإملاء"],["speak","🗣️ النطق"],["play","🎮 الألعاب"],["exam","🎯 الاختبار"]];
  app.innerHTML=`
  <div class="player">
    <div class="prow">
      <button class="big" id="pp" aria-label="تشغيل الدرس كاملًا">▶</button>
      <div class="bar" id="bar"><i id="fill"></i></div>
      <div class="time" id="time">0:00 / 0:00</div>
    </div>
    <div class="prow" style="margin-top:8px">
      <span class="note">السرعة:</span>
      <button class="chip" data-rate="0.6">0.6×</button>
      <button class="chip" data-rate="0.8">0.8×</button>
      <button class="chip on" data-rate="1">1×</button>
      <button class="chip" id="loop">🔁 كرّر المقطع</button>
    </div>
  </div>
  <nav class="tabs" id="tabs">${tabs.map((t,i)=>`<button data-t="${t[0]}" class="${i?"":"on"}">${t[1]}</button>`).join("")}</nav>
  <section class="tab on" id="learn"></section>
  <section class="tab" id="listen"></section>
  <section class="tab" id="write"></section>
  <section class="tab" id="speak"></section>
  <section class="tab" id="play"></section>
  <section class="tab" id="exam"></section>
  <div class="pager">
    ${prev?`<a href="${pad(prev.n)}.html"><small>→ الدرس السابق ${prev.n}</small><b>${esc(prev.sv)}</b></a>`:`<a href="../index.html"><small>→ كل الدروس</small><b>Uttal</b></a>`}
    ${next?`<a class="nx" href="${pad(next.n)}.html"><small>الدرس التالي ${next.n} ←</small><b>${esc(next.sv)}</b></a>`:`<a class="nx" href="../index.html"><small>كل الدروس ←</small><b>Uttal</b></a>`}
  </div>
  <footer>السويدية للمبتدئين · نطق الأحرف · <a href="../index.html">كل الدروس</a><br>التسجيلات الصوتية من مادة «Hör och härma» · Lycka till! 🍀</footer>`;
  function pad(n){return String(n).padStart(2,"0")}

  /* ---------- player ---------- */
  const au=$("#au"); let seg=null, loopOn=false, rate=1;
  function playSeg(s,e,r,onEnd){
    seg={s,e,onEnd}; au.currentTime=Math.max(0,s-0.08); au.playbackRate=r||rate;
    const p=au.play(); if(p&&p.catch)p.catch(()=>{}); requestAnimationFrame(tick);
  }
  const playIt=(it,r,cb)=>playSeg(it.s,it.e,r,cb);
  function tick(){
    if(!seg)return;
    if(au.currentTime>=seg.e+0.12){
      if(loopOn&&!seg.onEnd){au.currentTime=Math.max(0,seg.s-0.08)}
      else{const cb=seg.onEnd;seg=null;au.pause();if(cb)cb();return}
    }
    if(!au.paused||au.seeking||au.readyState<3)requestAnimationFrame(tick);
  }
  function stopAll(){seg=null;au.pause();if(parrot)parrot.stop()}
  $("#pp").onclick=()=>{if(au.paused){seg=null;au.playbackRate=rate;au.play().catch(()=>{})}else au.pause()};
  au.addEventListener("play",()=>{$("#pp").textContent="⏸";if(seg)requestAnimationFrame(tick)});
  au.addEventListener("pause",()=>$("#pp").textContent="▶");
  au.addEventListener("timeupdate",()=>{
    const t=au.currentTime;
    $("#fill").style.width=(au.duration?t/au.duration*100:0)+"%";
    $("#time").textContent=fmt(t)+" / "+fmt(au.duration);
    if(!seg&&!au.paused){const c=IT.find(x=>t>=x.s-0.1&&t<=x.e+0.4);$$(".it").forEach(el=>el.classList.toggle("cur",!!c&&+el.dataset.id===c.id))}
  });
  au.addEventListener("loadedmetadata",()=>$("#time").textContent="0:00 / "+fmt(au.duration));
  $("#bar").onclick=e=>{const r=e.currentTarget.getBoundingClientRect();if(au.duration){seg=null;au.currentTime=(e.clientX-r.left)/r.width*au.duration}};
  $$(".chip[data-rate]").forEach(b=>b.onclick=()=>{$$(".chip[data-rate]").forEach(x=>x.classList.remove("on"));b.classList.add("on");rate=+b.dataset.rate;au.playbackRate=rate});
  $("#loop").onclick=e=>{loopOn=!loopOn;e.currentTarget.classList.toggle("on",loopOn)};

  /* ---------- tabs ---------- */
  $$("#tabs button").forEach(b=>b.onclick=()=>goTab(b.dataset.t));
  function goTab(t){
    stopAll();
    $$("#tabs button").forEach(x=>x.classList.toggle("on",x.dataset.t===t));
    $$("section.tab").forEach(s=>s.classList.toggle("on",s.id===t));
    if(t==="exam"&&!exam.started)exam.intro();
    if(t==="play")gamesStart();
  }

  /* ---------- LEARN ---------- */
  (function(){
    const box=$("#learn"); let h="";
    if(L.intro)h+=`<div class="card"><p style="margin:0">${L.intro}</p></div>`;
    if(L.tips&&L.tips.length)h+=`<div class="card"><h3>كيف أنطق هذا الصوت؟</h3><div class="tips">${L.tips.map(t=>`<div class="tip"><div class="ic">${t[0]}</div><div>${t[1]}</div></div>`).join("")}</div></div>`;
    if(L.mouth&&L.mouth.length)h+=`<div class="card"><h3>شكل الشفتين</h3><div class="mouths">${L.mouth.map(m=>`<div class="mouth">${mouthSvg(m[1])}<b class="sv" style="text-align:center">${esc(m[0])}</b><span class="note">${m[2]||MOUTH[m[1]].ar}</span></div>`).join("")}</div></div>`;
    if(hasLen){
      const p=pairs.find(p=>p[0].k!==p[1].k)||[LS.find(x=>x.k==="L"),LS.find(x=>x.k==="S")];
      const [a,b]=p[0].k==="L"?p:[p[1],p[0]];
      h+=`<div class="card"><h3>القاعدة الذهبية: طويل أم قصير؟</h3>
      <div class="lenrule">
        <div class="lenbox L"><div class="w">${hl(a.raw,"L")}</div><div class="lenbar"></div><b>صوت طويل ━━</b><div class="note">بعده غالبًا <b>حرف ساكن واحد</b> أو لا شيء. مُدّ الصوت كأنه حرف مدّ في العربية.</div><button class="mini" data-pl="${a.id}">▶ اسمع</button></div>
        <div class="lenbox S"><div class="w">${hl(b.raw,"S")}</div><div class="lenbar"></div><b>صوت قصير •</b><div class="note">بعده غالبًا <b>حرفان ساكنان</b> (مثل tt أو ck). الصوت قصير والحرف بعده مشدَّد قليلًا مثل <b>الشدّة</b> في العربية.</div><button class="mini" data-pl="${b.id}">▶ اسمع</button></div>
      </div></div>`;
    }
    if(pairs.length&&!hasLen)h+=`<div class="card"><h3>قارن بين الكلمتين</h3><p class="note" style="margin-top:0">كل زوج يختلف في صوت واحد فقط، والمعنى يتغيّر كليًا. اسمع الكلمتين وراء بعض عدة مرات.</p><div class="pairs">${pairs.map((p,j)=>`<div class="pr"><div class="pc"><button class="mini sv" data-pl="${p[0].id}">▶ ${hl(p[0].raw,"W")}</button><span class="note">${esc(p[0].ar)}</span></div><div class="pc"><button class="mini sv" data-pl="${p[1].id}">▶ ${hl(p[1].raw,"W")}</button><span class="note">${esc(p[1].ar)}</span></div><button class="mini" data-pp="${j}" title="اسمع الاثنين" aria-label="اسمع الكلمتين">🔁</button></div>`).join("")}</div></div>`;
    h+=`<div class="card"><h3>كيف أتدرّب على هذا الدرس؟</h3><ol class="steps">
      <li><div><b>اسمع</b> كل كلمة من التسجيل الأصلي (اضغط عليها). استعمل السرعة 0.6× إن كان الصوت سريعًا.</div></li>
      <li><div><b>كرّر مع الببغاء 🦜</b>: يشغّل الكلمة ثم يعطيك وقتًا لتكرّرها بصوت عالٍ.</div></li>
      <li><div><b>اكتب</b> ما تسمعه في الإملاء لتربط الصوت بالحرف.</div></li>
      <li><div><b>انطق وسجّل</b> صوتك وقارنه بالأصل.</div></li>
      <li><div><b>العب</b> ثم <b>اختبر</b> نفسك. النتيجة تُحفظ في صفحة كل الدروس.</div></li></ol>
      <div class="legend" style="margin-top:12px"><span><span class="vL sv">a</span> صوت طويل</span><span><span class="vS sv">a</span><span class="dbl sv">tt</span> صوت قصير + حرف مشدّد</span><span class="tr">النطق التقريبي: <span class="vc">ö</span> = صوت لا يوجد في العربية، اسمعه من التسجيل</span></div></div>`;
    box.innerHTML=h;
    $$("[data-pl]",box).forEach(b=>b.onclick=()=>playIt(IT[+b.dataset.pl]));
    $$("[data-pp]",box).forEach(b=>b.onclick=()=>{const p=pairs[+b.dataset.pp];playIt(p[0],null,()=>setTimeout(()=>playIt(p[1]),400))});
  })();

  /* ---------- LISTEN & REPEAT ---------- */
  let parrot=null, gamesStart=()=>{};
  (function(){
    const box=$("#listen");
    const kindTag={L:["صوت طويل ━━","L"],S:["صوت قصير •","S"],M:["جمل","M"],W:["كلمات","M"]};
    box.innerHTML=`
    <div class="card">
      <div class="parrot">
        <button class="btn y" id="prGo">🦜 ابدأ: اسمع وكرّر</button>
        <label class="note">المجموعة: <select id="prSet" style="font:inherit">${`<option value="all">الكل</option>`+L.g.map((g,i)=>`<option value="${i}">${esc(g.ar||g.sv)}</option>`).join("")}</select></label>
        <label class="note">التكرار: <select id="prRep" style="font:inherit"><option>1</option><option selected>2</option><option>3</option></select></label>
        <svg class="ring" viewBox="0 0 40 40" id="prRing" style="display:none"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" id="prArc" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg>
        <span class="state" id="prState"></span>
      </div>
      <p class="note" style="margin:8px 0 0">الببغاء يشغّل كل كلمة من التسجيل الأصلي ثم يسكت لتكرّرها أنت بصوت عالٍ. لا تقرأ فقط، قلّد اللحن والطول.</p>
    </div>
    <div class="row" style="margin-bottom:6px">
      <button class="chip on" id="tAr">المعنى بالعربي</button>
      <button class="chip on" id="tTr">النطق التقريبي</button>
      <button class="chip" id="tSv">استماع فقط (إخفاء الكتابة)</button>
    </div>
    ${L.g.map((g,gi)=>{
      const kt=kindTag[g.k]||kindTag.W, its=IT.filter(x=>x.gi===gi), sents=its.every(x=>x.sent);
      return `<div class="ghead"><h3 class="sv" style="direction:ltr">${esc(g.sv||"")}</h3>${g.ar?`<span class="tag ${kt[1]}">${esc(g.ar)}</span>`:""}${g.t?`<button class="mini" data-gh="${gi}">▶ اسمع العنوان</button>`:""}</div>
      <div class="items${sents?" sents":""}">${its.map(x=>`<button class="it" data-id="${x.id}"><span class="w">${hl(x.raw,x.k)}</span>${x.tr?`<span class="tr">${trHtml(x.tr)}</span>`:""}${x.ar?`<span class="m">${esc(x.ar)}</span>`:""}</button>`).join("")}</div>`;
    }).join("")}`;
    $$(".it",box).forEach(el=>el.onclick=()=>{if(parrot)parrot.stop();$$(".it").forEach(x=>x.classList.toggle("cur",x===el));playIt(IT[+el.dataset.id])});
    $$("[data-gh]",box).forEach(b=>b.onclick=()=>{const g=L.g[+b.dataset.gh];playSeg(g.t[0],g.t[1])});
    const tog=(id,cls,inv)=>$(id).onclick=e=>{const on=document.body.classList.toggle(cls);e.currentTarget.classList.toggle("on",inv?on:!on)};
    tog("#tAr","hideAr");tog("#tTr","hideTr");tog("#tSv","hideSv",true);

    const arc=$("#prArc"), ring=$("#prRing"), st=$("#prState"), go=$("#prGo");
    go.onclick=()=>{
      if(parrot){parrot.stop();return}
      const set=$("#prSet").value, reps=+$("#prRep").value;
      const list=set==="all"?IT:IT.filter(x=>x.gi===+set);
      let i=0, r=0, timer=null, raf=null, alive=true;
      parrot={stop(){alive=false;clearTimeout(timer);cancelAnimationFrame(raf);seg=null;au.pause();ring.style.display="none";st.textContent="";go.textContent="🦜 ابدأ: اسمع وكرّر";$$(".it").forEach(x=>x.classList.remove("cur","turn"));parrot=null}};
      go.textContent="⏹ إيقاف";
      const step=()=>{
        if(!alive)return;
        if(i>=list.length){parrot.stop();st.textContent="👏 أحسنت! انتهت الجولة.";return}
        const it=list[i], el=$(`.it[data-id="${it.id}"]`);
        $$(".it").forEach(x=>x.classList.remove("cur","turn")); el.classList.add("cur");
        const rr=el.getBoundingClientRect(); if(rr.top<150||rr.bottom>innerHeight-30)el.scrollIntoView({behavior:"smooth",block:"center"});
        st.textContent="👂 اسمع…"; ring.style.display="none";
        playIt(it,null,()=>{
          if(!alive)return;
          el.classList.remove("cur"); el.classList.add("turn"); st.textContent="🗣️ دورك! كرّر الآن";
          const gap=Math.max(1.8,(it.e-it.s)/rate*1.7+1.1)*1000, t0=performance.now(); ring.style.display="";
          const anim=()=>{const p=Math.min(1,(performance.now()-t0)/gap);arc.setAttribute("stroke-dashoffset",String(100.5*p));if(p<1&&alive)raf=requestAnimationFrame(anim)};anim();
          timer=setTimeout(()=>{r++;if(r>=reps){r=0;i++}step()},gap);
        });
      };
      step();
    };
  })();

  /* ---------- char / word comparison ---------- */
  function lcsTable(a,b){const n=a.length,m=b.length,T=[...Array(n+1)].map(()=>new Int16Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)T[i][j]=a[i]===b[j]?T[i+1][j+1]+1:Math.max(T[i+1][j],T[i][j+1]);return T}
  function diff(target,got,show,unit){
    const t=unit==="c"?[...target]:target, g=unit==="c"?[...got]:got, T=lcsTable(t,g);
    let i=0,j=0,out=[];const J=unit==="c"?"":" ";
    while(i<t.length||j<g.length){
      if(i<t.length&&j<g.length&&t[i]===g[j]){out.push(`<span class="ok">${esc(t[i])}</span>`);i++;j++}
      else if(j<g.length&&(i>=t.length||T[i][j+1]>=T[i+1][j])){out.push(`<span class="bad">${esc(g[j])}</span>`);j++}
      else{out.push(`<span class="miss">${show?esc(t[i]):"_".repeat(unit==="c"?1:t[i].length)}</span>`);i++}
    }
    return {html:out.join(J),hits:T[0][0],n:t.length,m:g.length};
  }
  function compare(target,got,show){
    const tw=words(target), gw=words(got);
    if(tw.length===1){const a=tw[0]||"",b=gw.join(" ");const r=diff(a,b,show,"c");return {...r,correct:a===b,pct:Math.round(100*r.hits/Math.max(a.length,b.length,1))}}
    const r=diff(tw,gw,show,"w");return {...r,correct:r.hits===tw.length&&gw.length===tw.length,pct:Math.round(100*r.hits/Math.max(tw.length,gw.length,1))};
  }

  /* ---------- DICTATION ---------- */
  (function(){
    const box=$("#write"); const D=[...W,...M]; let di=0, score=0; const done=new Set();
    if(!D.length){box.innerHTML="";return}
    box.innerHTML=`<div class="card">
      <div class="row between"><b><span id="dKind">الكلمة</span> <span id="dN">1</span> من ${D.length}</b><span>النقاط: <span class="score" id="dScore">0</span></span></div>
      <p class="note">اسمع ثم اكتب ما تسمعه. لا يهم الحرف الكبير أو علامات الترقيم.</p>
      <div class="row" style="margin-bottom:10px"><button class="btn" id="dPlay">▶ استمع</button><button class="btn g" id="dSlow">🐢 ببطء</button><button class="btn g" id="dHint">💡 تلميح</button><button class="btn g" id="dRand">🔀 عشوائي</button></div>
      <div id="dHintBox" class="sv note" style="margin-bottom:8px;text-align:left"></div>
      <input class="dict" id="dIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Skriv här…" aria-label="اكتب ما تسمعه">
      <div class="row" style="margin-top:8px"><span class="note">حروف سويدية:</span><button class="mini sv" data-ch="å">å</button><button class="mini sv" data-ch="ä">ä</button><button class="mini sv" data-ch="ö">ö</button></div>
      <div class="row" style="margin-top:10px"><button class="btn y" id="dCheck">✔ تحقّق</button><button class="btn g" id="dShow">أظهر الجواب</button><button class="btn g" id="dPrev">→ السابق</button><button class="btn g" id="dNext">التالي ←</button></div>
      <div class="res" id="dRes"></div></div>`;
    const load=()=>{const x=D[di];$("#dN").textContent=di+1;$("#dKind").textContent=x.sent?"الجملة":"الكلمة";$("#dIn").value="";$("#dRes").innerHTML="";$("#dHintBox").textContent=""};
    const check=show=>{const x=D[di],r=compare(x.sv,$("#dIn").value,show);
      $("#dRes").innerHTML=r.html+(r.correct?`<div class="msg good" dir="rtl">👏 ممتاز! صحيح تمامًا.</div>`:show?`<div class="sv" style="color:var(--blue);margin-top:4px">${hl(x.raw,x.k)}</div>`:`<div class="msg no" dir="rtl">الأخضر صحيح · الأحمر زائد أو خطأ · الأصفر ناقص. استمع مرة أخرى وحاول.</div>`);
      if(r.correct&&!done.has(di)){done.add(di);score++;$("#dScore").textContent=score}};
    $("#dPlay").onclick=()=>playIt(D[di]); $("#dSlow").onclick=()=>playIt(D[di],0.6);
    $("#dHint").onclick=()=>{const x=D[di];$("#dHintBox").textContent=x.sv.split(" ").map(w=>w.replace(/^(\p{L})([\p{L}-]*)/u,(a,b,c)=>b+"·".repeat(c.length))).join("  ")};
    $("#dCheck").onclick=()=>check(false); $("#dShow").onclick=()=>check(true);
    $("#dIn").onkeydown=e=>{if(e.key==="Enter")check(false)};
    $("#dNext").onclick=()=>{di=(di+1)%D.length;load();playIt(D[di])};
    $("#dPrev").onclick=()=>{di=(di-1+D.length)%D.length;load();playIt(D[di])};
    $("#dRand").onclick=()=>{di=Math.random()*D.length|0;load();playIt(D[di])};
    $$("[data-ch]",box).forEach(b=>b.onclick=()=>{const el=$("#dIn"),p=el.selectionStart??el.value.length;el.value=el.value.slice(0,p)+b.dataset.ch+el.value.slice(el.selectionEnd??p);el.focus();el.setSelectionRange(p+1,p+1)});
    load();
  })();

  /* ---------- speech recognition ---------- */
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  function srErr(e){
    if(e==="not-allowed"||e==="service-not-allowed")return "الميكروفون غير مسموح. اسمح للصفحة باستخدام الميكروفون من شريط العنوان ثم جرّب مرة أخرى.";
    if(e==="no-speech")return "لم أسمع صوتًا. اقترب من الميكروفون وتكلّم بوضوح.";
    if(e==="network")return "التعرّف على الصوت يحتاج اتصالًا بالإنترنت.";
    if(e==="audio-capture")return "لا يوجد ميكروفون متصل.";
    return "تعذّر التعرّف على الصوت ("+e+").";
  }
  function listenSv(onState){
    return new Promise((res,rej)=>{
      if(!SR){rej("unsupported");return}
      const r=new SR();r.lang="sv-SE";r.interimResults=false;r.maxAlternatives=5;r.continuous=false;let done=false;
      r.onstart=()=>onState&&onState("listening");
      r.onresult=e=>{done=true;res([...e.results[0]].map(a=>a.transcript))};
      r.onerror=e=>{done=true;rej(e.error)};
      r.onend=()=>{if(!done)rej("no-speech")};
      try{r.start()}catch(err){rej("start")}
    });
  }
  function best(target,alts){let b=null;for(const a of alts){const r=compare(target,a,true);if(!b||r.pct>b.pct)b={...r,text:a}}return b}
  const pctColor=p=>p>=85?"var(--green)":p>=60?"var(--yellow-ink)":"var(--red)";
  const pctMsg=p=>p>=95?"🌟 نطق ممتاز!":p>=85?"👏 نطق جيد جدًا!":p>=60?"👍 قريب! اسمع الأصل مرة أخرى وانتبه للون الأصفر.":"💪 اسمع الأصل ببطء ثم حاول مرة أخرى.";
  function confusion(it,heard){
    const h=normW(heard); if(!h||h===normW(it.sv))return "";
    const other=IT.find(x=>x!==it&&normW(x.sv)===h);
    if(!other)return "";
    const why=it.k==="L"&&other.k==="S"?"صوتك خرج <b>قصيرًا</b>. مُدّ الحرف الصوتي أكثر.":it.k==="S"&&other.k==="L"?"صوتك خرج <b>طويلًا</b>. اجعله قصيرًا وشدّد الحرف الذي بعده.":"انتبه للفرق بين الصوتين واسمع الأصل.";
    return `<div class="warn" style="margin-top:10px">المتصفح سمع <b class="sv">${esc(other.sv)}</b> بدل <b class="sv">${esc(it.sv)}</b>. ${why}</div>`;
  }

  /* ---------- SPEAK ---------- */
  (function(){
    const box=$("#speak"); let mode=W.length?"w":"s", i=0; const scores={};
    const list=()=>mode==="w"?W:M;
    box.innerHTML=`${SR?"":`<div class="warn">⚠️ متصفحك لا يدعم التعرّف على الكلام. استخدم <b>Google Chrome</b> أو <b>Microsoft Edge</b>. ما زال بإمكانك تسجيل صوتك ومقارنته بالأصل.</div>`}
    <div class="card">
      <div class="row between">${W.length&&M.length?`<div class="segbtn"><button id="spW">كلمات</button><button id="spS">جُمل</button></div>`:"<span></span>"}<span>متوسط نطقك: <span class="score" id="spAvg">—</span></span></div>
      <div style="margin-top:10px"><b><span id="spLbl"></span> <span id="spN"></span> من <span id="spT"></span></b></div>
      <div class="target" id="spTarget"></div><div class="tr" id="spTr"></div><div class="note" id="spAr"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn g" id="spListen">▶ اسمع الأصل</button><button class="btn g" id="spSlow">🐢 ببطء</button>
        <button class="btn mic" id="spMic"${SR?"":" disabled"}>🎙️ انطق الآن</button>
        <button class="btn g" id="spRec">⏺ سجّل صوتي</button><button class="btn g" id="spMine" disabled>🔈 اسمع تسجيلي</button><button class="btn g" id="spBoth" disabled>🔁 الأصل ثم أنا</button>
      </div>
      <div class="note" id="spState" style="margin-top:8px"></div><div id="spOut"></div>
      <div class="row" style="margin-top:12px"><button class="btn g" id="spPrev">→ السابق</button><button class="btn g" id="spNext">التالي ←</button></div>
    </div>
    <p class="note">«انطق الآن» يحوّل كلامك إلى نص ويقارنه بالكلمة. «سجّل صوتي» يحفظ صوتك لتقارنه بنفسك مع التسجيل الأصلي (أفضل طريقة لسماع الفرق).</p>`;
    let myUrl=null, mr=null, chunks=[];
    const load=()=>{const l=list();i=(i+l.length)%l.length;const x=l[i];
      $("#spLbl").textContent=mode==="w"?"الكلمة":"الجملة";$("#spN").textContent=i+1;$("#spT").textContent=l.length;
      $("#spTarget").innerHTML=hl(x.raw,x.k);$("#spTr").innerHTML=trHtml(x.tr);$("#spAr").textContent=x.ar;$("#spOut").innerHTML="";
      $("#spState").textContent="اضغط «انطق الآن» ثم قل "+(mode==="w"?"الكلمة":"الجملة")+" بصوت واضح.";
      myUrl=null;$("#spMine").disabled=true;$("#spBoth").disabled=true;
      if($("#spW")){$("#spW").classList.toggle("on",mode==="w");$("#spS").classList.toggle("on",mode==="s")}};
    const avg=()=>{const v=Object.values(scores);$("#spAvg").textContent=v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length)+"% ("+v.length+")":"—"};
    if($("#spW")){$("#spW").onclick=()=>{mode="w";i=0;load()};$("#spS").onclick=()=>{mode="s";i=0;load()}}
    $("#spListen").onclick=()=>playIt(list()[i]); $("#spSlow").onclick=()=>playIt(list()[i],0.6);
    $("#spPrev").onclick=()=>{i--;load()}; $("#spNext").onclick=()=>{i++;load()};
    $("#spMic").onclick=async()=>{
      const x=list()[i], b=$("#spMic"); stopAll(); b.classList.add("rec"); b.textContent="🎙️ أستمع…";
      try{
        const alts=await listenSv(s=>{if(s==="listening")$("#spState").textContent="🔴 تكلّم الآن…"});
        const r=best(x.sv,alts); scores[mode+i]=r.pct; avg(); $("#spState").textContent="";
        $("#spOut").innerHTML=`<div class="big-pct" style="color:${pctColor(r.pct)}">${r.pct}%</div><div class="meter"><i style="width:${r.pct}%;background:${pctColor(r.pct)}"></i></div>
          <div class="msg" style="color:${pctColor(r.pct)}">${pctMsg(r.pct)}</div><div class="note" style="margin-top:8px">ما فهمه المتصفح من كلامك:</div><div class="heard">“${esc(r.text)}”</div>${confusion(x,r.text)}<div class="res">${r.html}</div>`;
      }catch(e){$("#spState").textContent=e==="unsupported"?"متصفحك لا يدعم التعرّف على الكلام.":srErr(e)}
      b.classList.remove("rec"); b.textContent="🎙️ انطق الآن";
    };
    $("#spRec").onclick=async()=>{
      const b=$("#spRec");
      if(mr&&mr.state==="recording"){mr.stop();return}
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        mr=new MediaRecorder(stream);chunks=[];
        mr.ondataavailable=e=>chunks.push(e.data);
        mr.onstop=()=>{stream.getTracks().forEach(t=>t.stop());myUrl=URL.createObjectURL(new Blob(chunks,{type:mr.mimeType}));$("#spMine").disabled=false;$("#spBoth").disabled=false;b.textContent="⏺ سجّل صوتي";b.classList.remove("mic","rec");$("#spState").textContent="✔ تم التسجيل. اضغط «الأصل ثم أنا» لتسمع الفرق."};
        stopAll(); mr.start(); b.textContent="⏹ أوقف التسجيل"; b.classList.add("mic","rec"); $("#spState").textContent="🔴 جارٍ التسجيل… قل الكلمة ثم اضغط «أوقف التسجيل».";
      }catch(e){$("#spState").textContent=srErr("not-allowed")}
    };
    $("#spMine").onclick=()=>{if(myUrl){stopAll();new Audio(myUrl).play()}};
    $("#spBoth").onclick=()=>{if(myUrl)playIt(list()[i],null,()=>setTimeout(()=>new Audio(myUrl).play(),350))};
    if(W.length||M.length)load(); else box.innerHTML="";
  })();

  /* ---------- question generators (games + exam) ---------- */
  function distract(it,pool,n){
    const out=[], p=partner(it); if(p&&pool.includes(p))out.push(p);
    const other=pool.filter(x=>x!==it&&!out.includes(x)&&normW(x.sv)!==normW(it.sv));
    const sameLen=other.filter(x=>Math.abs(x.sv.length-it.sv.length)<=2);
    for(const x of shuffle(sameLen).concat(shuffle(other))){if(out.length>=n)break;if(!out.includes(x)&&!out.some(o=>normW(o.sv)===normW(x.sv)))out.push(x)}
    return out.slice(0,n);
  }
  const Q={
    hear(){const pool=W.length>=4?W:IX;const it=pick(pool,1)[0];return {type:"👂 ماذا سمعت؟",it,ask:"اسمع ثم اختر ما سمعته",opts:shuffle([it,...distract(it,pool,3)]).map(x=>({label:hl(x.raw,"none").replace(/<[^>]+>/g,""),ok:x===it,sv:true})),explain:`${hl(it.raw,it.k)}${it.ar?" = "+esc(it.ar):""}`}},
    len(){const it=pick(LS,1)[0];return {type:"⏱️ طويل أم قصير؟",it,ask:"هل الصوت المميَّز في هذه الكلمة طويل أم قصير؟",opts:[{label:"━━ طويل",ok:it.k==="L",cls:"lenL"},{label:"• قصير",ok:it.k==="S",cls:"lenS"}],explain:`${hl(it.raw,it.k)} · ${it.k==="L"?"طويل: بعده حرف ساكن واحد.":"قصير: بعده حرفان ساكنان."}`}},
    vowel(){const it=pick(MARKED,1)[0], v=it.marks[0];
      let others=markSet.filter(x=>x!==v);
      const isV=VOWELS.includes(v), CONS=["p","b","t","d","k","g","f","v","s","l","m","n","r"];
      const fill=isV?(CONFUSE[v]||VOWELS).concat(VOWELS):(v.length===2&&v[0]===v[1]?CONS.map(c=>c+c):v.length>1?["sj","tj","sk","ng","rs","rt","g","k","j"]:CONS);
      if(others.length<3)others=others.concat((isV?fill:shuffle(fill)).filter(x=>x!==v&&!others.includes(x)));
      const shown=esc(it.raw).replace(/\{[^}]+\}/,`<span class="blank">${"_".repeat(v.length)}</span>`).replace(/[{}]/g,"");
      return {type:"🔡 الحرف الناقص",it,ask:`اسمع الكلمة واختر الحرف الناقص:<div class="q sv" style="font-size:1.8rem;text-align:center">${shown}</div>`,opts:shuffle([{label:v,ok:true,sv:true},...pick(others,3).map(x=>({label:x,ok:false,sv:true}))]),explain:hl(it.raw,it.k)}},
    meaning(){const pool=IX.filter(x=>x.ar&&!x.sent);const it=pick(pool,1)[0];return {type:"📖 المعنى",it,ask:`ما معنى <b class="sv">${esc(it.sv)}</b>؟`,opts:shuffle([it,...distract(it,pool.filter(x=>x.ar!==it.ar),3)]).map(x=>({label:esc(x.ar),ok:x===it})),explain:`${esc(it.sv)} = ${esc(it.ar)}`}}
  };
  const canQ={hear:()=>IX.length>=4,len:()=>hasLen,vowel:()=>MARKED.length>=3,meaning:()=>IX.filter(x=>x.ar&&!x.sent).length>=4};
  function renderMC(box,q,onDone,head){
    box.innerHTML=(head||"")+`<div class="q">${q.ask}</div><div class="row" style="margin-bottom:10px"><button class="btn" data-a="p">▶ استمع</button><button class="btn g" data-a="s">🐢 ببطء</button></div>
      <div class="opts">${q.opts.map((o,j)=>`<button class="opt${o.sv?" sv":""}${o.cls?" "+o.cls:""}" data-j="${j}">${o.label}</button>`).join("")}</div><div class="fb"></div>`;
    $('[data-a="p"]',box).onclick=()=>playIt(q.it); $('[data-a="s"]',box).onclick=()=>playIt(q.it,0.6);
    let locked=false;
    $$(".opt",box).forEach(b=>b.onclick=()=>{
      if(locked)return;locked=true;const o=q.opts[+b.dataset.j];
      $$(".opt",box).forEach((x,j)=>{if(q.opts[j].ok)x.classList.add("right")}); if(!o.ok)b.classList.add("wrongo");
      $(".fb",box).innerHTML=`<div class="msg ${o.ok?"good":"no"}">${o.ok?"✔ صحيح!":"✘ لا."} <span class="sv" style="font-weight:600;color:var(--ink)">${q.explain}</span></div>`;
      playIt(q.it); onDone(o.ok);
    });
    if(box.offsetParent!==null)setTimeout(()=>playIt(q.it),250);
  }

  /* ---------- GAMES ---------- */
  (function(){
    const box=$("#play");
    const G=[];
    if(canQ.hear())G.push(["hear","👂","ماذا سمعت؟","اسمع واختر الكلمة"]);
    if(canQ.len())G.push(["len","⏱️","طويل أم قصير؟","درّب أذنك على الطول"]);
    if(canQ.vowel())G.push(["vowel","🔡","الحرف الناقص","أي حرف تسمع؟"]);
    if(W.length>=6)G.push(["memory","🃏","ذاكرة الأصوات","طابق الصوت بالكلمة"]);
    if(IX.filter(x=>x.ar&&!x.sent).length>=4)G.push(["match","🧩","وصّل المعنى","السويدية ↔ العربية"]);
    if(M.filter(x=>words(x.sv).length>=3).length)G.push(["order","🔤","رتّب الجملة","اسمع ثم رتّب"]);
    box.innerHTML=`<div class="games">${G.map((g,i)=>`<div class="gcard${i?"":" on"}" data-g="${g[0]}" role="button" tabindex="0"><div class="e">${g[1]}</div><b>${g[2]}</b><span>${g[3]}</span></div>`).join("")}</div><div class="card" id="game"></div>`;
    const GB=$("#game",box);
    $$(".gcard",box).forEach(c=>{c.onclick=()=>{stopAll();$$(".gcard",box).forEach(x=>x.classList.toggle("on",x===c));run(c.dataset.g)};c.onkeydown=e=>{if(e.key==="Enter")c.click()}});
    function run(g){
      if(Q[g]){
        let k=0,score=0;const N=10;
        const round=()=>{
          if(k>=N){GB.innerHTML=`<div class="big-pct" style="color:${pctColor(score*10)}">${score} / ${N}</div><div class="msg" style="text-align:center">${score>=9?"🌟 أذن سويدية حقيقية!":score>=7?"👏 ممتاز!":score>=5?"👍 جيد، استمر بالتدريب.":"💪 ارجع إلى «اسمع وكرّر» ثم حاول مرة أخرى."}</div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn y" id="again">↺ العب مرة أخرى</button></div>`;$("#again").onclick=()=>run(g);return}
          const q=Q[g]();
          renderMC(GB,q,ok=>{if(ok)score++;setTimeout(()=>{k++;round()},ok?1500:2600)},`<div class="prog"><i style="width:${k/N*100}%"></i></div><div class="row between"><span class="qtype">${q.type}</span><span>${k+1} / ${N} · النقاط: <span class="score">${score}</span></span></div>`);
        };round();return;
      }
      if(g==="memory"){
        const ch=pick(W.filter((x,i,a)=>a.findIndex(y=>normW(y.sv)===normW(x.sv))===i),6);
        const cards=shuffle(ch.flatMap(x=>[{x,snd:true},{x,snd:false}]));
        let open=[],done=0,tries=0,lock=false;
        GB.innerHTML=`<div class="row between"><b>اقلب بطاقتين: 🔊 صوت + كلمته المكتوبة</b><span>المحاولات: <span class="score" id="mt">0</span></span></div><div class="mem" style="margin-top:10px">${cards.map((c,j)=>`<button class="mc${c.snd?" snd":""}" data-j="${j}">?</button>`).join("")}</div><div id="mm"></div>`;
        $$(".mc",GB).forEach(b=>b.onclick=()=>{
          const c=cards[+b.dataset.j]; if(lock||b.classList.contains("up")||b.classList.contains("done"))return;
          b.classList.add("up"); b.innerHTML=c.snd?"🔊":esc(c.x.sv); if(c.snd)playIt(c.x); open.push([b,c]);
          if(open.length===2){tries++;$("#mt").textContent=tries;const [p,q]=open;open=[];
            if(p[1].x===q[1].x&&p[1].snd!==q[1].snd){[p[0],q[0]].forEach(e=>{e.classList.add("done")});const s=p[1].snd?p[0]:q[0];s.innerHTML="🔊 "+esc(c.x.sv);done++;
              if(done===ch.length)$("#mm").innerHTML=`<div class="msg good">🎉 أحسنت! أنهيت اللعبة في ${tries} محاولة. <button class="btn" id="again">جولة جديدة</button></div>`,$("#again").onclick=()=>run("memory")}
            else{lock=true;setTimeout(()=>{[p[0],q[0]].forEach(e=>{e.classList.remove("up");e.textContent="?"});lock=false},1300)}}
        });
        return;
      }
      if(g==="match"){
        const ch=pick(IX.filter((x,i,a)=>x.ar&&!x.sent&&a.findIndex(y=>y.ar===x.ar)===i),Math.min(6,IX.length));
        let sel=null,done=0,tries=0;
        GB.innerHTML=`<div class="row between"><b>وصّل كل كلمة بمعناها</b><span>المحاولات: <span class="score" id="mt">0</span></span></div><div class="mgrid" style="margin-top:10px"><div class="mcol">${ch.map((x,j)=>`<button class="tile sv" data-k="${j}" data-s="sv">${esc(x.sv)}</button>`).join("")}</div><div class="mcol">${shuffle(ch.map((x,j)=>[x,j])).map(([x,j])=>`<button class="tile" data-k="${j}" data-s="ar">${esc(x.ar)}</button>`).join("")}</div></div><div id="mm"></div>`;
        $$(".tile",GB).forEach(t=>t.onclick=()=>{
          if(t.classList.contains("done"))return; if(t.dataset.s==="sv")playIt(ch[+t.dataset.k]);
          if(!sel||sel.dataset.s===t.dataset.s){if(sel)sel.classList.remove("sel");sel=t;t.classList.add("sel");return}
          tries++;$("#mt").textContent=tries;
          if(sel.dataset.k===t.dataset.k){[sel,t].forEach(x=>{x.classList.remove("sel");x.classList.add("done")});done++;if(done===ch.length){$("#mm").innerHTML=`<div class="msg good">🎉 أحسنت! ${tries} محاولة. <button class="btn" id="again">جولة جديدة</button></div>`;$("#again").onclick=()=>run("match")}}
          else{const a=sel,b=t;[a,b].forEach(x=>x.classList.add("wrong"));setTimeout(()=>[a,b].forEach(x=>x.classList.remove("wrong","sel")),450)}
          sel=null;
        });
        return;
      }
      if(g==="order"){
        const pool=shuffle(M.filter(x=>words(x.sv).length>=3));let k=0,score=0;
        const round=()=>{
          const it=pool[k%pool.length], ws=it.sv.split(" "); let built=[];
          const chips=shuffle(ws.map((w,j)=>({w,j})));
          GB.innerHTML=`<div class="row between"><b>اسمع الجملة ثم رتّب كلماتها</b><span>النقاط: <span class="score">${score}</span></span></div>${it.ar?`<p class="note">${esc(it.ar)}</p>`:""}
            <div class="row"><button class="btn g" id="oP">▶ استمع</button><button class="btn g" id="oS">🐢 ببطء</button></div><div class="slot" id="oSl"></div><div class="pool" id="oPo"></div>
            <div class="row" style="margin-top:12px"><button class="btn y" id="oC">✔ تحقّق</button><button class="btn g" id="oR">↺ إعادة</button><button class="btn g" id="oN">التالية ←</button></div><div id="oM"></div>`;
          const draw=()=>{$("#oSl").innerHTML=built.map((c,x)=>`<button class="w8 in" data-x="${x}">${esc(c.w)}</button>`).join("");
            $("#oPo").innerHTML=chips.filter(c=>!built.includes(c)).map(c=>`<button class="w8" data-j="${c.j}">${esc(c.w)}</button>`).join("");
            $$("#oPo .w8").forEach(b=>b.onclick=()=>{built.push(chips.find(c=>c.j==b.dataset.j));draw()});
            $$("#oSl .w8").forEach(b=>b.onclick=()=>{built.splice(+b.dataset.x,1);draw()})};draw();
          $("#oP").onclick=()=>playIt(it);$("#oS").onclick=()=>playIt(it,0.6);
          $("#oR").onclick=()=>{built=[];draw();$("#oM").innerHTML=""};$("#oN").onclick=()=>{k++;round()};
          $("#oC").onclick=()=>{if(built.map(c=>c.w).join(" ")===ws.join(" ")){score++;$("#oM").innerHTML=`<div class="msg good">👏 صحيح!</div>`;playIt(it);setTimeout(()=>{k++;round()},1800)}else $("#oM").innerHTML=`<div class="msg no">ليس بعد… استمع مرة أخرى.</div>`};
          if(GB.offsetParent!==null)setTimeout(()=>playIt(it),250);
        };round();
      }
    }
    if(G.length){gamesStart=()=>{if(!GB.dataset.on){GB.dataset.on="1";run(G[0][0])}}} else box.innerHTML=`<div class="card">لا توجد ألعاب لهذا الدرس.</div>`;
  })();

  /* ---------- EXAM ---------- */
  const exam={started:false,
    intro(){
      this.started=true; const b=+store.get("svp:best:"+L.n)||null;
      $("#exam").innerHTML=`<div class="card"><h3>🎯 اختبار الدرس · 10 أسئلة</h3><p>أسئلة استماع وتمييز للأصوات${hasLen?" والطول":""}${M.length?" وكتابة":""}${SR?" ونطق":""}. كل سؤال بنقطة. أفضل نتيجة لك تظهر في صفحة كل الدروس.</p>${b!==null?`<p class="note">أفضل نتيجة سابقة: <b class="score">${b}%</b></p>`:""}<button class="btn y" id="exGo">ابدأ الاختبار ←</button></div>`;
      $("#exGo").onclick=()=>this.start();
    },
    start(){
      const plan=[];
      const add=(t,n)=>{for(let i=0;i<n;i++)plan.push(t)};
      add("hear",3);
      if(canQ.len())add("len",2);
      if(canQ.vowel())add("vowel",2);
      if(canQ.meaning())add("meaning",1);
      add("dict",1);
      if(SR&&IX.length)add("speak",1);
      while(plan.length<10)plan.push(canQ.vowel()&&Math.random()<.4?"vowel":"hear");
      this.q=shuffle(plan.slice(0,10));this.k=0;this.score=0;this.next();
    },
    head(type){return `<div class="prog"><i style="width:${this.k*10}%"></i></div><div class="row between"><span class="qtype">${type}</span><span>السؤال ${this.k+1} من 10 · النقاط: <span class="score">${this.score}</span></span></div>`},
    after(ok){if(ok)this.score++;const f=$("#exam .fb")||$("#exam");f.insertAdjacentHTML("beforeend",`<button class="btn" style="margin-top:10px" id="exN">التالي ←</button>`);$("#exN").onclick=()=>{this.k++;this.next()}},
    next(){
      const E=$("#exam"); if(this.k>=this.q.length)return this.end();
      E.innerHTML=`<div class="card" id="exBox"></div>`; const B=$("#exBox"), t=this.q[this.k];
      if(Q[t]){const q=Q[t]();renderMC(B,q,ok=>this.after(ok),this.head(q.type));return}
      if(t==="dict"){
        const it=pick(W.length?W:IX,1)[0];
        B.innerHTML=this.head("✍️ إملاء")+`<div class="q">اسمع واكتب ${it.sent?"الجملة":"الكلمة"}</div><div class="row" style="margin-bottom:10px"><button class="btn" id="xP">▶ استمع</button><button class="btn g" id="xS">🐢 ببطء</button></div>
          <input class="dict" id="xIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Skriv…" aria-label="اكتب ما تسمعه"><div class="row" style="margin-top:8px"><button class="btn y" id="xC">✔ تحقّق</button><button class="mini sv" data-c="å">å</button><button class="mini sv" data-c="ä">ä</button><button class="mini sv" data-c="ö">ö</button></div><div class="fb"></div>`;
        $("#xP").onclick=()=>playIt(it);$("#xS").onclick=()=>playIt(it,0.6);setTimeout(()=>playIt(it),250);
        $$("[data-c]",B).forEach(b=>b.onclick=()=>{$("#xIn").value+=b.dataset.c;$("#xIn").focus()});
        let locked=false;const chk=()=>{if(locked)return;locked=true;const r=compare(it.sv,$("#xIn").value,true);$(".fb",B).innerHTML=`<div class="res">${r.html}</div><div class="msg ${r.correct?"good":"no"}">${r.correct?"✔ صحيح!":"✘ الجواب:"} <span class="sv">${hl(it.raw,it.k)}</span></div>`;this.after(r.correct)};
        $("#xC").onclick=chk;$("#xIn").onkeydown=e=>{if(e.key==="Enter")chk()};return;
      }
      if(t==="speak"){
        const it=pick(W.length?W:IX,1)[0]; let tries=0, locked=false;
        B.innerHTML=this.head("🗣️ نطق")+`<div class="q">انطق هذه ${it.sent?"الجملة":"الكلمة"} (النجاح من 70٪، لديك 3 محاولات)</div><div class="target">${hl(it.raw,it.k)}</div><div class="tr">${trHtml(it.tr)}</div>
          <div class="row" style="margin-top:10px"><button class="btn g" id="xP">▶ اسمع الأصل</button><button class="btn mic" id="xM">🎙️ انطق الآن</button><button class="btn g" id="xK">تخطَّ</button></div><div class="note" id="xSt" style="margin-top:8px"></div><div id="xOut"></div><div class="fb"></div>`;
        $("#xP").onclick=()=>playIt(it);
        $("#xK").onclick=()=>{if(locked)return;locked=true;$(".fb",B).innerHTML=`<div class="msg no">تم التخطّي.</div>`;this.after(false)};
        $("#xM").onclick=async()=>{
          if(locked)return;stopAll();const b=$("#xM");b.classList.add("rec");b.textContent="🎙️ أستمع…";
          try{const alts=await listenSv(s=>{if(s==="listening")$("#xSt").textContent="🔴 تكلّم الآن…"});const r=best(it.sv,alts);tries++;$("#xSt").textContent="";
            $("#xOut").innerHTML=`<div class="big-pct" style="color:${pctColor(r.pct)}">${r.pct}%</div><div class="heard">“${esc(r.text)}”</div>${confusion(it,r.text)}`;
            if(r.pct>=70||tries>=3){locked=true;$(".fb",B).innerHTML=`<div class="msg ${r.pct>=70?"good":"no"}">${r.pct>=70?pctMsg(r.pct):"تدرّب أكثر في قسم «النطق»."}</div>`;this.after(r.pct>=70)}
            else $("#xSt").textContent=`حاول مرة أخرى (المحاولة ${tries} من 3).`;
          }catch(e){$("#xSt").textContent=srErr(e)}
          b.classList.remove("rec");b.textContent="🎙️ انطق الآن";
        };
      }
    },
    end(){
      const p=this.score*10, old=+store.get("svp:best:"+L.n)||0;
      if(p>old)store.set("svp:best:"+L.n,String(p));
      $("#exam").innerHTML=`<div class="card"><div class="big-pct" style="color:${pctColor(p)}">${this.score} / 10</div><div class="meter"><i style="width:${p}%;background:${pctColor(p)}"></i></div>
        <div class="msg" style="text-align:center;color:${pctColor(p)}">${p>=90?"🌟 ممتاز! انتقل إلى الدرس التالي.":p>=70?"👏 جيد جدًا!":p>=50?"👍 بداية جيدة. كرّر مع الببغاء ثم أعد الاختبار.":"💪 ارجع إلى «اسمع وكرّر» ثم حاول مرة أخرى."}</div>
        ${p>old&&old?`<p class="note" style="text-align:center">رقم قياسي جديد! السابق ${old}%</p>`:""}
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn y" id="exAgain">↺ اختبار جديد</button>${next&&p>=70?`<a class="btn" style="text-decoration:none" href="${pad(next.n)}.html">الدرس التالي ←</a>`:""}</div></div>`;
      $("#exAgain").onclick=()=>this.start();
    }
  };
};
})();
