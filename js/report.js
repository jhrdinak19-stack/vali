/* =====================================================================
   report.js — the doctor summary (feature #22)
   ---------------------------------------------------------------------
   A clean, printable summary of her cycles and logs to show a doctor.
   She chooses the time range and exactly which sections to include.
   Private sections (marked `sensitive: true` in logConfig.js) and Notes
   start switched OFF, so nothing private is included unless she chooses.

   "Print / Save as PDF" uses the phone's own print screen. On iPhone,
   she can pinch-out on the print preview (or use Share) to save a PDF.
   Nothing is uploaded; the report is built on the phone.
   ===================================================================== */

let reportMonths = 6;            // time range: 3, 6, 12 or 0 (= all)
let reportSections = null;       // which log sections to include (a Set of ids)

/** Sections included by default: visible, not sensitive, not notes. */
function defaultReportSections() {
  return new Set(visibleSections().filter(s => !s.sensitive && s.id !== "notes").map(s => s.id));
}

function openReport() {
  if (logDay) closeLog();
  if (!reportSections) reportSections = defaultReportSections();
  // Drop any section she has since hidden in Settings
  for (const id of reportSections) if (!sectionVisible(id)) reportSections.delete(id);
  renderReport();
  document.body.classList.add("report-open");
  $("report-view").scrollTop = 0;
}

function closeReport() {
  document.body.classList.remove("report-open");
}

// ---------- Building the report --------------------------------------

function reportRangeStart() {
  if (!reportMonths) return "0000-01-01";
  const d = new Date();
  d.setMonth(d.getMonth() - reportMonths);
  return toKey(d);
}

/** One section of the report, e.g. "Symptoms: Cramps 6 days, Headache 2 days". */
function reportSectionHTML(section, start, end) {
  const lines = [];
  for (const field of section.fields) {
    const name = field.label || section.title;
    if (field.type === "single" || field.type === "multi") {
      const counts = countOptions(field.id, start, end);
      if (counts.length) {
        lines.push(`<tr><th>${escapeHTML(name)}</th><td>${counts.map(c =>
          `${escapeHTML(c.option.label)} <span class="muted">(${c.count} day${c.count === 1 ? "" : "s"})</span>`).join(", ")}</td></tr>`);
      }
    } else if (field.type === "number" || field.type === "counter") {
      const values = daysBetween(start, end).map(d => data.logs[d]?.[field.id]).filter(v => typeof v === "number");
      if (values.length) {
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
        const unit = field.unit || (field.type === "counter" ? field.label.toLowerCase() : "");
        lines.push(`<tr><th>${escapeHTML(name)}</th><td>avg ${avg} ${escapeHTML(unit)}
          <span class="muted">(range ${Math.min(...values)}–${Math.max(...values)}, ${values.length} days logged)</span></td></tr>`);
      }
    } else if (field.type === "text") {
      const notes = daysBetween(start, end).filter(d => data.logs[d]?.[field.id]);
      if (notes.length) {
        lines.push(`<tr><th>${escapeHTML(name)}</th><td>${notes.map(d =>
          `<div><b>${prettyDate(d, { day: "numeric", month: "short", year: "numeric" })}:</b> ${escapeHTML(data.logs[d][field.id])}</div>`).join("")}</td></tr>`);
      }
    }
  }
  if (!lines.length) return "";
  return `<h3>${escapeHTML(section.title)}</h3><table class="report-table">${lines.join("")}</table>`;
}

function renderReport() {
  const start = reportRangeStart();
  const end = todayKey();
  const long = { day: "numeric", month: "short", year: "numeric" };
  const { completed, current } = getCycles();
  const inRange = completed.filter(c => c.start >= start);

  // --- Options (hidden when printing) ---
  $("report-range").innerHTML = [3, 6, 12, 0].map(m => `
    <button class="chip ${reportMonths === m ? "on" : ""}" data-months="${m}">${m ? `${m} months` : "All"}</button>`).join("");
  $("report-sections").innerHTML = visibleSections().map(s => `
    <button class="chip ${reportSections.has(s.id) ? "on" : ""}" data-section="${s.id}">
      <span>${escapeHTML(s.emoji)}</span>${escapeHTML(s.title)}${s.sensitive || s.id === "notes" ? " 🔒" : ""}</button>`).join("");

  // --- The report itself ---
  const lengths = inRange.map(c => c.length);
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;
  const overview = [
    ["Finished cycles in this period", inRange.length],
    ["Average cycle length", lengths.length ? `${avg(lengths)} days` : "–"],
    ["Shortest / longest cycle", lengths.length ? `${Math.min(...lengths)} / ${Math.max(...lengths)} days` : "–"],
    ["Average period length", inRange.length ? `${avg(inRange.map(c => c.periodLength))} days` : "–"],
    ["Most recent period started", current ? prettyDate(current.start, long) : "–"],
  ];

  const cycleRows = [...inRange].reverse().map(c => `
    <tr><td>${prettyDate(c.start, long)}</td><td>${c.length} days</td><td>${c.periodLength} days</td></tr>`).join("");

  const sections = visibleSections()
    .filter(s => reportSections.has(s.id))
    .map(s => reportSectionHTML(s, start, end)).join("");

  $("report-body").innerHTML = `
    <h1>Cycle summary</h1>
    <p class="muted small">${reportMonths ? `${prettyDate(start, long)} – ` : "All data up to "}${prettyDate(end, long)}
      · created ${prettyDate(end, long)}</p>

    <h3>Overview</h3>
    <table class="report-table">${overview.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>

    <h3>Cycles</h3>
    ${cycleRows ? `<table class="report-table cycles"><tr><th>Started</th><th>Cycle length</th><th>Period length</th></tr>${cycleRows}</table>`
                : `<p class="muted small">No finished cycles in this time range.</p>`}

    ${sections}

    <p class="report-footnote">Self-tracked in a personal app. Cycle lengths come from the logged period start dates.
      Counts are the number of days each item was logged.</p>`;
}

// ---------- Buttons (called once from app.js) ------------------------

function setupReport() {
  $("report-close").addEventListener("click", closeReport);
  $("report-print").addEventListener("click", () => window.print());

  $("report-range").addEventListener("click", e => {
    const btn = e.target.closest("[data-months]");
    if (!btn) return;
    reportMonths = Number(btn.dataset.months);
    renderReport();
  });
  $("report-sections").addEventListener("click", e => {
    const btn = e.target.closest("[data-section]");
    if (!btn) return;
    const id = btn.dataset.section;
    reportSections.has(id) ? reportSections.delete(id) : reportSections.add(id);
    renderReport();
  });
}
