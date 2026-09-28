/* =====================================================================
   cycle.js — the "brain" of the app
   ---------------------------------------------------------------------
   Everything here is pure math on dates. No buttons, no screen stuff.
   Keeping it separate makes it easy to test and easy to change.

   KEY IDEA: we only store which days she had her period, as strings
   like "2026-09-01". From those days we work out everything else:
   when each period started, how long her cycles are, and predictions.
   ===================================================================== */

// ---------- Date helpers ---------------------------------------------
// Dates in JavaScript are messy because of time zones and daylight saving.
// To avoid bugs we always use "date keys" (text like "2026-09-28") and
// turn them into Date objects at 12:00 noon UTC when we need to do math.

const DAY_MS = 24 * 60 * 60 * 1000; // milliseconds in one day

/** Turn a Date into a key like "2026-09-28" (using the phone's local date). */
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0"); // months start at 0!
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Turn a key like "2026-09-28" into a Date at noon UTC (safe for math). */
function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Add (or subtract, with a negative number) days to a key. Returns a key. */
function addDays(key, n) {
  const date = new Date(fromKey(key).getTime() + n * DAY_MS);
  return date.toISOString().slice(0, 10); // "2026-09-28T12:00..." -> "2026-09-28"
}

/** Whole days from key a to key b (b - a). */
function diffDays(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / DAY_MS);
}

/** Today's key. */
function todayKey() {
  return toKey(new Date());
}

// ---------- Turning period days into periods -------------------------

/**
 * Group logged period days into separate periods.
 * Example: ["09-01","09-02","09-03","09-29","09-30"] -> two periods.
 * A gap of up to 2 days still counts as the same period (e.g. she
 * forgot to log one day in the middle).
 * Returns: [{ start: "2026-09-01", end: "2026-09-03", length: 3 }, ...]
 */
function groupPeriods(periodDays) {
  const days = [...periodDays].sort(); // keys sort correctly as text
  const periods = [];
  for (const day of days) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, day) <= 2) {
      last.end = day; // continues the current period
    } else {
      periods.push({ start: day, end: day }); // a new period begins
    }
  }
  periods.forEach(p => (p.length = diffDays(p.start, p.end) + 1));
  return periods;
}

/** Average of an array of numbers, rounded. Returns null if empty. */
function average(nums) {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// ---------- Stats & predictions --------------------------------------

/**
 * Work out cycle stats from logged days.
 * settings.cycleLength / settings.periodLength are her "usual" values,
 * used until we have enough real data.
 */
function getStats(periodDays, settings) {
  const periods = groupPeriods(periodDays);

  // Cycle length = days from one period start to the next.
  // We ignore odd values (<15 or >60 days) that are probably logging mistakes.
  const cycleLengths = [];
  for (let i = 1; i < periods.length; i++) {
    const len = diffDays(periods[i - 1].start, periods[i].start);
    if (len >= 15 && len <= 60) cycleLengths.push(len);
  }

  // Use only the last 6 cycles so the average follows recent changes.
  const recentCycles = cycleLengths.slice(-6);
  const recentPeriods = periods.slice(-6).map(p => p.length);

  return {
    periods,
    cycleLengths,
    avgCycle: average(recentCycles) ?? settings.cycleLength,
    avgPeriod: average(recentPeriods) ?? settings.periodLength,
    lastStart: periods.length ? periods[periods.length - 1].start : null,
  };
}

/**
 * Predict the next few cycles.
 * Ovulation usually happens about 14 days BEFORE the next period.
 * The fertile window is roughly 5 days before ovulation to 1 day after.
 * These are estimates only, like Flo's. Not for birth control!
 */
function predictCycles(stats, count = 6) {
  if (!stats.lastStart) return [];
  const predictions = [];
  let start = stats.lastStart;
  for (let i = 0; i < count; i++) {
    const nextStart = addDays(start, stats.avgCycle);
    const ovulation = addDays(nextStart, -14);
    predictions.push({
      periodStart: nextStart,
      periodEnd: addDays(nextStart, stats.avgPeriod - 1),
      ovulation,
      fertileStart: addDays(ovulation, -5),
      fertileEnd: addDays(ovulation, 1),
    });
    start = nextStart;
  }
  return predictions;
}

/**
 * Build a lookup of what each calendar day "is", so the calendar can
 * colour days quickly. Returns an object like:
 *   { "2026-10-01": "predicted", "2026-10-15": "ovulation", ... }
 * Logged days (period / ovulation) win over predictions.
 * Predicted ovulation is "ovulation-predicted" (dashed), logged is "ovulation" (solid).
 */
function buildDayMap(periodDays, stats, ovulationDays = []) {
  const map = {};
  const today = todayKey();

  // Each prediction includes the fertile window BEFORE that period,
  // so the current cycle's fertile days are covered too.
  const cycles = predictCycles(stats);
  for (const c of cycles) {
    // If she logged ovulation in this cycle, skip the guessed ovulation/fertile days.
    const cycleStart = addDays(c.periodStart, -stats.avgCycle);
    const loggedThisCycle = ovulationDays.some(d => d >= cycleStart && d < c.periodStart);
    if (!loggedThisCycle) {
      for (let d = c.fertileStart; d <= c.fertileEnd; d = addDays(d, 1)) map[d] = "fertile";
      map[c.ovulation] = "ovulation-predicted";
    }
    for (let d = c.periodStart; d <= c.periodEnd; d = addDays(d, 1)) {
      if (d > today) map[d] = "predicted"; // only predict the future
    }
  }
  for (const d of ovulationDays) map[d] = "ovulation";
  for (const d of periodDays) map[d] = "period";
  return map;
}

/**
 * The summary for the Today screen: cycle day, days until next period,
 * whether she's late, and which phase she's in.
 */
function getTodaySummary(periodDays, settings, ovulationDays = []) {
  const stats = getStats(periodDays, settings);
  const today = todayKey();
  if (!stats.lastStart) return { stats, empty: true };

  const cycleDay = diffDays(stats.lastStart, today) + 1;
  const next = predictCycles(stats, 1)[0];
  const daysUntil = diffDays(today, next.periodStart);
  const onPeriod = periodDays.includes(today);

  // Phase names, roughly matching what Flo shows.
  let phase;
  if (onPeriod) phase = "period";
  else if (ovulationDays.includes(today)) phase = "ovulation"; // she logged it
  else if (daysUntil < 0) phase = "late";
  else if (today >= next.fertileStart && today <= next.fertileEnd) {
    phase = today === next.ovulation ? "ovulation" : "fertile";
  } else if (today < next.fertileStart) phase = "follicular";
  else phase = "luteal";

  // The next fertile window that hasn't finished yet (this cycle's, or next cycle's if it passed).
  const upcomingFertile = predictCycles(stats, 3).find(c => c.fertileEnd >= today);

  return { stats, next, upcomingFertile, cycleDay, daysUntil, onPeriod, phase, empty: false };
}

// Make these usable in Node too (for testing). Browsers ignore this part.
if (typeof module !== "undefined") {
  module.exports = { toKey, fromKey, addDays, diffDays, todayKey, groupPeriods,
    getStats, predictCycles, buildDayMap, getTodaySummary };
}
