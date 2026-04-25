const AURA_RESPONSES={
  cooked:["yo, that's a LOT. breathe for a sec - we're gonna figure this out.\n\nfirst, brain dump everything on your plate. then we sort by what's actually on fire vs. what just feels urgent.","okay so you're in full overwhelm mode. that's real and it's valid.\n\nhere's the move: pick ONE thing. just one. the smallest possible next step. forget everything else for the next 25 minutes. ready?"],
  procrastination:["procrastination isn't laziness - it's your brain avoiding something that feels too big or too scary. that's actually smart self-protection.\n\nso let's make it smaller. what's the tiniest possible first step? like, embarrassingly tiny?","the spiral is real. here's what i'd try:\n\nset a timer for 10 minutes. work on it badly. seriously - write the worst version. bad work > no work, every time."],
  nothing:["three hours and nothing to show? your brain left the building about 2 hours ago, friend.\n\nreal talk: zombie mode is real. you're not being lazy - you're running on empty.\n\nclose everything. go outside for 5 minutes. not negotiable. your brain literally can't absorb information when it's this fried.","that's zombie mode. you're physically present but mentally checked out.\n\nnew rule: 5-minute outdoor reset FIRST. then come back with a fresh 25-minute sprint on ONE thing. no tabs, no phone."],
  sleep:["not being able to sleep because of stress is one of the worst feelings. your brain won't stop running through the list.\n\nhere's a reset that actually works: write down EVERYTHING stressing you on paper. physically. then close the notebook. your brain needs to know it's been 'saved' somewhere so it can let go.\n\nthen: 4-7-8 breathing. in for 4, hold for 7, out for 8. three rounds.","okay first - tomorrow's problems are tomorrow's. there is literally nothing you can do about them right now.\n\ntry this: box breathing. in for 4 counts, hold for 4, out for 4, hold for 4. repeat 4 times.\n\nyour worth is not your to-do list."],
  plan:["let's cook.\n\ntell me: what's the top 3 things on your plate right now? we'll build around your actual energy.","alright, gameplan time. what's actually due in the next 48 hours? let's start there."],
  default:["i hear you. tell me more - what's the biggest thing weighing on you right now?","that sounds heavy. you don't have to figure it all out at once.","real talk - you came here, which means part of you is already trying to fix it. that counts.","what's going on?"]
};

const defaultTasks=[];
const defaultSchedule=[];

let state={tasks:[...defaultTasks],schedule:[...defaultSchedule],battery:74,xp:0,streak:0,timerRunning:false,timerSeconds:25*60,timerMode:25,timerInterval:null};

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
  else if(pct>=40){color="linear-gradient(90deg,#f6e05e,#fbd38d)";status="mid-range. manageable.";glow.style.background="#f6e05e"}
  else if(pct>=20){color="linear-gradient(90deg,#f6ad55,#fc8181)";status="getting low. take a break soon.";glow.style.background="#f6ad55"}
  else{color="linear-gradient(90deg,#fc8181,#feb2b2)";status="red zone - seriously, stop. recharge.";glow.style.background="#fc8181"}
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
    tl.innerHTML='<p style="color:var(--text2);font-size:14px;padding:12px">no gameplan yet - add some tasks!</p>';
    return;
  }
  state.schedule.slice(0,4).forEach(item=>{
    const div=document.createElement("div");
    div.className="timeline-item "+(item.done?"done":item.type) + (item.category ? " cat-"+item.category : "");
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
    grid.innerHTML='<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2)"><p style="font-size:28px;margin-bottom:12px">nothing here yet</p><p style="font-size:15px">hit "+ add task" to start mapping your day</p></div>';
    $("doom-alert").classList.add("hidden");
    return;
  }
  state.tasks.forEach(task=>{
    const card=document.createElement("div");
    card.className="glass-card task-card";
    card.style.opacity=task.done?"0.6":"1";
    const days=task.deadline?Math.ceil((new Date(task.deadline)-new Date())/(1000*60*60*24)):null;
    const urgency=days!==null?(days<=1?"[urgent]":days<=3?"[soon]":"[ok]"):"";
    card.innerHTML=`
      <div class="task-header">
        <div>
          <div class="task-name">${task.done?"[done] ":""}${task.name}</div>
          <div class="task-deadline">${urgency} ${task.duration} mins</div>
        </div>
        <span class="task-cat-badge" style="background:${getCatColor(task.category)};color:${getCatTextColor(task.category)}">${catLabel[task.category]||task.category}</span>
      </div>
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
    tl.innerHTML='<p style="color:var(--text2);font-size:14px;padding:16px">add some tasks to build your schedule</p>';
    return;
  }
  state.schedule.forEach((item,i)=>{
    const div=document.createElement("div");
    div.className="timeline-item "+(item.done?"done":item.type) + (item.category ? " cat-"+item.category : "");
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
  {title:"5-min outdoor reset",sub:"no screen. fresh air.",mins:5},
  {title:"snack + stretch",sub:"eat something real.",mins:10},
  {title:"10-min no-screen break",sub:"phone down. just exist.",mins:10}
];

function generatePlan(){
  const active=state.tasks.filter(t=>!t.done);
  if(active.length===0){
    state.schedule=[];
    renderSchedule();
    renderDashboard();
    $("aura-daily-msg").textContent="welcome! add your tasks and i'll build your gameplan automatically.";
    return;
  }

  const sorted=[...active].sort((a,b)=>{
    const dA=a.deadline?Math.ceil((new Date(a.deadline)-new Date())/86400000):999;
    const dB=b.deadline?Math.ceil((new Date(b.deadline)-new Date())/86400000):999;
    return dA-dB;
  });

  const blocks=[];
  let elapsed=0;
  let bIdx=0;

  sorted.forEach((task,i)=>{
    const duration = parseInt(task.duration) || 25;
    blocks.push({
      time:formatSchedTime(elapsed),
      title:task.name,
      sub:duration+"-min sprint.",
      type:"sprint",
      category: task.category,
      done:false,
      taskId:task.id
    });
    elapsed+=duration;

    if(i<sorted.length-1){
      const b=BREATHE_POOL[bIdx%BREATHE_POOL.length];bIdx++;
      blocks.push({time:formatSchedTime(elapsed),title:b.title,sub:b.sub,type:"breathe",done:false});
      elapsed+=b.mins;
    }
  });

  blocks.push({time:formatSchedTime(elapsed),title:"HARD STOP",sub:"you're done for today.",type:"breathe",done:false});

  state.schedule=blocks;
  renderSchedule();
  renderDashboard();
  $("aura-daily-msg").textContent="built your gameplan based on your tasks. different categories are color-coded!";
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
        else{clearInterval(timerInterval);state.timerRunning=false;$("timer-start").textContent="start";showToast("timer done!","success");state.xp+=20;updateXP()}
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
      const labels={25:"sprint - locked in",5:"breathe",15:"reset"};
      $("timer-label").textContent=labels[mins]||"";
    });
  });
}

function getAuraResponse(msg){
  const m=msg.toLowerCase();
  if(m.includes("cooked")||m.includes("overwhelm")||m.includes("too much")){return AURA_RESPONSES.cooked[Math.floor(Math.random()*AURA_RESPONSES.cooked.length)]}
  if(m.includes("procrastinat")||m.includes("spiral")){return AURA_RESPONSES.procrastination[Math.floor(Math.random()*AURA_RESPONSES.procrastination.length)]}
  if(m.includes("nothing")||m.includes("zombie")){return AURA_RESPONSES.nothing[Math.floor(Math.random()*AURA_RESPONSES.nothing.length)]}
  if(m.includes("sleep")){return AURA_RESPONSES.sleep[Math.floor(Math.random()*AURA_RESPONSES.sleep.length)]}
  if(m.includes("plan")||m.includes("schedule")){return AURA_RESPONSES.plan[Math.floor(Math.random()*AURA_RESPONSES.plan.length)]}
  return AURA_RESPONSES.default[Math.floor(Math.random()*AURA_RESPONSES.default.length)];
}

let chatInited=false;
function initChat(){
  if(chatInited)return;chatInited=true;
  addChatMsg("aura","hey - i'm aura. what's on your mind today?");
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
      const mood=btn.dataset.mood;
      updateBattery({green:85,yellow:60,orange:35,red:15}[mood]||60);
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

  $("cancel-task-btn").addEventListener("click",()=>$("task-modal").classList.add("hidden"));
  $("task-modal").addEventListener("click",e=>{if(e.target===$("task-modal"))$("task-modal").classList.add("hidden")});

  $("save-task-btn").addEventListener("click",()=>{
    const name=$("task-name").value.trim();
    const duration = $("task-duration").value;
    if(!name || !duration){showToast("fill in name and duration!","error");return;}
    state.tasks.push({id:Date.now(),name,deadline:$("task-deadline").value,duration,category:$("task-category").value,done:false});
    $("task-modal").classList.add("hidden");$("task-name").value="";$("task-duration").value="";
    generatePlan();
    renderTasks();
    showToast("task added!","success");
    const schedNav=$("nav-schedule");
    schedNav.style.background="rgba(183,148,246,0.35)";
    setTimeout(()=>{schedNav.style.background="";},1200);
  });

  $("generate-plan-btn").addEventListener("click",generatePlan);
  $("see-full-plan")&&$("see-full-plan").addEventListener("click",()=>navigate("schedule"));

  initTimer();

  $("send-btn").addEventListener("click",()=>sendChatMsg($("chat-input").value));
  $("chat-input").addEventListener("keydown",e=>{if(e.key==="Enter")sendChatMsg($("chat-input").value)});
  document.querySelectorAll(".quick-btn").forEach(btn=>{
    btn.addEventListener("click",()=>sendChatMsg(btn.dataset.msg));
  });

  $("checkin-btn").addEventListener("click",()=>$("checkin-modal").classList.remove("hidden"));
  $("close-checkin-modal").addEventListener("click",()=>$("checkin-modal").classList.add("hidden"));
  $("confirm-checkin").addEventListener("click",()=>{
    $("checkin-modal").classList.add("hidden");
    showToast("battery calibrated!","success");
  });
  setupMoodBtns($("checkin-modal"));

  $("doom-fix-btn")&&$("doom-fix-btn").addEventListener("click",()=>{
    navigate("schedule");generatePlan();
    showToast("schedule redistributed","success");
  });

  const greetings=["let's see how your energy's looking.","what are we tackling?","your brain is a muscle.","rest is productive."];
  $("greeting-sub").textContent=greetings[new Date().getDay()%greetings.length];

  updateXP();
});