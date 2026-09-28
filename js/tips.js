/* =====================================================================
   tips.js — a small tip for each cycle phase (feature #21)
   ---------------------------------------------------------------------
   One tip shows on the Today screen each day, based on her phase.
   Edit these freely. Add as many as you like, and one is picked per day.
   They're general wellbeing tips, not medical advice.
   ===================================================================== */

const PHASE_TIPS = {
  period: [
    "A heat pad or warm bath can help relax cramping muscles.",
    "Gentle movement like walking or stretching can ease cramps for some people.",
    "Iron-rich foods (leafy greens, beans, red meat) help replace what's lost during your period.",
    "Staying hydrated can help with bloating and headaches.",
    "Rest is productive too. It's okay to slow down this week.",
  ],
  follicular: [
    "Energy often rises after your period, a good time to try a harder workout.",
    "Many people feel more social and creative in this phase. Make plans!",
    "A great week to start something new or tackle a big task.",
  ],
  fertile: [
    "You might notice clearer, stretchier discharge around now. It's a normal sign of ovulation approaching.",
    "Energy and confidence often peak around this time.",
  ],
  ovulation: [
    "Some people feel a twinge on one side of the lower belly around ovulation. That's usually normal.",
    "Peak energy for many. Enjoy it!",
  ],
  luteal: [
    "Cravings are common now. Magnesium-rich snacks like dark chocolate or nuts can help.",
    "Sleep can get lighter before your period. A calm bedtime routine can help.",
    "Cutting back on salt and caffeine may ease bloating and breast tenderness.",
    "Mood dips before a period are common. Be kind to yourself.",
    "Lighter exercise like yoga or walks can feel better than intense workouts now.",
  ],
  late: [
    "Stress, travel, illness and sleep changes can all delay a period.",
    "If there's any chance you could be pregnant, a test can give you peace of mind.",
    "A late period now and then is common. If it keeps happening, it's worth mentioning to a doctor.",
  ],
  empty: [
    "Log your last period on the calendar and predictions will start right away.",
  ],
};

/** Pick today's tip for a phase. Changes daily, stays the same all day. */
function getPhaseTip(phase, dateKey) {
  const list = PHASE_TIPS[phase] || PHASE_TIPS.follicular;
  const seed = Math.floor(fromKey(dateKey).getTime() / 86400000); // days since 1970
  return list[(seed + 1) % list.length];
}
