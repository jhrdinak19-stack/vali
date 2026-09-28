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

// ---------- Version --------------------------------------------------
// Bump this with every update you upload (and the CACHE name in sw.js too).
// It shows at the bottom of Settings so you can check which version a phone has.
const APP_VERSION = 7;

// ---------- App state ------------------------------------------------
let data = loadData();          // everything we save (from storage.js)
// The PIN lock was removed in v5. Clear any old PIN left over from v4.
if ("pinHash" in data.settings || "pinSalt" in data.settings) {
  delete data.settings.pinHash;
  delete data.settings.pinSalt;
  saveData(data);
}
let calendarMonth = new Date(); // which month the calendar is showing
calendarMonth.setDate(1);
let markMode = "log";           // what tapping a calendar day does: "log", "period" or "ovulation"

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
    // Not a period day any more, so its flow no longer makes sense.
    if (kind === "period" && data.logs[key]?.flow) {
      delete data.logs[key].flow;
      if (!Object.keys(data.logs[key]).length) delete data.logs[key];
    }
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
  $("phase-tip").textContent = getPhaseTip(phase, today);          // tips.js (#21)

  // "Your last cycle report is ready" for the first 3 days of a new cycle (#20)
  const hasFinishedCycle = groupPeriods(data.periodDays).length >= 2;
  $("report-banner").hidden = !(hasFinishedCycle && !s.empty && s.cycleDay <= 3);

  renderGlance(s, phase, today);

  // Today's log card: little chips for everything logged today
  const chips = summarizeLog(getLog(today));
  $("log-summary").innerHTML = chips.length
    ? chips.map(c => `<span class="chip on small-chip"><span>${escapeHTML(c.emoji)}</span>${escapeHTML(c.label)}</span>`).join("")
    : `<p class="muted small">How are you feeling today? Tap to log symptoms, mood and more.</p>`;
  $("log-card").querySelector(".log-card-action").textContent = chips.length ? "Edit" : "＋ Log";

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

// ---------- Today at a glance (#34) ----------------------------------
// Small tiles: phase, water (tap to add a glass), sleep and mood.
// Tiles for hidden log sections are left out.

function renderGlance(s, phase, today) {
  const log = getLog(today);
  const SHORT = { period: "Period", follicular: "Follicular", fertile: "Fertile", ovulation: "Ovulation", luteal: "Luteal", late: "Late" };
  const tiles = [{ label: "Phase", value: s.empty ? "–" : SHORT[phase], action: "none" }];

  if (sectionVisible("water")) {
    const water = LOG_SECTIONS.find(x => x.id === "water").fields[0];
    tiles.push({ label: "Water · tap +1", value: `${log.water || 0}/${water.goal}`, action: "water" });
  }
  if (sectionVisible("sleep")) {
    tiles.push({ label: "Sleep", value: log.sleepHours ? `${log.sleepHours} h` : "–", action: "log" });
  }
  if (sectionVisible("mood")) {
    const mood = log.mood?.length ? findOption("mood", log.mood[0]) : null;
    tiles.push({ label: "Mood", value: mood ? mood.emoji : "–", action: "log" });
  }

  $("glance").innerHTML = tiles.map(t => `
    <button class="glance-tile" data-action="${t.action}" ${t.action === "none" ? "disabled" : ""}>
      <span class="glance-value">${escapeHTML(t.value)}</span>
      <span class="glance-label">${escapeHTML(t.label)}</span>
    </button>`).join("");
}

// ---------- Rendering: Calendar screen -------------------------------

/**
 * Did she log intercourse on this day? (Protected or unprotected, from
 * the Sex section.) Returns false if she has hidden that section, so the
 * heart never shows when she's chosen to keep it out of sight.
 */
function hadIntercourse(key) {
  if (!sectionVisible("sex")) return false;
  const sex = data.logs[key]?.sex || [];
  return sex.includes("protected") || sex.includes("unprotected");
}

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
    if (data.logs[key]) btn.classList.add(hadIntercourse(key) ? "has-heart" : "has-log"); // ♥ or small dot

    if (key > today) {
      btn.classList.add("future-disabled"); // can't log the future
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () =>
        markMode === "log" ? openLog(key) : toggleDay(markMode, key));
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
      </div>${escapeHTML(theme.label)}`;
    btn.addEventListener("click", () => {
      data.settings.theme = id;
      saveAndRender();
    });
    list.appendChild(btn);
  }

  // Log section switches (#29)
  const hidden = data.settings.hiddenSections || [];
  $("section-toggles").innerHTML = LOG_SECTIONS.map(sec => `
    <label class="toggle-row">
      <span>${escapeHTML(sec.emoji)} ${escapeHTML(sec.title)}</span>
      <input type="checkbox" class="switch" data-section="${sec.id}" ${hidden.includes(sec.id) ? "" : "checked"} />
    </label>`).join("");


  $("set-cycle").value = data.settings.cycleLength;
  $("set-period").value = data.settings.periodLength;
}

// ---------- Render everything ----------------------------------------

function render() {
  // Version first, so it always shows (handy for checking updates).
  $("app-version").textContent = `Version ${APP_VERSION}`;
  applyTheme(data.settings.theme);
  $("greeting").textContent = GREETING; // set in personal.js
  $("today-date").textContent = new Date().toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long" });

  // Draw each screen separately. If one screen has a problem, the others
  // still work, and the broken one shows a small note instead of going blank.
  safeRender("screen-today", renderToday);
  safeRender("screen-calendar", renderCalendar);
  safeRender("screen-settings", renderSettings);
  safeRender("screen-insights", renderInsights); // insights.js
}

/** Run one screen's drawing code. On an error, show a note rather than a blank screen. */
function safeRender(screenId, fn) {
  const note = $(screenId).querySelector(".render-error");
  try {
    fn();
    note?.remove();
  } catch (err) {
    console.error(`Problem drawing ${screenId}:`, err);
    if (!note) {
      $(screenId).insertAdjacentHTML("afterbegin",
        `<div class="card render-error">⚠️ Something didn't load on this screen. Close the app fully and open it again.
         If it keeps happening, the update may not have uploaded completely.
         <p class="muted small">${escapeHTML(err.message)}</p></div>`);
    }
  }
}

// ---------- Event listeners (hooking up the buttons) -----------------

// ---------- Switching screens (tabs + swiping) -----------------------

const SCREENS = ["today", "calendar", "insights", "settings"]; // left-to-right order
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
//  • On the calendar's day grid, a sideways swipe changes the MONTH.
//  • Anywhere else, a sideways swipe changes the TAB.
// Charts are fine to swipe on too: a tap on a bar barely moves, a swipe
// moves at least 60px, so the two never get confused.
let touchStartX = null, touchStartY = null, swipeOnCalendar = false;

document.addEventListener("touchstart", e => {
  // Ignore swipes while typing in a box, or while the log sheet / doctor summary is open.
  const busy = ["sheet-open", "report-open"].some(c => document.body.classList.contains(c));
  if (e.target.closest("input, textarea") || busy) {
    touchStartX = null;
    return;
  }
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  swipeOnCalendar = Boolean(e.target.closest("#cal-swipe-area"));
}, { passive: true });

document.addEventListener("touchend", e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX; // + = finger moved right
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = null;

  // Only count it as a swipe if it's long enough and mostly sideways
  // (so scrolling up and down doesn't switch anything).
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

  if (swipeOnCalendar) {
    // Finger moves left = next month (like turning a page), right = previous month.
    changeMonth(dx < 0 ? 1 : -1);
    return;
  }

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
    $("cal-hint").textContent = {
      log: "Tap a day to see or add to its log.",
      period: "Tap a day to mark or unmark it as a period day.",
      ovulation: "Tap a day to mark or unmark it as an ovulation day.",
    }[markMode];
  });
});

/** Move the calendar forward (+1) or back (-1) a month, with a little slide. */
function changeMonth(step) {
  calendarMonth.setMonth(calendarMonth.getMonth() + step);
  renderCalendar();
  const grid = $("cal-grid");
  grid.classList.remove("slide-next", "slide-prev");
  void grid.offsetWidth;                                   // restart the animation
  grid.classList.add(step > 0 ? "slide-next" : "slide-prev");
}

$("cal-prev").addEventListener("click", () => changeMonth(-1));
$("cal-next").addEventListener("click", () => changeMonth(1));

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
    // importBackup checks and cleans the file first (see storage.js)
    data = await importBackup(file);
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

// Today's log card opens the log sheet for today.
$("log-card").addEventListener("click", () => openLog(todayKey()));

// "Report ready" banner goes to the Insights tab.
$("report-banner").addEventListener("click", () => showScreen("insights"));

// Glance tiles: water adds a glass, the others open today's log.
$("glance").addEventListener("click", e => {
  const tile = e.target.closest(".glance-tile");
  if (!tile) return;
  if (tile.dataset.action === "water") {
    const today = todayKey();
    setLogValue(today, "water", (getLog(today).water || 0) + 1, { redrawSheet: false });
    toast("🥤 +1 glass");
  } else if (tile.dataset.action === "log") {
    openLog(todayKey());
  }
});

// Log section switches in Settings (#29)
$("section-toggles").addEventListener("change", e => {
  const id = e.target.dataset.section;
  if (!id) return;
  const hidden = new Set(data.settings.hiddenSections || []);
  e.target.checked ? hidden.delete(id) : hidden.add(id);
  data.settings.hiddenSections = [...hidden];
  saveAndRender();
});

// ---------- Start! ---------------------------------------------------
setupDailyLog(); // hook up the log sheet's buttons (dailyLog.js)
setupReport();   // doctor summary buttons (report.js)
render();
