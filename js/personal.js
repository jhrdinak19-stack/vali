/* =====================================================================
   personal.js — YOUR personal touches ❤
   ---------------------------------------------------------------------
   This is the file to edit to make the app feel like it's from you.
   You don't need to touch the other files to change the messages.
   ===================================================================== */

// One of these shows on the Today screen, depending on her cycle phase.
// Add as many as you like. A random one is picked each day.
const PHASE_MESSAGES = {
  period: [
    "Cosy blanket + snacks mode activated. 🍫",
    "Take it easy today, you're doing amazing.",
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

// Special notes for specific dates ("YYYY-MM-DD": "message").
// These override the phase message on that day. Great for birthdays,
// anniversaries, or a random "I love you" on a Tuesday.
const DATE_NOTES = {
  // "2026-12-24": "Merry Christmas Eve! Check under the tree 🎄",
};

/** Pick today's message. Uses the date as a "seed" so it doesn't change on every refresh. */
function getPersonalMessage(phase, dateKey) {
  if (DATE_NOTES[dateKey]) return DATE_NOTES[dateKey];
  const list = PHASE_MESSAGES[phase] || PHASE_MESSAGES.follicular;
  const seed = Number(dateKey.replaceAll("-", "")); // e.g. 20260928
  return list[seed % list.length];
}
