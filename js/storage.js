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
    name: "Vali",
    theme: "blossom",      // see the themes in css/styles.css
    cycleLength: 28,       // her usual cycle, used until we have real data
    periodLength: 5,       // her usual period length
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

/** Read a backup file the user picked. Returns a Promise with the data. */
function importBackup(file) {
  return file.text().then(text => {
    const data = JSON.parse(text);
    if (!Array.isArray(data.periodDays)) throw new Error("Not a Vali backup file");
    if (!Array.isArray(data.ovulationDays)) data.ovulationDays = []; // older backups
    if (typeof data.logs !== "object" || !data.logs) data.logs = {};
    return data;
  });
}
