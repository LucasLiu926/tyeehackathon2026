const AURA_RESPONSES={
  cooked:["yo, that's a LOT. breathe for a sec - we're gonna figure this out.\n\nfirst, brain dump everything on your plate. then we sort by what's actually on fire vs. what just feels urgent.","okay so you're in full overwhelm mode. that's real and it's valid.\n\nhere's the move: pick ONE thing. just one. the smallest possible next step. forget everything else for the next 25 minutes. ready?"],
  procrastination:["procrastination isn't laziness - it's your brain avoiding something that feels too big or too scary. that's actually smart self-protection.\n\nso let's make it smaller. what's the tiniest possible first step? like, embarrassingly tiny?","the spiral is real. here's what i'd try:\n\nset a timer for 10 minutes. work on it badly. seriously - write the worst version. bad work > no work, every time."],
  nothing:["three hours and nothing to show? your brain left the building about 2 hours ago, friend.\n\nreal talk: zombie mode is real. you're not being lazy - you're running on empty.\n\nclose everything. go outside for 5 minutes. not negotiable. your brain literally can't absorb information when it's this fried.","that's zombie mode. you're physically present but mentally checked out.\n\nnew rule: 5-minute outdoor reset FIRST. then come back with a fresh 25-minute sprint on ONE thing. no tabs, no phone."],
  sleep:["not being able to sleep because of stress is one of the worst feelings. your brain won't stop running through the list.\n\nhere's a reset that actually works: write down EVERYTHING stressing you on paper. physically. then close the notebook. your brain needs to know it's been 'saved' somewhere so it can let go.\n\nthen: 4-7-8 breathing. in for 4, hold for 7, out for 8. three rounds.","okay first - tomorrow's problems are tomorrow's. there is literally nothing you can do about them right now.\n\ntry this: box breathing. in for 4 counts, hold for 4, out for 4, hold for 4. repeat 4 times.\n\nyour worth is not your to-do list."],
  plan:["let's cook.\n\nfirst i need to know: what's the current battery level? (be honest)\n\nthen tell me: what are the top 3 things on your plate right now and when they're due. we'll build around your actual energy, not some perfect version of you.","alright, gameplan time.\n\ntell me: what time is it where you are, and what's actually due in the next 48 hours? let's start there and work backwards."],
  default:["i hear you. tell me more - what's the biggest thing weighing on you right now?","that sounds heavy. you don't have to figure it all out at once.\n\nwhat's the ONE thing that, if it was handled, would make everything else feel more manageable?","real talk - you came here, which means part of you is already trying to fix it. that counts.\n\nwhat's going on?"]
};

const defaultTasks=[];
const defaultSchedule=[];
const defaultEntries=[];

let state={tasks:[...defaultTasks],schedule:[...defaultSchedule],entries:[...defaultEntries],battery:74,xp:0,streak:0,selectedMood:"yellow",timerRunning:false,timerSeconds:25*60,timerMode:25,timerInterval:null};

function $(id){return document.getElementById(id)}

function navigate(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  const el=$("view-"+view);
  const nav=$("nav-"+view);
  if(el)el.classList.add("active");
  if(nav)nav.classList.add("active");
  if(view==="tasks")renderTasks();
  if(view==="schedule")renderSchedule();
  if(view==="journal")renderJournal();
  if(view==="chat")initChat();
}

function updateBattery(val){
  state.battery=parseInt(val);
  const pct=state.battery;
  $("battery-percent").textContent=pct+"%";
  const fill=$("battery-fill");
  const glow=$("battery-glow");
  fill.style.width=pct+"%";
  let color,status;
  if(pct>=70){color="linear-gradient(90deg,#68d391,#9ae6b4)";status="you're in the green zone. solid.";glow.style.background="#68d391"}
  else if(pct>=40){color="linear-gradient(90deg,#f6e05e,#fbd38d)";status="mid-range. manageable, but let's not push it.";glow.style.background="#f6e05e"}
  else if(pct>=20){color="linear-gradient(90deg,#f6ad55,#fc8181)";status="getting low. after this sprint, we reset.";glow.style.background="#f6ad55"}
  else{color="linear-gradient(90deg,#fc8181,#feb2b2)";status="red zone - seriously, stop. recharge first.";glow.style.background="#fc8181"}
  fill.style.background=color;
  $("battery-status").textContent=status;
  $("battery-percent").style.background=color;
  $("battery-percent").style["-webkit-background-clip"]="text";
}

function renderDashboard(){
  const done=state.tasks.filter(t=>t.done).length;
  $("stat-tasks").textContent=state.tasks.length===0?"0":done+"/"+state.tasks.length;
  $("stat-streak").textContent=state.streak;
  $("stat-sprints").textContent=state.schedule.filter(s=>s.type==="sprint"&&!s.done).length;
  const tl=$("dashboard-timeline");
  tl.innerHTML="";
  if(state.schedule.length===0){
    tl.innerHTML='<p style="color:var(--text2);font-size:14px;padding:12px">no gameplan yet - head to the gameplan tab to generate one!</p>';
    return;
  }
  state.schedule.slice(0,4).forEach(item=>{
    const div=document.createElement("div");
    div.className="timeline-item "+(item.done?"done":item.type);
    div.innerHTML=`<span class="timeline-time">${item.time}</span><div class="timeline-content"><div class="timeline-title">${item.done?"[done] ":""}${item.title}</div><div class="timeline-sub">${item.sub}</div></div><span class="timeline-tag ${item.type}">${item.type}</span>`;
    tl.appendChild(div);
  });
}

function getCatColor(cat){const m={academic:"rgba(183,148,246,.2)",creative:"rgba(252,176,69,.2)",social:"rgba(104,211,145,.2)",physical:"rgba(99,179,237,.2)",personal:"rgba(246,135,179,.2)"};return m[cat]||"rgba(255,255,255,.1)"}
function getCatTextColor(cat){const m={academic:"#b794f6",creative:"#f6ad55",social:"#68d391",physical:"#63b3ed",personal:"#f687b3"};return m[cat]||"#fff"}
const catLabel={academic:"academic",creative:"creative",social:"social",physical:"physical",personal:"personal"};

function renderTasks(){
  const grid=$("tasks-grid");
  grid.innerHTML="";
  if(state.tasks.length===0){
    grid.innerHTML='<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2)"><p style="font-size:28px;margin-bottom:12px">nothing here yet</p><p style="font-size:15px">hit "+ add task" to start mapping your energy</p></div>';
    $("doom-alert").classList.add("hidden");
    return;
  }
  const highDrain=state.tasks.filter(t=>!t.done&&t.drain>=7);
  if(highDrain.length>=3){
    $("doom-alert").classList.remove("hidden");
    $("doom-desc").textContent=`you've got ${highDrain.length} high-drain tasks stacked. let's rearrange before this becomes a spiral.`;
  } else {
    $("doom-alert").classList.add("hidden");
  }
  state.tasks.forEach(task=>{
    const card=document.createElement("div");
    card.className="glass-card task-card";
    card.style.opacity=task.done?"0.6":"1";
    const days=task.deadline?Math.ceil((new Date(task.deadline)-new Date())/(1000*60*60*24)):null;
    const urgency=days!==null?(days<=1?"[urgent] due today/tomorrow":days<=3?"[soon] due in "+days+"d":"[ok] "+days+"d left"):"no deadline";
    card.innerHTML=`
      <div class="task-header">
        <div>
          <div class="task-name">${task.done?"[done] ":""}${task.name}</div>
          <div class="task-deadline">${urgency}</div>
        </div>
        <span class="task-cat-badge" style="background:${getCatColor(task.category)};color:${getCatTextColor(task.category)}">${catLabel[task.category]||task.category}</span>
      </div>
      <div class="task-scores">
        <span class="score-pill drain">drain ${task.drain}/10</span>
        <span class="score-pill dread">dread ${task.dread}/10</span>
      </div>
      <div class="task-bar"><div class="task-bar-fill" style="width:${((task.drain+task.dread)/20*100)}%"></div></div>
      <div class="task-actions">
        <button class="task-btn done-btn" onclick="toggleTask(${task.id})">${task.done?"undo":"mark done"}</button>
        <button class="task-btn" onclick="deleteTask(${task.id})">remove</button>
      </div>`;
    grid.appendChild(card);
  });
}

function toggleTask(id){
  const t=state.tasks.find(t=>t.id===id);
  if(t){
    t.done=!t.done;
    if(t.done){state.xp+=30;showToast("nice work! +30 balance xp","success");}
    generatePlan();
    renderTasks();
    updateXP();
  }
}
function deleteTask(id){state.tasks=state.tasks.filter(t=>t.id!==id);generatePlan();renderTasks();showToast("task removed","warning")}

function renderSchedule(){
  const tl=$("full-timeline");
  tl.innerHTML="";
  if(state.schedule.length===0){
    tl.innerHTML='<p style="color:var(--text2);font-size:14px;padding:16px">hit "generate plan" to build your sprint + breathe schedule</p>';
    return;
  }
  state.schedule.forEach((item,i)=>{
    const div=document.createElement("div");
    div.className="timeline-item "+(item.done?"done":item.type);
    div.innerHTML=`<span class="timeline-time">${item.time}</span><div class="timeline-content"><div class="timeline-title">${item.done?"[done] ":""}${item.title}</div><div class="timeline-sub">${item.sub}</div></div><span class="timeline-tag ${item.type}">${item.type}</span>`;
    div.style.cursor="pointer";
    div.addEventListener("click",()=>{
      state.schedule[i].done=!state.schedule[i].done;
      if(state.schedule[i].done){state.xp+=25;updateXP();showToast("sprint complete! +25 xp","success")}
      renderSchedule();renderDashboard();
    });
    tl.appendChild(div);
  });
}

function formatSchedTime(minutesOffset){
  const now=new Date();
  // Start from the next 15-min boundary at or after current time, minimum 3 PM
  let startH=now.getHours()<15?15:now.getHours();
  let startM=now.getHours()<15?0:Math.ceil(now.getMinutes()/15)*15;
  if(startM>=60){startH++;startM=0;}
  const start=new Date(now);
  start.setHours(startH,startM,0,0);
  const t=new Date(start.getTime()+minutesOffset*60000);
  let h=t.getHours();const m=t.getMinutes();
  const ampm=h>=12?"PM":"AM";
  h=h%12||12;
  return h+":"+(m<10?"0":"")+m+" "+ampm;
}

const BREATHE_POOL=[
  {title:"5-min outdoor reset",sub:"no screen. fresh air. not optional.",mins:5},
  {title:"snack + stretch",sub:"eat something real. move your body a little.",mins:10},
  {title:"10-min no-screen break",sub:"phone down. just exist for a minute.",mins:10},
  {title:"quick walk",sub:"even around the block. your brain needs oxygen.",mins:8},
  {title:"breathe + hydrate",sub:"drink water. 4 deep breaths. you're doing great.",mins:5}
];

const SPRINT_SUB={
  academic:"timer on. full focus. no extra tabs.",
  creative:"let the ideas flow - don't judge what comes out yet.",
  social:"get this handled so it stops living in your head.",
  physical:"show up. that's the whole job.",
  personal:"this one's for you. take it seriously."
};

function generatePlan(){
  const active=state.tasks.filter(t=>!t.done);
  if(active.length===0){
    state.schedule=[];
    renderSchedule();
    renderDashboard();
    if(state.tasks.length>0){
      showToast("all tasks done - you're actually finished!","success");
      $("aura-daily-msg").textContent="all tasks done. that's genuinely impressive. rest now - you earned it.";
    } else {
      $("aura-daily-msg").textContent="welcome! add your tasks and i'll build your gameplan automatically.";
    }
    return;
  }

  // Sort: most urgent (soonest deadline) first, then highest drain
  const sorted=[...active].sort((a,b)=>{
    const dA=a.deadline?Math.ceil((new Date(a.deadline)-new Date())/86400000):999;
    const dB=b.deadline?Math.ceil((new Date(b.deadline)-new Date())/86400000):999;
    if(dA!==dB)return dA-dB;
    return b.drain-a.drain;
  });

  // Sprint length adapts to battery level
  const sprintLen=state.battery>=70?25:state.battery>=40?20:15;

  const blocks=[];
  let elapsed=0;
  let bIdx=0;

  sorted.forEach((task,i)=>{
    const sub=SPRINT_SUB[task.category]||"timer on. let's get it.";
    const days=task.deadline?Math.ceil((new Date(task.deadline)-new Date())/86400000):null;
    const urgencyNote=days!==null?(days<=0?" - DUE TODAY":days===1?" - due tomorrow":` - due in ${days}d`):"";
    blocks.push({
      time:formatSchedTime(elapsed),
      title:task.name+urgencyNote,
      sub:sprintLen+"-min sprint. "+sub,
      type:"sprint",
      done:false,
      taskId:task.id
    });
    elapsed+=sprintLen;

    // Add breathe block between sprints
    if(i<sorted.length-1){
      const b=BREATHE_POOL[bIdx%BREATHE_POOL.length];bIdx++;
      blocks.push({time:formatSchedTime(elapsed),title:b.title,sub:b.sub,type:"breathe",done:false});
      elapsed+=b.mins;
    }
  });

  // Hard stop at the end
  blocks.push({time:formatSchedTime(elapsed),title:"HARD STOP - you're done",sub:"rest is productive. seriously.",type:"breathe",done:false});

  state.schedule=blocks;
  renderSchedule();
  renderDashboard();
  const msg=state.battery>=70
    ?"battery's solid - locked in "+sprintLen+"-min sprints. click any block to mark it done."
    :state.battery>=40
    ?"mid-range battery, so "+sprintLen+"-min sprints with breathe blocks built in. don't skip the breaks."
    :"battery's low - keeping sprints to "+sprintLen+" min with extra recovery. pacing beats grinding.";
  $("aura-daily-msg").textContent=msg;
}

function renderJournal(){
  renderMoodWeek();
  renderEntries();
  renderInsight();
}

function renderMoodWeek(){
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const moodColors={green:"#68d391",yellow:"#f6e05e",orange:"#f6ad55",red:"#fc8181",none:"rgba(255,255,255,0.1)"};
  const weekEl=$("mood-week");
  const chartEl=$("mood-chart");
  weekEl.innerHTML="";chartEl.innerHTML="";
  const recentMoods=state.entries.slice(0,7).reverse();
  days.forEach((d,i)=>{
    const entry=recentMoods[i];
    const color=entry?moodColors[entry.mood]:moodColors.none;
    const dayDiv=document.createElement("div");
    dayDiv.className="mood-day";
    dayDiv.innerHTML=`<span class="mood-day-label">${d}</span><div class="mood-day-dot" style="background:${color}"></div>`;
    weekEl.appendChild(dayDiv);
    const moodVal={green:90,yellow:65,orange:40,red:20,none:0};
    const bar=document.createElement("div");
    bar.className="mood-bar";
    bar.style.background=color;
    bar.style.height=(entry?moodVal[entry.mood]:10)+"%";
    bar.style.opacity=entry?"1":"0.2";
    chartEl.appendChild(bar);
  });
}

function renderEntries(){
  const list=$("entries-list");
  list.innerHTML="";
  if(state.entries.length===0){
    list.innerHTML='<p style="color:var(--text2);font-size:14px;padding:12px">no entries yet - do your first check-in above!</p>';
    return;
  }
  const moodColors={green:"#68d391",yellow:"#f6e05e",orange:"#f6ad55",red:"#fc8181"};
  const moodLabels={green:"charged",yellow:"okay",orange:"low",red:"drained"};
  state.entries.forEach(e=>{
    const div=document.createElement("div");
    div.className="entry-item";
    div.innerHTML=`<div class="entry-dot" style="background:${moodColors[e.mood]||"#fff"}"></div><div class="entry-info"><div class="entry-date">${e.date} - ${moodLabels[e.mood]||e.mood}</div><div class="entry-text">drain: ${e.drain} | win: ${e.win}</div></div><div class="entry-sleep">sleep ${e.sleep}h</div>`;
    list.appendChild(div);
  });
}

function renderInsight(){
  const el=$("insight-text");
  if(state.entries.length===0){el.textContent="log a few days and i'll start spotting your patterns. everyone has a time of day where they crash - let's find yours.";return;}
  const orangeRed=state.entries.filter(e=>e.mood==="orange"||e.mood==="red");
  const avgSleep=state.entries.reduce((a,e)=>a+e.sleep,0)/state.entries.length;
  if(orangeRed.length>=2)el.textContent="heads up - you've been in the low-energy zone "+orangeRed.length+" times recently. that's a pattern worth noticing. what's eating your battery most?";
  else if(avgSleep<6.5)el.textContent="your average sleep is "+avgSleep.toFixed(1)+"h. that's below what your brain needs to actually retain stuff. even one extra hour would change how monday feels.";
  else el.textContent="you're doing better than you think. keep logging and i'll get better at spotting your patterns - everyone has a time of day where they crash. let's find yours.";
}

function submitCheckin(){
  const drain=$("journal-drain").value||"nothing specific";
  const win=$("journal-win").value||"showed up";
  const sleep=parseFloat($("journal-sleep").value)||7;
  const now=new Date();
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  state.entries.unshift({date:months[now.getMonth()]+" "+now.getDate(),mood:state.selectedMood,drain,win,sleep});
  state.xp+=40;
  state.streak+=1;
  updateXP();
  renderJournal();
  renderDashboard();
  showToast("vibe logged! +40 balance xp","success");
  $("journal-drain").value="";
  $("journal-win").value="";
  $("journal-sleep").value="";
}

function updateXP(){
  const maxXP=500;
  $("xp-value").textContent=state.xp+" / "+maxXP;
  $("xp-fill").style.width=Math.min(state.xp/maxXP*100,100)+"%";
}

function showToast(msg,type="success"){
  const c=$("toast-container");
  const t=document.createElement("div");
  t.className="toast "+type;
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transform="translateX(100%)";t.style.transition="all .3s";setTimeout(()=>t.remove(),300)},3000);
}

let timerInterval=null;
function initTimer(){
  $("timer-start").addEventListener("click",()=>{
    if(state.timerRunning){clearInterval(timerInterval);state.timerRunning=false;$("timer-start").textContent="start"}
    else{state.timerRunning=true;$("timer-start").textContent="pause";
      timerInterval=setInterval(()=>{
        if(state.timerSeconds>0){state.timerSeconds--;const m=Math.floor(state.timerSeconds/60);const s=state.timerSeconds%60;$("timer-display").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
        else{clearInterval(timerInterval);state.timerRunning=false;$("timer-start").textContent="start";showToast("timer done! time to breathe","success");state.xp+=20;updateXP()}
      },1000);}
  });
  $("timer-reset").addEventListener("click",()=>{
    clearInterval(timerInterval);state.timerRunning=false;state.timerSeconds=state.timerMode*60;
    const m=Math.floor(state.timerSeconds/60);$("timer-display").textContent=String(m).padStart(2,"0")+":00";
    $("timer-start").textContent="start";
  });
  document.querySelectorAll(".timer-mode").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".timer-mode").forEach(b=>{b.classList.remove("active");b.setAttribute("aria-pressed","false")});
      btn.classList.add("active");btn.setAttribute("aria-pressed","true");
      const mins=parseInt(btn.dataset.mins);state.timerMode=mins;
      clearInterval(timerInterval);state.timerRunning=false;state.timerSeconds=mins*60;
      $("timer-display").textContent=String(mins).padStart(2,"0")+":00";
      $("timer-start").textContent="start";
      const labels={25:"sprint - locked in",5:"breathe - you earned it",15:"reset - zero tech"};
      $("timer-label").textContent=labels[mins]||"";
    });
  });
}

function getAuraResponse(msg){
  const m=msg.toLowerCase();
  if(m.includes("cooked")||m.includes("overwhelm")||m.includes("too much")||m.includes("can't do")){return AURA_RESPONSES.cooked[Math.floor(Math.random()*AURA_RESPONSES.cooked.length)]}
  if(m.includes("procrastinat")||m.includes("spiral")||m.includes("avoiding")){return AURA_RESPONSES.procrastination[Math.floor(Math.random()*AURA_RESPONSES.procrastination.length)]}
  if(m.includes("nothing")||m.includes("3 hours")||m.includes("zombie")){return AURA_RESPONSES.nothing[Math.floor(Math.random()*AURA_RESPONSES.nothing.length)]}
  if(m.includes("sleep")||m.includes("can't sleep")||m.includes("awake")){return AURA_RESPONSES.sleep[Math.floor(Math.random()*AURA_RESPONSES.sleep.length)]}
  if(m.includes("plan")||m.includes("schedule")||m.includes("gameplan")){return AURA_RESPONSES.plan[Math.floor(Math.random()*AURA_RESPONSES.plan.length)]}
  return AURA_RESPONSES.default[Math.floor(Math.random()*AURA_RESPONSES.default.length)];
}

let chatInited=false;
function initChat(){
  if(chatInited)return;chatInited=true;
  addChatMsg("aura","hey - i'm aura, your personal energy architect.\n\nnot here to guilt-trip you about productivity. here to help you actually get through your week without burning out.\n\nwhat's going on?");
}

function addChatMsg(from,text){
  const msgs=$("chat-messages");
  const div=document.createElement("div");
  div.className="chat-msg "+from;
  const isAura=from==="aura";
  div.innerHTML=`<div class="msg-avatar ${isAura?"aura-av":"user-av"}">${isAura?"A":"U"}</div><div class="msg-bubble">${text.replace(/\n/g,"<br>")}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
}

function sendChatMsg(msg){
  if(!msg.trim())return;
  addChatMsg("user",msg);
  $("chat-input").value="";
  $("quick-prompts").style.display="none";
  const typing=document.createElement("div");
  typing.className="chat-msg aura typing-indicator";
  typing.innerHTML=`<div class="msg-avatar aura-av">A</div><div class="msg-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  $("chat-messages").appendChild(typing);
  $("chat-messages").scrollTop=$("chat-messages").scrollHeight;
  setTimeout(()=>{typing.remove();addChatMsg("aura",getAuraResponse(msg))},1200+Math.random()*800);
}

function setupMoodBtns(container){
  container.querySelectorAll(".mood-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      container.querySelectorAll(".mood-btn").forEach(b=>{b.classList.remove("active");b.setAttribute("aria-pressed","false")});
      btn.classList.add("active");btn.setAttribute("aria-pressed","true");
      state.selectedMood=btn.dataset.mood;
      updateBattery({green:85,yellow:60,orange:35,red:15}[state.selectedMood]||60);
      $("battery-slider").value=state.battery;
    });
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  navigate("dashboard");
  updateBattery(state.battery);
  renderDashboard();

  document.querySelectorAll(".nav-item").forEach(btn=>{
    btn.addEventListener("click",()=>navigate(btn.dataset.view));
  });

  $("battery-slider").addEventListener("input",e=>updateBattery(e.target.value));

  $("add-task-btn").addEventListener("click",()=>{
    $("task-modal").classList.remove("hidden");
    $("task-deadline").valueAsDate=new Date(Date.now()+86400000*2);
  });

  $("task-drain").addEventListener("input",e=>$("drain-display").textContent=e.target.value);
  $("task-dread").addEventListener("input",e=>$("dread-display").textContent=e.target.value);

  $("cancel-task-btn").addEventListener("click",()=>$("task-modal").classList.add("hidden"));
  $("task-modal").addEventListener("click",e=>{if(e.target===$("task-modal"))$("task-modal").classList.add("hidden")});

  $("save-task-btn").addEventListener("click",()=>{
    const name=$("task-name").value.trim();
    if(!name){showToast("give the task a name first!","error");return;}
    state.tasks.push({id:Date.now(),name,deadline:$("task-deadline").value,drain:parseInt($("task-drain").value),dread:parseInt($("task-dread").value),category:$("task-category").value,done:false});
    $("task-modal").classList.add("hidden");$("task-name").value="";
    generatePlan();
    renderTasks();
    showToast("task added - gameplan updated!","success");
    // Pulse the gameplan nav to hint the user
    const schedNav=$("nav-schedule");
    schedNav.style.background="rgba(183,148,246,0.35)";
    setTimeout(()=>{schedNav.style.background="";},1200);
  });

  $("generate-plan-btn").addEventListener("click",generatePlan);
  $("see-full-plan")&&$("see-full-plan").addEventListener("click",()=>navigate("schedule"));

  initTimer();

  setupMoodBtns(document.querySelector("#view-journal"));
  $("submit-checkin").addEventListener("click",submitCheckin);

  $("send-btn").addEventListener("click",()=>sendChatMsg($("chat-input").value));
  $("chat-input").addEventListener("keydown",e=>{if(e.key==="Enter")sendChatMsg($("chat-input").value)});
  document.querySelectorAll(".quick-btn").forEach(btn=>{
    btn.addEventListener("click",()=>sendChatMsg(btn.dataset.msg));
  });

  $("checkin-btn").addEventListener("click",()=>$("checkin-modal").classList.remove("hidden"));
  $("close-checkin-modal").addEventListener("click",()=>$("checkin-modal").classList.add("hidden"));
  $("confirm-checkin").addEventListener("click",()=>{
    $("checkin-modal").classList.add("hidden");
    showToast("battery calibrated! let's cook","success");
  });
  setupMoodBtns($("checkin-modal"));

  $("doom-fix-btn")&&$("doom-fix-btn").addEventListener("click",()=>{
    navigate("schedule");generatePlan();
    showToast("doom cluster fixed - schedule redistributed","success");
  });

  const greetings=["let's see how your energy's looking today.","what are we tackling today?","your brain is a muscle. let's not overtrain it.","rest is productive. remember that today."];
  $("greeting-sub").textContent=greetings[new Date().getDay()%greetings.length];

  updateXP();
});