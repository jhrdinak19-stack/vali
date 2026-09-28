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
let markMode = "period";        // what tapping a calendar day marks: "period" or "ovulation"

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

/**
 * Add or remove a day as a period day or ovulation day.
 * kind is "period" or "ovulation". A day can only be one of the two,
 * so marking it as one removes it from the other.
 */
function toggleDay(kind, key) {
  const list = kind === "period" ? data.periodDays : data.ovulationDays;
  const other = kind === "period" ? data.ovulationDays : data.periodDays;
  const i = list.indexOf(key);
  if (i >= 0) {
    list.splice(i, 1);                        // already marked: remove it
  } else {
    list.push(key);                           // not marked: add it
    list.sort();
    const j = other.indexOf(key);
    if (j >= 0) other.splice(j, 1);           // un-mark it from the other list
  }
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
  const s = getTodaySummary(data.periodDays, data.settings, data.ovulationDays);
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
  }

  // Fill the ring clockwise: cycle day ÷ average cycle length.
  // e.g. day 7 of a 28-day cycle = 25% = the top-right quarter is filled.
  // It stays full if she's late. (100 = empty, 0 = full, because of how SVG dashes work.)
  const progress = s.empty ? 0 : Math.min(1, s.cycleDay / s.stats.avgCycle);
  $("ring-progress").setAttribute("stroke-dashoffset", 100 - progress * 100);

  // Button text depends on whether today is already logged.
  $("btn-log-today").textContent = data.periodDays.includes(today)
    ? "Remove today's period log" : "Log period today";
  $("btn-log-ovulation").textContent = data.ovulationDays.includes(today)
    ? "Remove today's ovulation log" : "Log ovulation today";

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
  const dayMap = buildDayMap(data.periodDays, stats, data.ovulationDays);
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
      btn.addEventListener("click", () => toggleDay(markMode, key));
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

  $("set-cycle").value = data.settings.cycleLength;
  $("set-period").value = data.settings.periodLength;
}

// ---------- Render everything ----------------------------------------

function render() {
  applyTheme(data.settings.theme);
  $("greeting").textContent = GREETING; // set in personal.js
  $("today-date").textContent = new Date().toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long" });
  renderToday();
  renderCalendar();
  renderSettings();
}

// ---------- Event listeners (hooking up the buttons) -----------------

// ---------- Switching screens (tabs + swiping) -----------------------

const SCREENS = ["today", "calendar", "settings"]; // left-to-right order
let currentScreen = "today";

/** Show a screen. The slide direction depends on whether it's to the left or right. */
function showScreen(name) {
  if (name === currentScreen) return;
  const goingRight = SCREENS.indexOf(name) > SCREENS.indexOf(currentScreen);
  currentScreen = name;

  document.querySelectorAll(".tab").forEach(t =>
    t.classList.toggle("active", t.dataset.screen === name));
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.remove("active", "from-left", "from-right"));

  const screen = $(`screen-${name}`);
  screen.classList.add("active", goingRight ? "from-right" : "from-left");
  window.scrollTo(0, 0);
}

// Tapping a tab
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => showScreen(tab.dataset.screen));
});

// Swiping: remember where the finger started, compare where it ended.
let touchStartX = null, touchStartY = null;

document.addEventListener("touchstart", e => {
  // Don't treat typing in a box as a swipe.
  if (e.target.closest("input")) { touchStartX = null; return; }
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX; // + = finger moved right
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = null;

  // Only count it as a swipe if it's long enough and mostly sideways
  // (so scrolling up and down doesn't switch tabs).
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

  const i = SCREENS.indexOf(currentScreen);
  // Swipe left (finger moves left) = go to the next tab on the right, like flipping pages.
  const next = dx < 0 ? SCREENS[i + 1] : SCREENS[i - 1];
  if (next) showScreen(next);
}, { passive: true });

$("btn-log-today").addEventListener("click", () => {
  const today = todayKey();
  const wasLogged = data.periodDays.includes(today);
  toggleDay("period", today);
  toast(wasLogged ? "Removed" : "Period logged 🌸");
});
$("btn-log-ovulation").addEventListener("click", () => {
  const today = todayKey();
  const wasLogged = data.ovulationDays.includes(today);
  toggleDay("ovulation", today);
  toast(wasLogged ? "Removed" : "Ovulation logged 🌿");
});

// Calendar Period / Ovulation switch
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    markMode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b === btn));
    $("cal-hint").textContent = `Tap a day to mark or unmark it as ${
      markMode === "period" ? "a period" : "an ovulation"} day.`;
  });
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
