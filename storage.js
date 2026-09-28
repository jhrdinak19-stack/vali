/* =====================================================================
   storage.js — saving and loading her data
   ---------------------------------------------------------------------
   Everything is saved in the phone's browser storage ("localStorage").
   It never leaves her phone. The backup button exports it as a file.

   Once the app is added to the iPhone home screen, iOS keeps this data
   safe. (In a normal Safari tab it could be cleared, so install it!)
   ===================================================================== */

const STORAGE_KEY = "vali-app-data";

// What a brand-new app starts with.
const DEFAULT_DATA = {
  version: 1,              // bump this if we ever change the data shape
  periodDays: [],          // e.g. ["2026-09-01", "2026-09-02"]
  ovulationDays: [],       // days she logged ovulation, same format
  logs: {},                // daily logs: { "2026-09-28": { mood: ["happy"], ... } }
  settings: {
    theme: "blossom",      // see js/themes.js
    cycleLength: 28,       // her usual cycle, used until we have real data
    periodLength: 5,       // her usual period length
    hiddenSections: [],    // daily log sections she has hidden (ids from logConfig.js)
  },
};

/** Load saved data, or the defaults if there's nothing saved yet. */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const saved = JSON.parse(raw);
    // Merge with defaults so new settings we add later get default values.
    return {
      ...structuredClone(DEFAULT_DATA),
      ...saved,
      settings: { ...DEFAULT_DATA.settings, ...saved.settings },
    };
  } catch (err) {
    console.warn("Could not load data, starting fresh", err);
    return structuredClone(DEFAULT_DATA);
  }
}

/** Save data. Returns true if it worked. */
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Could not save data", err);
    return false;
  }
}

/** Download all data as a .json backup file. */
function exportBackup(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `vali-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------- Safety checks for restored backups ------------------------
// A backup file is just text, so someone could hand-edit one. Before we
// use a restored file we rebuild it from scratch, keeping ONLY values
// that look exactly like what the app itself saves. Anything else is
// thrown away. This means a strange file can never run code or show
// unexpected things in the app.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;          // "2026-09-28"
const ID_RE = /^[a-z0-9_-]{1,40}$/i;              // option ids like "cramps"

/** Keep only valid, unique date keys. */
function cleanDates(list) {
  return Array.isArray(list) ? [...new Set(list.filter(d => typeof d === "string" && DATE_RE.test(d)))].sort() : [];
}

/** Clean one day's log using the field types in logConfig.js. */
function cleanLog(log) {
  if (!log || typeof log !== "object" || Array.isArray(log)) return null;
  const fieldTypes = {};
  for (const s of LOG_SECTIONS) for (const f of s.fields) fieldTypes[f.id] = f;

  const clean = {};
  for (const [key, value] of Object.entries(log)) {
    if (!ID_RE.test(key)) continue;
    const f = fieldTypes[key];
    const type = f ? f.type : null;
    if (type === "text") {
      if (typeof value === "string" && value.trim()) clean[key] = value.slice(0, 2000);
    } else if (type === "number" || type === "counter") {
      const n = Number(value);
      const min = f.min ?? 0, max = f.max ?? 100;
      if (typeof value === "number" && Number.isFinite(n) && n >= min && n <= max) clean[key] = n;
    } else if (Array.isArray(value)) {                 // multi (or unknown list)
      const ids = [...new Set(value.filter(v => typeof v === "string" && ID_RE.test(v)))];
      if (ids.length) clean[key] = ids;
    } else if (typeof value === "string" && ID_RE.test(value)) {
      clean[key] = value;                              // single (or unknown choice)
    }
  }
  return Object.keys(clean).length ? clean : null;
}

/** Rebuild a restored backup safely. Returns clean data. */
function sanitizeBackup(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.periodDays)) {
    throw new Error("Not a Vali backup file");
  }
  const logs = {};
  if (raw.logs && typeof raw.logs === "object") {
    for (const [day, log] of Object.entries(raw.logs)) {
      if (!DATE_RE.test(day)) continue;
      const clean = cleanLog(log);
      if (clean) logs[day] = clean;
    }
  }
  const s = raw.settings && typeof raw.settings === "object" ? raw.settings : {};
  const inRange = (v, min, max, fallback) =>
    Number.isInteger(v) && v >= min && v <= max ? v : fallback;
  const sectionIds = LOG_SECTIONS.map(x => x.id);

  return {
    ...structuredClone(DEFAULT_DATA),
    periodDays: cleanDates(raw.periodDays),
    ovulationDays: cleanDates(raw.ovulationDays),
    logs,
    settings: {
      ...DEFAULT_DATA.settings,
      theme: THEMES[s.theme] ? s.theme : DEFAULT_DATA.settings.theme,
      cycleLength: inRange(s.cycleLength, 15, 60, DEFAULT_DATA.settings.cycleLength),
      periodLength: inRange(s.periodLength, 1, 14, DEFAULT_DATA.settings.periodLength),
      hiddenSections: Array.isArray(s.hiddenSections)
        ? s.hiddenSections.filter(id => sectionIds.includes(id)) : [],
    },
  };
}

/** Read a backup file she picked. Returns a Promise with safe, cleaned data. */
function importBackup(file) {
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error("File too big"));
  return file.text().then(text => sanitizeBackup(JSON.parse(text)));
}

/**
 * Make text safe to put inside HTML. Turns characters like < and > into
 * harmless codes so they're shown as text, never treated as code.
 */
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
