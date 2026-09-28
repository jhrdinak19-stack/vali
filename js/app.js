/* =====================================================================
   app.js — connects everything to the screen
   ---------------------------------------------------------------------
   The pattern used throughout:
     1. Something happens (she taps a day)
     2. We change `data`
     3. We save it, then call render() to redraw the screen

   render() always rebuilds the screen from `data`, so the screen can
   never get out of sync with what's saved.
   ===================================================================== */

// ---------- App state ------------------------------------------------
let data = loadData();          // everything we save (from storage.js)
let calendarMonth = new Date(); // which month the calendar is showing
calendarMonth.setDate(1);

// Shortcut: $("id") finds an element by id. Saves typing.
const $ = id => document.getElementById(id);

// ---------- Helpers --------------------------------------------------

/** Show a short pop-up message at the bottom. */
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 1800);
}

/** Save data and redraw everything. */
function saveAndRender() {
  saveData(data);
  render();
}

/** Nice date text, e.g. "Mon, 28 Sep". */
function prettyDate(key, opts = { weekday: "short", day: "numeric", month: "short" }) {
  return fromKey(key).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

/** Add or remove a day from her period days. */
function togglePeriodDay(key) {
  const i = data.periodDays.indexOf(key);
  if (i >= 0) data.periodDays.splice(i, 1); // remove it
  else data.periodDays.push(key);           // add it
  data.periodDays.sort();
  saveAndRender();
}

// ---------- Rendering: Today screen ----------------------------------

const PHASE_LABELS = {
  period: "Period",
  follicular: "Follicular phase",
  fertile: "Fertile window",
  ovulation: "Ovulation day",
  luteal: "Luteal phase",
  late: "Period late",
  empty: "Getting started",
};

function renderToday() {
  const today = todayKey();
  const s = getTodaySummary(data.periodDays, data.settings);
  const ring = $("ring");
  ring.className = "ring"; // reset colour classes

  if (s.empty) {
    $("ring-top").textContent = "Welcome";
    $("ring-main").textContent = "🌸";
    $("ring-bottom").textContent = "Log your last period";
  } else if (s.onPeriod) {
    // Count which day of this period it is.
    const current = s.stats.periods[s.stats.periods.length - 1];
    $("ring-top").textContent = "Period";
    $("ring-main").textContent = `Day ${diffDays(current.start, today) + 1}`;
    $("ring-bottom").textContent = `Cycle day ${s.cycleDay}`;
    ring.classList.add("on-period");
  } else if (s.daysUntil < 0) {
    $("ring-top").textContent = "Period late by";
    $("ring-main").textContent = `${-s.daysUntil} day${s.daysUntil === -1 ? "" : "s"}`;
    $("ring-bottom").textContent = `Cycle day ${s.cycleDay}`;
  } else {
    $("ring-top").textContent = s.daysUntil === 0 ? "Period expected" : "Period in";
    $("ring-main").textContent = s.daysUntil === 0 ? "Today" :
      `${s.daysUntil} day${s.daysUntil === 1 ? "" : "s"}`;
    $("ring-bottom").textContent = `Cycle day ${s.cycleDay}`;
    if (s.phase === "fertile") ring.classList.add("fertile");
    if (s.phase === "ovulation") ring.classList.add("ovulation");
  }

  // Button text depends on whether today is already logged.
  $("btn-log-today").textContent = data.periodDays.includes(today)
    ? "Remove today's period log" : "Log period today";

  // Personal message (from personal.js)
  const phase = s.empty ? "empty" : s.phase;
  $("phase-label").textContent = PHASE_LABELS[phase];
  $("personal-message").textContent = getPersonalMessage(phase, today);

  // Quick stats
  if (s.empty) {
    ["stat-next", "stat-fertile"].forEach(id => ($(id).textContent = "–"));
  } else {
    $("stat-next").textContent = prettyDate(s.next.periodStart);
    const f = s.upcomingFertile;
    $("stat-fertile").textContent =
      `${prettyDate(f.fertileStart, { day: "numeric", month: "short" })} – ` +
      prettyDate(f.fertileEnd, { day: "numeric", month: "short" });
  }
  $("stat-cycle").textContent = `${s.stats.avgCycle} days`;
  $("stat-period").textContent = `${s.stats.avgPeriod} days`;
}

// ---------- Rendering: Calendar screen -------------------------------

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  $("cal-title").textContent = calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const stats = getStats(data.periodDays, data.settings);
  const dayMap = buildDayMap(data.periodDays, stats);
  const today = todayKey();

  const grid = $("cal-grid");
  grid.innerHTML = ""; // clear the old month

  // Empty cells before the 1st so days line up under Mon..Sun.
  // getDay() gives Sun=0, Mon=1..., we want Mon=0.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  for (let i = 0; i < firstWeekday; i++) {
    const blank = document.createElement("div");
    blank.className = "day empty";
    grid.appendChild(blank);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = toKey(new Date(year, month, d));
    const btn = document.createElement("button");
    btn.className = "day";
    btn.textContent = d;
    if (dayMap[key]) btn.classList.add(dayMap[key]); // period / predicted / fertile / ovulation
    if (key === today) btn.classList.add("today");

    if (key > today) {
      btn.classList.add("future-disabled"); // can't log the future
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => togglePeriodDay(key));
    }
    grid.appendChild(btn);
  }
}

// ---------- Rendering: Settings screen -------------------------------

function renderSettings() {
  const list = $("theme-list");
  list.innerHTML = "";
  for (const [id, theme] of Object.entries(THEMES)) {
    const btn = document.createElement("button");
    btn.className = "theme-swatch" + (data.settings.theme === id ? " selected" : "");
    btn.style.background = theme.bg;
    btn.style.color = theme.text;
    btn.innerHTML = `<div class="chips">
        <i style="background:${theme.accent}"></i>
        <i style="background:${theme.accent2}"></i>
        <i style="background:${theme.fertile}"></i>
      </div>${theme.label}`;
    btn.addEventListener("click", () => {
      data.settings.theme = id;
      saveAndRender();
    });
    list.appendChild(btn);
  }

  $("set-name").value = data.settings.name;
  $("set-cycle").value = data.settings.cycleLength;
  $("set-period").value = data.settings.periodLength;
}

// ---------- Render everything ----------------------------------------

function render() {
  applyTheme(data.settings.theme);
  $("greeting").textContent = `Hi ${data.settings.name} 🌸`;
  $("today-date").textContent = new Date().toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long" });
  renderToday();
  renderCalendar();
  renderSettings();
}

// ---------- Event listeners (hooking up the buttons) -----------------

// Bottom tabs: show the matching screen.
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    tab.classList.add("active");
    $(`screen-${tab.dataset.screen}`).classList.add("active");
    window.scrollTo(0, 0);
  });
});

$("btn-log-today").addEventListener("click", () => {
  const today = todayKey();
  const wasLogged = data.periodDays.includes(today);
  togglePeriodDay(today);
  toast(wasLogged ? "Removed" : "Logged 🌸");
});

$("cal-prev").addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});
$("cal-next").addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});

// Settings inputs save when she leaves the field ("change" event).
$("set-name").addEventListener("change", e => {
  data.settings.name = e.target.value.trim() || "Vali";
  saveAndRender();
  toast("Saved");
});
$("set-cycle").addEventListener("change", e => {
  const n = Math.min(60, Math.max(15, Number(e.target.value) || 28)); // keep it in range
  data.settings.cycleLength = n;
  saveAndRender();
  toast("Saved");
});
$("set-period").addEventListener("change", e => {
  const n = Math.min(14, Math.max(1, Number(e.target.value) || 5));
  data.settings.periodLength = n;
  saveAndRender();
  toast("Saved");
});

$("btn-export").addEventListener("click", () => exportBackup(data));

$("file-import").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = await importBackup(file);
    data = { ...loadData(), ...imported, settings: { ...data.settings, ...imported.settings } };
    saveAndRender();
    toast("Backup restored");
  } catch (err) {
    toast("That file didn't work");
  }
  e.target.value = ""; // allow picking the same file again
});

// "Delete all data" needs two taps so it can't happen by accident.
$("btn-reset").addEventListener("click", e => {
  const btn = e.currentTarget;
  if (btn.dataset.armed) {
    data = structuredClone(DEFAULT_DATA);
    saveAndRender();
    toast("All data deleted");
    delete btn.dataset.armed;
    btn.textContent = "Delete all data";
  } else {
    btn.dataset.armed = "yes";
    btn.textContent = "Tap again to confirm";
    setTimeout(() => {
      delete btn.dataset.armed;
      btn.textContent = "Delete all data";
    }, 4000);
  }
});

// Re-render when she comes back to the app (e.g. the next day).
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

// ---------- Offline support ------------------------------------------
// The service worker (sw.js) saves the app files on the phone so it
// opens instantly and works without internet.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW failed", err));
}

// ---------- Start! ---------------------------------------------------
render();
