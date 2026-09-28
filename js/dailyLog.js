/* =====================================================================
   dailyLog.js — the daily log pop-up ("sheet")
   ---------------------------------------------------------------------
   Opens from the Today screen, or by tapping a day on the calendar in
   "Log" mode. It builds itself from LOG_SECTIONS (logConfig.js).

   Saved data looks like this (in data.logs):
     "2026-09-28": { flow: "medium", symptoms: ["cramps", "fatigue"],
                     water: 5, note: "Rough day" }
   Only things she actually logged are saved. Empty days take no space.
   ===================================================================== */

let logDay = null; // which day the sheet is showing, e.g. "2026-09-28" (null = closed)

// ---------- Reading & writing a day's log ----------------------------

function getLog(key) {
  return data.logs[key] || {};
}

/** Is this value "empty"? (Nothing picked / typed.) */
function isEmpty(value) {
  return value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

/**
 * Save one field for a day. Empty values are removed, and a day with
 * nothing left is removed entirely.
 */
function setLogValue(key, fieldId, value, { redrawSheet = true } = {}) {
  const log = { ...getLog(key) };
  if (isEmpty(value)) delete log[fieldId];
  else log[fieldId] = value;

  if (Object.keys(log).length) data.logs[key] = log;
  else delete data.logs[key];

  // Picking a flow means it's a period day, so mark it on the calendar too.
  if (fieldId === "flow" && !isEmpty(value) && !data.periodDays.includes(key)) {
    data.periodDays.push(key);
    data.periodDays.sort();
    data.ovulationDays = data.ovulationDays.filter(d => d !== key);
  }

  saveData(data);
  render();                        // update Today / Calendar behind the sheet
  if (redrawSheet) renderLogSheet();
}

// ---------- Summary (used on the Today card) -------------------------

/** Turn a day's log into a list of little chips: [{ emoji, label }, ...] */
function summarizeLog(log) {
  const chips = [];
  for (const section of LOG_SECTIONS) {
    for (const field of section.fields) {
      const value = log[field.id];
      if (isEmpty(value)) continue;
      if (field.type === "single") {
        const o = findOption(field.id, value);
        // e.g. "Energy: OK" so a single choice makes sense on its own
        const name = field.summaryLabel || field.label || section.title;
        if (o) chips.push({ emoji: o.emoji, label: `${name}: ${o.label}` });
      } else if (field.type === "multi") {
        for (const id of value) {
          const o = findOption(field.id, id);
          if (o) chips.push({ emoji: o.emoji, label: o.label });
        }
      } else if (field.type === "number") {
        chips.push({ emoji: section.emoji, label: `${value} ${field.unit}` });
      } else if (field.type === "counter") {
        chips.push({ emoji: section.emoji, label: `${value} ${field.label.toLowerCase()}` });
      } else if (field.type === "text") {
        chips.push({ emoji: section.emoji, label: "Note" });
      }
    }
  }
  return chips;
}

// ---------- Drawing the sheet ----------------------------------------

/** Build the HTML for one field, based on its type. */
function fieldHTML(field, value) {
  const label = field.label ? `<p class="field-label">${field.label}</p>` : "";

  if (field.type === "single" || field.type === "multi") {
    const picked = field.type === "multi" ? (value || []) : [value];
    const chips = field.options.map(o => `
      <button class="chip ${picked.includes(o.id) ? "on" : ""}"
              data-field="${field.id}" data-type="${field.type}" data-option="${o.id}">
        <span>${o.emoji}</span>${o.label}
      </button>`).join("");
    return `${label}<div class="chips">${chips}</div>`;
  }

  if (field.type === "number") {
    return `${label}
      <div class="number-row">
        <input type="number" inputmode="decimal" data-field="${field.id}" data-type="number"
               min="${field.min}" max="${field.max}" step="${field.step}"
               value="${value ?? ""}" placeholder="–" />
        <span class="muted">${field.unit}</span>
      </div>`;
  }

  if (field.type === "counter") {
    const n = value || 0;
    const goal = field.goal ? `<span class="muted small">goal ${field.goal}</span>` : "";
    return `${label}
      <div class="counter">
        <button class="btn-icon" data-field="${field.id}" data-type="counter" data-step="-1" aria-label="Less">−</button>
        <span class="counter-value">${n}</span>
        <button class="btn-icon" data-field="${field.id}" data-type="counter" data-step="1" aria-label="More">+</button>
        ${goal}
      </div>`;
  }

  if (field.type === "text") {
    // The text itself is filled in afterwards (safer than putting it in HTML).
    return `${label}<textarea data-field="${field.id}" data-type="text" rows="3"
              placeholder="${field.placeholder || ""}"></textarea>`;
  }
  return "";
}

function renderLogSheet() {
  if (!logDay) return;
  const log = getLog(logDay);
  const body = $("sheet-body");
  const scroll = body.scrollTop; // keep her place when we redraw

  $("sheet-title").textContent = logDay === todayKey() ? "Today" :
    prettyDate(logDay, { weekday: "long", day: "numeric", month: "long" });
  $("sheet-next").disabled = logDay >= todayKey(); // can't log the future

  body.innerHTML = LOG_SECTIONS.map(section => `
    <section class="log-section">
      <h3>${section.emoji} ${section.title}</h3>
      ${section.fields.map(f => fieldHTML(f, log[f.id])).join("")}
    </section>`).join("");

  // Fill in any notes text now (see fieldHTML).
  body.querySelectorAll('textarea[data-type="text"]').forEach(t => {
    t.value = log[t.dataset.field] || "";
  });
  body.scrollTop = scroll;
}

// ---------- Opening & closing ----------------------------------------

function openLog(key) {
  logDay = key;
  $("sheet-body").scrollTop = 0;
  renderLogSheet();
  document.body.classList.add("sheet-open"); // CSS slides the sheet up
}

function closeLog() {
  // Make sure a number/note she was still typing gets saved.
  document.activeElement?.blur();
  logDay = null;
  document.body.classList.remove("sheet-open");
}

// ---------- Handling taps & typing inside the sheet ------------------
// Wrapped in a function that app.js calls once at startup, because this
// file loads before app.js (where helpers like $ are defined).

function setupDailyLog() {
  $("sheet-body").addEventListener("click", e => {
    const btn = e.target.closest("button[data-field]");
    if (!btn) return;
    const { field, type, option } = btn.dataset;
    const current = getLog(logDay)[field];

    if (type === "single") {
      // Tap the selected one again to clear it.
      setLogValue(logDay, field, current === option ? null : option);
    } else if (type === "multi") {
      const list = current || [];
      setLogValue(logDay, field, list.includes(option)
        ? list.filter(x => x !== option)   // un-pick
        : [...list, option]);              // pick
    } else if (type === "counter") {
      const n = Math.max(0, (current || 0) + Number(btn.dataset.step));
      setLogValue(logDay, field, n || null);
    }
  });

  // Numbers save when she leaves the box ("change").
  $("sheet-body").addEventListener("change", e => {
    const input = e.target;
    if (input.dataset.type !== "number") return;
    const n = parseFloat(input.value.replace(",", ".")); // allow "58,5" too
    const valid = !isNaN(n) && n >= Number(input.min) && n <= Number(input.max);
    setLogValue(logDay, input.dataset.field, valid ? n : null);
  });

  // Notes save as she types, without redrawing (so the keyboard stays open).
  $("sheet-body").addEventListener("input", e => {
    if (e.target.dataset.type !== "text") return;
    setLogValue(logDay, e.target.dataset.field, e.target.value.trim() ? e.target.value : null,
      { redrawSheet: false });
  });

  $("sheet-done").addEventListener("click", closeLog);
  $("sheet-backdrop").addEventListener("click", closeLog);
  $("sheet-prev").addEventListener("click", () => { document.activeElement?.blur(); logDay = addDays(logDay, -1); renderLogSheet(); });
  $("sheet-next").addEventListener("click", () => { document.activeElement?.blur(); logDay = addDays(logDay, 1); renderLogSheet(); });
}
