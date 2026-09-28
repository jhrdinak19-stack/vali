/* =====================================================================
   insights.js — the Insights tab
   ---------------------------------------------------------------------
   #17 Cycle history      – every cycle as a row with a little bar
   #18 Cycle charts       – cycle length & period length over time
   #20 End-of-cycle report – a summary card for her last finished cycle
   #23 Irregular alerts    – gentle heads-ups when cycles look unusual

   A "cycle" runs from the first day of one period to the day before the
   next period starts. The cycle she's in right now isn't finished, so
   it's shown separately as "Current cycle".
   ===================================================================== */

// ---------- Working out cycles ---------------------------------------

/** All finished cycles (oldest first) and the current one. */
function getCycles() {
  const periods = groupPeriods(data.periodDays);
  const completed = [];
  for (let i = 0; i < periods.length - 1; i++) {
    const start = periods[i].start;
    const nextStart = periods[i + 1].start;
    completed.push({
      start,
      end: addDays(nextStart, -1),
      length: diffDays(start, nextStart),
      periodLength: periods[i].length,
    });
  }
  const last = periods[periods.length - 1];
  const current = last ? {
    start: last.start,
    day: diffDays(last.start, todayKey()) + 1,
    periodLength: last.length,
  } : null;
  return { completed, current };
}

/** Every date key from start to end (inclusive). */
function daysBetween(start, end) {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/**
 * Count how often each option was logged between two dates, for one field.
 * Returns [{ option, count }] sorted most → least.
 */
function countOptions(fieldId, start, end) {
  const counts = {};
  for (const day of daysBetween(start, end)) {
    const v = data.logs[day]?.[fieldId];
    if (v === undefined) continue;
    for (const id of Array.isArray(v) ? v : [v]) counts[id] = (counts[id] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([id, count]) => ({ option: findOption(fieldId, id), count }))
    .filter(x => x.option)                 // skip options removed from logConfig
    .sort((a, b) => b.count - a.count);
}

/** Average of a number field between two dates (null if never logged). */
function averageField(fieldId, start, end) {
  const nums = daysBetween(start, end).map(d => data.logs[d]?.[fieldId]).filter(v => typeof v === "number");
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
}

/** Is a log section switched on (not hidden in Settings)? */
function sectionVisible(id) {
  return !(data.settings.hiddenSections || []).includes(id);
}

// ---------- #23 Irregular cycle alerts -------------------------------
// Based on commonly used guidelines for adults: cycles usually last
// 21–35 days, periods up to 7 days, and cycles that vary by more than
// about 7 days are often described as irregular. These are gentle
// heads-ups, not a diagnosis.

function getCycleAlerts(cycles) {
  const alerts = [];
  const recent = cycles.completed.slice(-6);

  const short = recent.filter(c => c.length < 21);
  const long = recent.filter(c => c.length > 35);
  if (short.length) alerts.push(`${short.length} of your recent cycles ${short.length === 1 ? "was" : "were"} shorter than 21 days.`);
  if (long.length) alerts.push(`${long.length} of your recent cycles ${long.length === 1 ? "was" : "were"} longer than 35 days.`);

  if (recent.length >= 3) {
    const lengths = recent.map(c => c.length);
    const min = Math.min(...lengths), max = Math.max(...lengths);
    if (max - min > 7) alerts.push(`Your last ${recent.length} cycles varied quite a bit, from ${min} to ${max} days.`);
  }

  const longPeriods = groupPeriods(data.periodDays).slice(-6).filter(p => p.length > 7);
  if (longPeriods.length) alerts.push(`${longPeriods.length === 1 ? "One recent period" : `${longPeriods.length} recent periods`} lasted more than 7 days.`);

  const s = getTodaySummary(data.periodDays, data.settings, data.ovulationDays);
  if (!s.empty && s.daysUntil <= -7) alerts.push(`Your period is ${-s.daysUntil} days later than expected.`);

  return alerts;
}

// ---------- #18 Charts (hand-drawn SVG, no outside libraries) --------

/** A bar with a rounded top (4px) and a flat bottom on the baseline. */
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  const base = y + h;
  return `M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} ` +
         `Q${x + w},${y} ${x + w},${y + r} L${x + w},${base} Z`;
}

/**
 * Build a bar chart. One series, so no legend. The title names it.
 * items: [{ value, label, detail }]. `cls` picks the bar colour in CSS.
 */
function barChartSVG(items, { avg, cls, unit }) {
  const W = 320, H = 150, left = 26, right = 8, top = 14, bottom = 22;
  const plotW = W - left - right, plotH = H - top - bottom;
  const maxVal = Math.max(...items.map(i => i.value), avg || 0);
  const yMax = Math.ceil((maxVal * 1.15) / 10) * 10 || 10;   // multiples of 10, so gridlines are whole numbers
  const y = v => top + plotH - (v / yMax) * plotH;
  const slot = plotW / items.length;
  const barW = Math.max(4, Math.min(26, slot - 4));    // leaves at least a 2px gap each side
  const showLabel = i => items.length <= 8 || i % 2 === (items.length - 1) % 2;

  const grid = [yMax / 2, yMax].map(v => `
    <line class="chart-grid" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" />
    <text class="chart-axis" x="${left - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join("");

  const bars = items.map((it, i) => {
    const x = left + slot * i + (slot - barW) / 2;
    const h = Math.max(1, (it.value / yMax) * plotH);
    return `
      <g class="chart-bar" data-i="${i}">
        <rect class="chart-hit" x="${left + slot * i}" y="${top}" width="${slot}" height="${plotH + bottom}" />
        <path class="bar ${cls}" d="${barPath(x, top + plotH - h, barW, h)}" />
        ${showLabel(i) ? `<text class="chart-axis" x="${x + barW / 2}" y="${H - 6}" text-anchor="middle">${escapeHTML(it.label)}</text>` : ""}
      </g>`;
  }).join("");

  const avgLine = avg ? `
    <line class="chart-avg" x1="${left}" x2="${W - right}" y1="${y(avg)}" y2="${y(avg)}" />
    <text class="chart-axis chart-avg-label" x="${W - right}" y="${y(avg) - 4}" text-anchor="end">avg ${avg}${unit}</text>` : "";

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
      ${grid}
      <line class="chart-base" x1="${left}" x2="${W - right}" y1="${top + plotH}" y2="${top + plotH}" />
      ${bars}${avgLine}
    </svg>`;
}

/** Wrap a chart in a card with a title and a "tap a bar" read-out line. */
function chartCard(id, title, items, opts) {
  if (items.length < 2) return "";
  return `
    <div class="card chart-card" id="${id}">
      <p class="card-label">${title}</p>
      <p class="chart-readout muted small" data-default="Tap a bar for details">Tap a bar for details</p>
      ${barChartSVG(items, opts)}
    </div>`;
}

/** Tapping (or hovering) a bar shows its details and highlights it. */
function hookUpCharts(container, itemsById) {
  container.querySelectorAll(".chart-card").forEach(card => {
    const items = itemsById[card.id];
    const readout = card.querySelector(".chart-readout");
    const select = i => {
      card.querySelectorAll(".chart-bar").forEach(g => g.classList.toggle("dim", i !== null && g.dataset.i !== String(i)));
      readout.textContent = i === null ? readout.dataset.default : items[i].detail;
    };
    card.querySelectorAll(".chart-bar").forEach(g => {
      g.addEventListener("click", () => select(Number(g.dataset.i)));
      g.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") select(Number(g.dataset.i)); });
    });
    card.querySelector("svg").addEventListener("pointerleave", e => { if (e.pointerType === "mouse") select(null); });
  });
}

// ---------- #20 End-of-cycle report ----------------------------------

function chipList(list, max = 3) {
  return list.slice(0, max).map(x =>
    `<span class="chip small-chip"><span>${escapeHTML(x.option.emoji)}</span>${escapeHTML(x.option.label)} ×${x.count}</span>`).join("");
}

function cycleReportHTML(cycle, avgCycle) {
  const diff = cycle.length - avgCycle;
  const vsAvg = diff === 0 ? "the same as your average"
    : `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ${diff > 0 ? "longer" : "shorter"} than your average`;
  const short = { day: "numeric", month: "short" };

  const rows = [];
  if (sectionVisible("symptoms")) {
    const top = countOptions("symptoms", cycle.start, cycle.end).filter(x => x.option.id !== "fine");
    if (top.length) rows.push(`<p class="field-label">Most logged symptoms</p><div class="chips-summary">${chipList(top)}</div>`);
  }
  if (sectionVisible("mood")) {
    const top = countOptions("mood", cycle.start, cycle.end);
    if (top.length) rows.push(`<p class="field-label">Most logged moods</p><div class="chips-summary">${chipList(top)}</div>`);
  }
  const extras = [];
  const ov = data.ovulationDays.filter(d => d >= cycle.start && d <= cycle.end);
  if (ov.length) extras.push(`🌿 Ovulation logged ${ov.map(d => prettyDate(d, short)).join(", ")}`);
  if (sectionVisible("sleep")) { const a = averageField("sleepHours", cycle.start, cycle.end); if (a !== null) extras.push(`😴 Avg sleep ${a} h`); }
  if (sectionVisible("water")) { const a = averageField("water", cycle.start, cycle.end); if (a !== null) extras.push(`🥤 Avg water ${a} glasses`); }
  const logged = daysBetween(cycle.start, cycle.end).filter(d => data.logs[d]).length;
  extras.push(`📝 Logged ${logged} of ${cycle.length} days`);

  return `
    <div class="card report-card">
      <p class="card-label">Last cycle report · ${prettyDate(cycle.start, short)} – ${prettyDate(cycle.end, short)}</p>
      <div class="report-big">
        <div><p class="big-number">${cycle.length}</p><p class="muted small">day cycle</p></div>
        <div><p class="big-number">${cycle.periodLength}</p><p class="muted small">day period</p></div>
      </div>
      <p class="small">That's ${vsAvg}.</p>
      ${rows.join("")}
      <ul class="report-extras">${extras.map(e => `<li>${escapeHTML(e)}</li>`).join("")}</ul>
    </div>`;
}

// ---------- #17 Cycle history ----------------------------------------

function historyRowHTML({ start, end, length, periodLength, current }) {
  const short = { day: "numeric", month: "short" };
  const scale = Math.max(40, length);                  // bars share one scale
  const periodPct = Math.min(100, (periodLength / scale) * 100);
  const restPct = Math.max(0, ((length - periodLength) / scale) * 100);
  const ovDots = data.ovulationDays
    .filter(d => d >= start && d <= end)
    .map(d => `<i class="hist-ov" style="left:${((diffDays(start, d) + 0.5) / scale) * 100}%"></i>`).join("");
  return `
    <div class="hist-row">
      <div class="hist-text">
        <span>${current ? "Current cycle" : `${prettyDate(start, short)} – ${prettyDate(end, short)}`}</span>
        <span class="muted small">${current ? `Day ${length}` : `${length} days`} · period ${periodLength} d</span>
      </div>
      <div class="hist-bar">
        <i class="hist-period" style="width:${periodPct}%"></i><i class="hist-rest ${current ? "current" : ""}" style="width:${restPct}%"></i>${ovDots}
      </div>
    </div>`;
}

// ---------- Drawing the whole Insights tab ---------------------------

function renderInsights() {
  const el = $("insights-content");
  const cycles = getCycles();
  const stats = getStats(data.periodDays, data.settings);

  if (!cycles.current) {
    el.innerHTML = `<div class="card"><p class="muted">Log a period on the calendar to start seeing your insights. 🌸</p></div>`;
    return;
  }

  const parts = [];

  // #23 Alerts
  const alerts = getCycleAlerts(cycles);
  if (alerts.length) {
    parts.push(`
      <div class="card alert-card">
        <p class="card-label">ⓘ Worth keeping an eye on</p>
        <ul>${alerts.map(a => `<li>${escapeHTML(a)}</li>`).join("")}</ul>
        <p class="muted small">This isn't a diagnosis. Cycles shift for lots of reasons (stress, travel, illness, sleep).
          If it keeps happening or anything worries you, it's worth mentioning to a doctor. The doctor summary below can help.</p>
      </div>`);
  }

  // #20 Last cycle report
  const lastDone = cycles.completed[cycles.completed.length - 1];
  if (lastDone) parts.push(cycleReportHTML(lastDone, stats.avgCycle));

  // #18 Charts (last 12 finished cycles)
  const recent = cycles.completed.slice(-12);
  const month = c => prettyDate(c.start, { month: "short" });
  const cycleItems = recent.map(c => ({ value: c.length, label: month(c),
    detail: `Cycle from ${prettyDate(c.start, { day: "numeric", month: "short" })}: ${c.length} days` }));
  const periodItems = recent.map(c => ({ value: c.periodLength, label: month(c),
    detail: `Period from ${prettyDate(c.start, { day: "numeric", month: "short" })}: ${c.periodLength} days` }));
  parts.push(chartCard("chart-cycle", "Cycle length (days)", cycleItems, { avg: stats.avgCycle, cls: "bar-cycle", unit: "d" }));
  parts.push(chartCard("chart-period", "Period length (days)", periodItems, { avg: stats.avgPeriod, cls: "bar-period", unit: "d" }));
  if (recent.length < 2) {
    parts.push(`<div class="card"><p class="muted small">Charts appear once you have two finished cycles logged.</p></div>`);
  }

  // #17 History (newest first), current cycle on top
  const rows = [historyRowHTML({ start: cycles.current.start, end: todayKey(), length: cycles.current.day,
    periodLength: cycles.current.periodLength, current: true })];
  for (const c of [...cycles.completed].reverse()) rows.push(historyRowHTML(c));
  parts.push(`
    <div class="card">
      <p class="card-label">Cycle history</p>
      <div class="hist-legend muted small"><span><i class="dot period"></i>Period</span><span><i class="dot ovulation"></i>Ovulation</span></div>
      ${rows.join("")}
    </div>`);

  // #22 Doctor summary button
  parts.push(`<button class="btn-secondary wide" id="btn-open-report">🩺 Doctor summary</button>`);

  el.innerHTML = parts.join("");
  hookUpCharts(el, { "chart-cycle": cycleItems, "chart-period": periodItems });
  $("btn-open-report").addEventListener("click", openReport);
}
