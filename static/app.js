const $ = id => document.getElementById(id);
const intro=$("intro"), quiz=$("quiz"), result=$("result");
const digits = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
let questions=[], index=0, correct=0, wrong=0, startedAt=0, completedAt=0, questionStarted=0, timerId=null, tickId=null, locked=false, soundOn=true, audioCtx=null, musicTimer=null;
const letters=["ئە","ب","ج","د"];
function show(el){[intro,quiz,result].forEach(x=>x.classList.add("hidden"));el.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});}
function audio(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)audioCtx=new AC();}if(audioCtx?.state==="suspended")audioCtx.resume();return audioCtx;}
function tone(freq,duration=.14,type="sine",gain=.045,delay=0){if(!soundOn)return;const c=audio();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(gain,c.currentTime+delay+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);o.connect(g);g.connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.03);}
function correctSound(){tone(660,.13,"sine",.055);tone(880,.2,"sine",.045,.12)}
function wrongSound(){tone(190,.22,"triangle",.055);tone(140,.25,"triangle",.04,.14)}
function startMusic(){if(!soundOn||musicTimer)return;const notes=[196,246.94,293.66,246.94,174.61,220,261.63,220];let n=0;musicTimer=setInterval(()=>{if(!soundOn)return;tone(notes[n++%notes.length],.38,"sine",.012);},520);}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}
function setSound(){soundOn=!soundOn;$("soundBtn").innerHTML=soundOn?'♫ <span>دەنگ چالاکە</span>':'♫ <span>دەنگ کوژاوەتەوە</span>';if(soundOn){audio();startMusic()}else stopMusic();}
$("soundBtn").addEventListener("click",()=>{audio();setSound()});
function formatElapsed(ms){let sec=ms/1000;let whole=Math.floor(sec),m=Math.floor(whole/60),s=whole%60;return `${digits(String(m).padStart(2,"0"))}:${digits(String(s).padStart(2,"0"))}`;}
function startTotalTicker(){tickId=setInterval(()=>$("elapsed").textContent=formatElapsed(Date.now()-startedAt),100);}
async function startGame(){
  audio();if(soundOn)startMusic();
  $("startBtn").disabled=true;
  try{const r=await fetch("/api/questions");const d=await r.json();questions=d.questions;}
  catch(e){alert("پەیوەندی بە سێرڤەرەکەوە نەکرا. تکایە دووبارە هەوڵ بدە.");$("startBtn").disabled=false;return;}
  index=0;correct=0;wrong=0;completedAt=0;startedAt=Date.now();show(quiz);startTotalTicker();renderQuestion();
}
$("startBtn").addEventListener("click",startGame);
function renderQuestion(){
  if(index>=questions.length){finish();return;}
  locked=false;const q=questions[index];questionStarted=Date.now();
  $("qNumber").textContent=`${digits(index+1)} / ${digits(questions.length)}`;
  $("progressFill").style.width=`${(index/questions.length)*100}%`;
  $("category").textContent=q.category;$("questionText").textContent=q.q;
  $("feedback").className="feedback hidden";$("feedback").textContent="";
  $("options").innerHTML="";
  q.opts.forEach((opt,i)=>{const b=document.createElement("button");b.className="option";b.innerHTML=`<span class="letter">${letters[i]}</span><span></span>`;b.querySelector("span:last-child").textContent=opt;b.addEventListener("click",()=>answer(i));$("options").appendChild(b);});
  updateTimer(6);let remaining=6;clearInterval(timerId);timerId=setInterval(()=>{if(locked)return;remaining=6-(Date.now()-questionStarted)/1000;updateTimer(Math.max(0,remaining));if(remaining<=0){clearInterval(timerId);answer(null,true);}},50);
}
function updateTimer(sec){const n=Math.max(0,Math.ceil(sec));$("seconds").textContent=digits(n);const pct=Math.max(0,sec/6*100);$("timerRing").style.background=`conic-gradient(${sec<=2?"#ff526b":"#f7c928"} ${pct}%,#ffffff18 0)`;$("timerRing").classList.toggle("urgent",sec<=2);}
async function answer(choice,timeout=false){
  if(locked)return;locked=true;clearInterval(timerId);
  const q=questions[index];let response={correct:false,correctIndex:-1,explanation:"کات تەواو بوو."};
  try{const r=await fetch("/api/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:q.id,choice:choice===null?-1:choice})});response=await r.json();}catch(e){}
  const buttons=[...$("options").querySelectorAll("button")];buttons.forEach((b,i)=>{b.disabled=true;if(i===response.correctIndex)b.classList.add("correct");if(choice===i&&!response.correct)b.classList.add("wrong");});
  if(response.correct){correct++;correctSound()}else{wrong++;wrongSound()}
  if(index===questions.length-1)completedAt=Date.now();\n  const fb=$("feedback");fb.className=`feedback ${response.correct?"good":"bad"}`;fb.textContent=(timeout?"کاتت تەواو بوو. ":"")+(response.correct?"وەڵامەکەت دروستە. ":"وەڵامەکەت هەڵەیە. ")+response.explanation;
  $("progressFill").style.width=`${((index+1)/questions.length)*100}%`;
  setTimeout(()=>{index++;renderQuestion()},1050);
}
function finish(){
  clearInterval(timerId);clearInterval(tickId);stopMusic();
  const ms=(completedAt||Date.now())-startedAt,seconds=ms/1000,whole=Math.floor(seconds),m=Math.floor(whole/60),s=whole%60;
  $("score").textContent=digits(correct);$("correctCount").textContent=digits(correct);$("wrongCount").textContent=digits(wrong);
  $("accuracy").textContent=digits(Math.round(correct/questions.length*100))+"٪";
  $("totalTime").textContent=`${digits(whole)} چرکە`;
  $("timeExact").textContent=`${digits(m)} خولەک و ${digits(s)} چرکە • ${digits(seconds.toFixed(2))} چرکە بە وردی`;
  $("resultTitle").textContent=correct>=13?"تۆ پاڵەوانیت!":correct>=9?"ئەنجامێکی باش!":"تەحەداکە قورس بوو!";
  $("resultMessage").textContent=`لە ${digits(questions.length)} پرسیاردا ${digits(correct)} وەڵامت دروست بوو و ${digits(wrong)} وەڵامت هەڵە بوو. کۆی کاتت ${digits(seconds.toFixed(2))} چرکە بوو.`;
  $("progressFill").style.width="100%";show(result);tone(523,.18);tone(659,.18,"sine",.05,.18);tone(784,.35,"sine",.05,.36);
}
$("againBtn").addEventListener("click",()=>{$("startBtn").disabled=false;startGame()});
