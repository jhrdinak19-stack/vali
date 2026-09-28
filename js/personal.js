/* =====================================================================
   personal.js — YOUR personal touches ❤
   ---------------------------------------------------------------------
   This is the file to edit to make the app feel like it's from you.
   You don't need to touch the other files to change the messages.
   ===================================================================== */

// The greeting at the top of every screen.
const GREETING = "Hello Love ❤️";

// One of these shows on the Today screen, depending on her cycle phase.
// Add as many as you like. A random one is picked each day.
const PHASE_MESSAGES = {
  period: [
    "Cosy blanket + snacks mode activated. 🍫",
    "Take it easy today, you're doing amazing.",
    "Stay strong baby, you're doing great!!!",
  ],
  follicular: [
    "Energy's coming back, go conquer the day!",
    "You're glowing lately, just saying. ✨",
  ],
  fertile: [
    "Feeling extra confident? That's the hormones. And you.",
  ],
  ovulation: [
    "Peak energy day, make it a good one!",
  ],
  luteal: [
    "PMS week might be sneaking up. Be gentle with yourself. 🌿",
    "Cravings are valid. All of them.",
  ],
  late: [
    "Your period's a little late. Stress and travel can shift things. Log it when it comes.",
  ],
  empty: [
    "Welcome! Tap the calendar and mark the days of your last period to get started. 🌸",
  ],
};

// Special notes for specific dates. These replace the phase message on that day.
//   "MM-DD": "message"       -> shows EVERY year (birthdays, anniversaries)
//   "YYYY-MM-DD": "message"  -> shows on that one date only
// Always use two digits: March 8 is "03-08", not "3-8".
const DATE_NOTES = {
   "2026-12-24": "Merry Christmas Eve! Check under the tree 🎄",
   "2027-03-08" : "Happy Anniversary Baby, I love youuu!!!",
};

/** Pick today's message. Uses the date as a "seed" so it doesn't change on every refresh. */
function getPersonalMessage(phase, dateKey) {
  if (DATE_NOTES[dateKey]) return DATE_NOTES[dateKey];                   // exact date
  if (DATE_NOTES[dateKey.slice(5)]) return DATE_NOTES[dateKey.slice(5)]; // "MM-DD", every year
  const list = PHASE_MESSAGES[phase] || PHASE_MESSAGES.follicular;
  const seed = Number(dateKey.replaceAll("-", "")); // e.g. 20260928
  return list[seed % list.length];
}
