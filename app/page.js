"use client";

import { useEffect, useRef, useState } from "react";

const AURA_FALLBACKS = {
  cooked: [
    "yo, that's a LOT. breathe for a sec - we're gonna figure this out.\n\nfirst, brain dump everything on your plate. then we sort by what's actually on fire vs. what just feels urgent.",
    "okay so you're in full overwhelm mode. that's real and it's valid.\n\nhere's the move: pick ONE thing. just one. the smallest possible next step. forget everything else for the next 25 minutes."
  ],
  procrastination: [
    "procrastination isn't laziness - it's your brain avoiding something that feels too big or too scary.\n\nso let's make it smaller. what's the tiniest possible first step? like, embarrassingly tiny?",
    "the spiral is real. set a timer for 10 minutes. work on it badly. seriously - write the worst version. bad work > no work, every time."
  ],
  default: [
    "i hear you. tell me more - what's the biggest thing weighing on you right now?",
    "that sounds heavy. you don't have to figure it all out at once.",
    "real talk - you came here, which means part of you is already trying to fix it. that counts.",
    "what's going on?"
  ]
};

const SCHEDULE_INTENT = /\b(plan|schedule|arrang|organi[sz]e|range|set up|build my evening|map out)\b/i;

function fmtCalDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function hourLabel(h) {
  const hr = h === 24 ? 12 : h;
  if (hr === 12 && h !== 24) return "12 PM";
  if (h === 24) return "12 AM";
  return hr > 12 ? hr - 12 + " PM" : hr + " PM";
}
function parseHHMM(t) {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}
function fmtDuration(mins) {
  const m = Math.round(Number(mins) || 0);
  if (m <= 60) return `${m} mins`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return h === 1 ? `1 hour` : `${h} hours`;
  return h === 1 ? `1 hour ${rem} mins` : `${h} hours ${rem} mins`;
}

function fmtTimeRange(start, end) {
  const f = (t) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m || 0).padStart(2, "0")} ${ampm}`;
  };
  return `${f(start)} - ${f(end)}`;
}

export default function Page() {
  const [view, setView] = useState("chat");
  const [entered, setEntered] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [aiSchedule, setAiSchedule] = useState({});
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDuration, setTaskDuration] = useState("25");
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [mood, setMood] = useState("normal");
  const chatScroll = useRef(null);

  const MOODS = [
    { id: "great", emoji: "😄", label: "great" },
    { id: "good", emoji: "🙂", label: "good" },
    { id: "normal", emoji: "😐", label: "normal" },
    { id: "tired", emoji: "😪", label: "tired" },
    { id: "stressed", emoji: "😣", label: "stressed" },
    { id: "sad", emoji: "😔", label: "sad" }
  ];

  useEffect(() => {
    if (chat.length === 0 && view === "chat") {
      setChat([{ from: "aura", text: "hey - i'm aura. what's on your mind today?\n\nif you want me to plan your evening, share your tasks and say something like \"help me arrange these for tonight.\"" }]);
    }
  }, [view, chat.length]);

  useEffect(() => {
    if (chatScroll.current) chatScroll.current.scrollTop = chatScroll.current.scrollHeight;
  }, [chat]);

  function showToast(msg, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }

  function addTask() {
    const name = taskName.trim();
    if (!name || !taskDuration) {
      showToast("fill in name and duration!", "error");
      return;
    }
    setTasks((ts) => [
      ...ts,
      { id: Date.now(), name, duration: taskDuration, deadline: todayISO(), category: "personal", done: false }
    ]);
    setTaskName("");
    setTaskDuration("25");
    setTaskModalOpen(false);
    showToast("task added!", "success");
  }

  function toggleTask(id) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  function deleteTask(id) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    showToast("task removed", "warning");
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function streamAuraMessage(fullText, suggestedTasks = []) {
    if (!fullText) return;
    const id = Date.now() + Math.random();
    setChat((c) => [...c, { id, from: "aura", text: "", streaming: true, suggestedTasks: [] }]);
    const len = fullText.length;
    const total = Math.min(700, Math.max(280, len * 8));
    const stepSize = Math.max(1, Math.ceil(len / (total / 18)));
    for (let i = stepSize; i <= len; i += stepSize) {
      const slice = fullText.slice(0, i);
      setChat((c) => c.map((m) => (m.id === id ? { ...m, text: slice } : m)));
      await sleep(18);
    }
    setChat((c) => c.map((m) => (m.id === id ? { ...m, text: fullText, streaming: false, suggestedTasks } : m)));
  }

  async function runPlanner(triggeringMsg, taskList) {
    const activeTasks = (taskList || tasks).filter((t) => !t.done);
    if (activeTasks.length === 0) {
      setChat((c) => [...c, { from: "aura", text: "drop a few tasks on the energy map first, then ask me again - i'll arrange them for you." }]);
      return;
    }
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks.map((t) => ({ name: t.name, duration: parseInt(t.duration) })),
          date: todayISO(),
          userMessage: triggeringMsg,
          mood
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const dateKey = todayISO();
      setAiSchedule((s) => ({ ...s, [dateKey]: data.blocks || [] }));
      await streamAuraMessage(data.message || "here's your evening - check the calendar.");
      showToast("calendar updated", "success");
      setView("tasks");
    } catch {
      setChat((c) => [...c, { from: "aura", text: "couldn't reach my planning brain right now. check the API key in .env.local? meanwhile, breathe and start with the smallest task." }]);
    }
  }

  async function sendChat(text) {
    const msg = text.trim();
    if (!msg || chatBusy) return;
    setChat((c) => [...c, { from: "user", text: msg }]);
    setChatInput("");
    setChatBusy(true);

    const regexHit = SCHEDULE_INTENT.test(msg);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [...chat, { from: "user", text: msg }].slice(-36),
          currentTasks: tasks.filter((t) => !t.done).map((t) => ({ name: t.name, durationMinutes: parseInt(t.duration) })),
          mood
        })
      });
      if (!res.ok) throw new Error("chat failed");
      const data = await res.json();
      const existing = new Set(tasks.map((t) => t.name.trim().toLowerCase()));
      const filteredSuggestions = (data.suggestedTasks || []).filter((s) => s && s.name && !existing.has(s.name.trim().toLowerCase()));
      const updates = (data.updatedTasks || []).filter((u) => u && u.name && u.duration);
      const removals = (data.removedTasks || []).filter((n) => typeof n === "string" && n.trim());
      let wantsSchedule = regexHit || data.wantsSchedule;

      let mergedTasks = tasks;

      if (removals.length > 0) {
        const removeSet = new Set(removals.map((n) => n.trim().toLowerCase()));
        mergedTasks = mergedTasks.filter((t) => !removeSet.has(t.name.trim().toLowerCase()));
      }

      if (updates.length > 0) {
        const updateMap = new Map(updates.map((u) => [u.name.trim().toLowerCase(), u.duration]));
        mergedTasks = mergedTasks.map((t) => {
          const newDur = updateMap.get(t.name.trim().toLowerCase());
          return newDur ? { ...t, duration: String(newDur) } : t;
        });
      }

      if (wantsSchedule && filteredSuggestions.length > 0) {
        const newTaskObjs = filteredSuggestions.map((s) => ({
          id: Date.now() + Math.random(),
          name: s.name,
          duration: String(s.duration || 30),
          deadline: todayISO(),
          category: "personal",
          done: false
        }));
        mergedTasks = [...mergedTasks, ...newTaskObjs];
      }

      if (mergedTasks !== tasks) {
        setTasks(mergedTasks);
      }

      const showSuggestions = !wantsSchedule;
      await streamAuraMessage(data.reply || "", showSuggestions ? filteredSuggestions : []);

      if (wantsSchedule) {
        const totalMins = mergedTasks.filter((t) => !t.done).reduce((sum, t) => sum + (parseInt(t.duration) || 0), 0);
        const FIT_LIMIT = 270;
        if (totalMins > FIT_LIMIT) {
          wantsSchedule = false;
          const hrs = Math.round(totalMins / 6) / 10;
          await streamAuraMessage(`quick pause — that's about ${hrs} hours of focused work, and tonight's window only fits ~4.5 hours after dinner, shower, and breaks.\n\nwhat feels right:\n• shave one task (e.g. SAT prep → 1 hour instead of 2)?\n• move one to tomorrow?\n• split a longer task across two evenings?\n\ntell me which and i'll adjust.`);
          showToast("too much for one evening — let's tradeoff", "warning");
        }
      }

      const shouldReplan = wantsSchedule || ((updates.length > 0 || removals.length > 0) && (aiSchedule[todayISO()] || []).length > 0);
      if (shouldReplan) {
        await runPlanner(msg, mergedTasks);
      }
    } catch {
      const fb = AURA_FALLBACKS.default;
      setChat((c) => [...c, { from: "aura", text: fb[Math.floor(Math.random() * fb.length)] }]);
    } finally {
      setChatBusy(false);
    }
  }

  function addSuggestedTask(t, msgIdx, sugIdx) {
    setTasks((ts) => [
      ...ts,
      { id: Date.now() + Math.random(), name: t.name, duration: String(t.duration || 30), deadline: todayISO(), category: "personal", done: false }
    ]);
    setChat((c) => c.map((m, i) => {
      if (i !== msgIdx) return m;
      const next = (m.suggestedTasks || []).filter((_, j) => j !== sugIdx);
      return { ...m, suggestedTasks: next };
    }));
    showToast(`added "${t.name}"`, "success");
  }

  const tasksOnDay = tasks.filter((t) => {
    if (!t.deadline) return false;
    return isSameDay(new Date(t.deadline + "T00:00:00"), calendarDate);
  });
  const isToday = isSameDay(calendarDate, new Date());
  const dateKey = calendarDate.toISOString().slice(0, 10);
  const aiBlocks = aiSchedule[dateKey] || [];

  function fmtHHMM(hoursDecimal) {
    const h = Math.floor(hoursDecimal);
    const m = Math.round((hoursDecimal - h) * 60);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  const taskByName = new Map(tasks.map((t) => [t.name.trim().toLowerCase(), t]));

  let blocks = aiBlocks;
  if (aiBlocks.length === 0 && tasksOnDay.length > 0) {
    let cursor = 16;
    blocks = tasksOnDay.map((t) => {
      const dur = (parseInt(t.duration) || 30) / 60;
      const start = cursor;
      const end = Math.min(22, cursor + dur);
      cursor = end;
      return {
        startTime: fmtHHMM(start),
        endTime: fmtHHMM(end),
        title: t.name,
        type: "task",
        category: t.category || "personal",
        taskId: t.id,
        done: t.done
      };
    });
  } else if (aiBlocks.length > 0) {
    blocks = aiBlocks.map((b) => {
      if (b.type !== "task") return b;
      const t = taskByName.get(b.title.trim().toLowerCase());
      return t ? { ...b, taskId: t.id, done: t.done } : b;
    });
    const aiTitles = new Set(aiBlocks.filter((b) => b.type === "task").map((b) => b.title.trim().toLowerCase()));
    const newOnes = tasksOnDay.filter((t) => !aiTitles.has(t.name.trim().toLowerCase()));
    if (newOnes.length > 0) {
      const last = aiBlocks[aiBlocks.length - 1];
      let cursor = last ? parseHHMM(last.endTime) : 16;
      const extras = newOnes.map((t) => {
        const dur = (parseInt(t.duration) || 30) / 60;
        const start = cursor;
        const end = Math.min(22, cursor + dur);
        cursor = end;
        return {
          startTime: fmtHHMM(start),
          endTime: fmtHHMM(end),
          title: t.name,
          type: "task",
          category: t.category || "personal",
          taskId: t.id,
          done: t.done
        };
      });
      blocks = [...blocks, ...extras];
    }
  }

  if (!entered) {
    return (
      <div className="landing">
        <div className="landing-glow" aria-hidden="true"></div>
        <div className="landing-inner">
          <div className="landing-logo">
            <div className="logo-icon landing-logo-icon">A</div>
            <span className="landing-logo-text">aura</span>
          </div>
          <h1 className="landing-title">your evening, gently arranged.</h1>
          <p className="landing-sub">a quiet companion for tasks, energy, and rest. no pressure — just a plan that fits how you actually feel.</p>
          <button className="btn-primary landing-cta" onClick={() => setEntered(true)}>get started</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">A</div>
          <span className="logo-text">aura</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${view === "chat" ? "active" : ""}`} onClick={() => setView("chat")}>
            <span className="nav-icon">💬</span>
            <span className="nav-label">talk to aura</span>
          </button>
          <button className={`nav-item ${view === "tasks" ? "active" : ""}`} onClick={() => setView("tasks")}>
            <span className="nav-icon">⚡</span>
            <span className="nav-label">energy map</span>
          </button>
          <button className={`nav-item ${view === "guide" ? "active" : ""}`} onClick={() => setView("guide")}>
            <span className="nav-icon">📖</span>
            <span className="nav-label">how to use</span>
          </button>
        </nav>
        <div className="sidebar-mood" onClick={() => setView("chat")} title="change mood">
          <span className="sidebar-mood-emoji">{(MOODS.find((m) => m.id === mood) || MOODS[2]).emoji}</span>
          <div className="sidebar-mood-meta">
            <span className="sidebar-mood-label">today</span>
            <span className="sidebar-mood-value">{(MOODS.find((m) => m.id === mood) || MOODS[2]).label}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <section className={`view ${view === "tasks" ? "active" : ""}`}>
          <header className="view-header">
            <div>
              <span className="eyebrow">today<span className="eyebrow-dot"></span>4 PM – 10 PM</span>
              <h1 className="view-title">energy map</h1>
              <p className="view-subtitle">drop your tasks. ask aura to arrange your evening.</p>
            </div>
            <button className="btn-primary" onClick={() => setTaskModalOpen(true)}>+ add task</button>
          </header>

          <div className="energy-map-layout">
            <div className="tasks-grid">
              {tasks.length === 0 ? (
                <div className="glass-card empty-state" style={{ gridColumn: "1/-1", textAlign: "center", padding: 56 }}>
                  <div className="empty-emoji">✨</div>
                  <p className="empty-title">a fresh start</p>
                  <p className="empty-sub">add a task to begin shaping your evening — or just say hi to aura.</p>
                </div>
              ) : (
                tasks.map((t) => {
                  const cat = t.category || "personal";
                  const dueDate = t.deadline ? new Date(t.deadline + "T00:00:00") : null;
                  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
                  let dueLabel = "today";
                  if (dueDate) {
                    const diffDays = Math.round((dueDate - todayStart) / 86400000);
                    if (diffDays === 0) dueLabel = "today";
                    else if (diffDays === 1) dueLabel = "tomorrow";
                    else if (diffDays > 1) dueLabel = `in ${diffDays}d`;
                    else dueLabel = "overdue";
                  }
                  return (
                    <div key={t.id} className={`glass-card task-card cat-${cat}${t.done ? " is-done" : ""}`}>
                      <div className="task-rail" aria-hidden="true"></div>
                      <div className="task-header">
                        <div>
                          <div className="task-name">{t.name}</div>
                          <div className="task-deadline">{fmtDuration(t.duration)}</div>
                        </div>
                        <span className={`task-due-chip ${dueLabel === "overdue" ? "overdue" : ""}`}>{dueLabel}</span>
                      </div>
                      <div className="task-actions">
                        <button className="task-btn done-btn" onClick={() => toggleTask(t.id)}>{t.done ? "undo" : "mark done"}</button>
                        <button className="task-btn" onClick={() => deleteTask(t.id)}>remove</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <aside className="daily-calendar glass-card">
              <div className="calendar-header">
                <button className="cal-nav-btn" onClick={() => setCalendarDate(new Date(calendarDate.getTime() - 86400000))}>←</button>
                <div className="calendar-title">
                  <div className="cal-weekday">
                    {isToday ? "today" : calendarDate.toLocaleDateString(undefined, { weekday: "long" }).toLowerCase()}
                  </div>
                  <div className="cal-date">{fmtCalDate(calendarDate)}</div>
                </div>
                <button className="cal-nav-btn" onClick={() => setCalendarDate(new Date(calendarDate.getTime() + 86400000))}>→</button>
              </div>

              <div className="calendar-hours">
                <div className="cal-grid">
                  {Array.from({ length: 6 }, (_, i) => 16 + i).map((h) => (
                    <div className="cal-hour-row" key={h}>
                      <span className="cal-hour-label">{hourLabel(h)}</span>
                      <div className="cal-hour-line"></div>
                    </div>
                  ))}
                  <div className="cal-hour-row cal-hour-end">
                    <span className="cal-hour-label">10 PM</span>
                    <div className="cal-hour-line"></div>
                  </div>
                  <div className="cal-blocks-layer">
                    {(() => {
                      const palette = ["academic", "creative", "social", "physical", "personal"];
                      let taskColorIdx = 0;
                      return blocks.map((b, i) => {
                        const start = parseHHMM(b.startTime);
                        const end = parseHHMM(b.endTime);
                        const top = ((start - 16) / 6) * 100;
                        const height = ((end - start) / 6) * 100;
                        let cat;
                        if (b.type === "dinner") cat = "social";
                        else if (b.type === "shower") cat = "physical";
                        else if (b.type === "sleep") cat = "personal";
                        else if (b.type === "winddown") cat = "winddown";
                        else if (b.type === "break") cat = "personal";
                        else if (b.type === "free") cat = "free";
                        else { cat = palette[taskColorIdx % palette.length]; taskColorIdx++; }
                        const isTaskBlock = b.type === "task" && b.taskId != null;
                        return (
                          <div
                            key={i}
                            className={`cal-task cat-${cat}${b.done ? " is-done" : ""}${isTaskBlock ? " is-clickable" : ""}`}
                            title={b.note || ""}
                            onClick={isTaskBlock ? () => toggleTask(b.taskId) : undefined}
                            style={{ position: "absolute", left: 56, right: 4, top: `${top}%`, height: `${height}%` }}
                          >
                            <span>
                              {b.done && <span className="cal-task-check">✓ </span>}
                              {b.title}{b.type === "sleep" ? "" : ` (${fmtDuration((end - start) * 60)})`}
                            </span>
                            {b.type !== "sleep" && <span className="cal-task-mins">{fmtTimeRange(b.startTime, b.endTime)}</span>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {blocks.length === 0 && (
                  <div className="cal-empty">
                    <div className="cal-empty-emoji">🌙</div>
                    <div className="cal-empty-title">{isToday ? "tonight is open" : "nothing on this day"}</div>
                    <div className="cal-empty-sub">{isToday ? "add a task or ask aura to plan something." : ""}</div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>

        <section className={`view ${view === "chat" ? "active" : ""}`}>
          <header className="view-header">
            <div>
              <span className="eyebrow">companion<span className="eyebrow-dot"></span>always here</span>
              <h1 className="view-title">talk to aura</h1>
              <p className="view-subtitle">vent, ask, plan - i'm here. no judgment.</p>
            </div>
            <div className="aura-online">
              <div className="online-dot"></div>
              <span>aura is online</span>
            </div>
          </header>

          <div className="mood-bar glass-card">
            <div className="mood-bar-label">how are you feeling?</div>
            <div className="mood-picker">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className={`mood-pick ${mood === m.id ? "active" : ""}`}
                  onClick={() => {
                    setMood(m.id);
                    showToast(`got it — feeling ${m.label}`, "success");
                  }}
                  aria-pressed={mood === m.id}
                  title={m.label}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-pick-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="chat-container">
            <div className="chat-messages" ref={chatScroll}>
              {chat.map((m, i) => (
                <div key={i} className={`chat-msg ${m.from}`}>
                  <div className={`msg-avatar ${m.from === "aura" ? "aura-av" : "user-av"}`}>{m.from === "aura" ? "A" : "U"}</div>
                  <div className="msg-bubble">
                    <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, "<br>") + (m.streaming ? '<span class="stream-caret">▍</span>' : "") }} />
                    {m.suggestedTasks && m.suggestedTasks.length > 0 && (
                      <div className="suggested-tasks">
                        {m.suggestedTasks.map((s, j) => (
                          <button key={j} className="suggested-task-btn" onClick={() => addSuggestedTask(s, i, j)}>
                            + {s.name} <span className="suggested-mins">{fmtDuration(s.duration)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatBusy && (
                <div className="chat-msg aura typing-indicator">
                  <div className="msg-avatar aura-av">A</div>
                  <div className="msg-bubble"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                </div>
              )}
            </div>
            <div className="quick-prompts">
              <button className="quick-btn" onClick={() => sendChat("help me arrange my tasks for tonight from 4pm to midnight")}>arrange my evening</button>
              <button className="quick-btn" onClick={() => sendChat("i'm cooked. too much to do and no idea where to start.")}>i'm cooked</button>
              <button className="quick-btn" onClick={() => sendChat("i've been procrastinating on something for days")}>procrastination spiral</button>
              <button className="quick-btn" onClick={() => sendChat("i can't sleep because i'm stressed about tomorrow")}>can't sleep</button>
            </div>
            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder="talk to me... what's going on?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat(chatInput)}
              />
              <button className="send-btn" onClick={() => sendChat(chatInput)} disabled={chatBusy}>↑</button>
            </div>
          </div>
        </section>

        <section className={`view ${view === "guide" ? "active" : ""}`}>
          <header className="view-header">
            <div>
              <span className="eyebrow">getting started<span className="eyebrow-dot"></span>quick tour</span>
              <h1 className="view-title">how to use</h1>
              <p className="view-subtitle">a quick tour of everything aura can do.</p>
            </div>
          </header>

          <div className="guide-grid">
            <div className="glass-card guide-card">
              <div className="guide-num">01</div>
              <h2 className="guide-title">set your mood</h2>
              <p className="guide-text">tap a face at the top of <em>talk to aura</em>. aura's tone, pacing, and the kinds of fillers she suggests adapt to how you feel — softer on tough days, more energetic on good ones.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">02</div>
              <h2 className="guide-title">add tasks two ways</h2>
              <p className="guide-text">open <em>energy map</em> and hit <strong>+ add task</strong>, or just tell aura — "i have 30 min of science and an hour of math test prep." she'll parse multiple tasks and ask for time if you skip it.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">03</div>
              <h2 className="guide-title">arrange your evening</h2>
              <p className="guide-text">say "arrange my evening" or anything similar. aura builds a 4 PM–10 PM plan with 10-min breaks, dinner (5–6 PM), shower (7:30–8:30 PM), wind down, and bed — plus free time, always.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">04</div>
              <h2 className="guide-title">edit through chat</h2>
              <p className="guide-text">"change math to 45 min," "remove the essay, i finished it," "add a 20-min walk" — aura updates the task list <em>and</em> re-plans the calendar in one step.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">05</div>
              <h2 className="guide-title">mark tasks done</h2>
              <p className="guide-text">click any task block on the calendar to mark it done — it goes gray with a green ✓. click again to undo. the energy map card stays in sync.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">06</div>
              <h2 className="guide-title">drop hints in task names</h2>
              <p className="guide-text">name a task "sat reading before sleep" or "first thing math review" and aura honors the placement — bedtime task goes right before bed, "first thing" goes at 4 PM.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">07</div>
              <h2 className="guide-title">light evening, more ideas</h2>
              <p className="guide-text">if your list is short, aura proactively asks what else you'd enjoy — outdoor walk, indoor workout, household chores, EC project — and offers tap-to-add chips.</p>
            </div>

            <div className="glass-card guide-card">
              <div className="guide-num">08</div>
              <h2 className="guide-title">read the calendar</h2>
              <p className="guide-text">colors rotate per task; dinner, shower, wind down, and bed each have their own shade. block height = duration. free-time gaps appear in muted italic.</p>
            </div>
          </div>
        </section>
      </main>

      {taskModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setTaskModalOpen(false)}>
          <div className="modal glass-card">
            <h2 className="modal-title">new task</h2>
            <div className="form-group">
              <label>what's the task?</label>
              <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="e.g. history essay, math test prep..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>how many minutes? (e.g. 25, 45)</label>
                <input type="number" value={taskDuration} onChange={(e) => setTaskDuration(e.target.value)} placeholder="25" min="1" max="240" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setTaskModalOpen(false)}>cancel</button>
              <button className="btn-primary" onClick={addTask}>add to energy map</button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}
