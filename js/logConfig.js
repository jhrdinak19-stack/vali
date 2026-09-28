/* =====================================================================
   logConfig.js — what she can log each day
   ---------------------------------------------------------------------
   Every section of the daily log is described here. The app builds the
   log screen from this list automatically, so to change what she can log
   you only edit this file:

   • Add an option:    add a line like { id: "migraine", label: "Migraine", emoji: "🤕" }
   • Remove an option: delete its line. (Old logs that used it are kept,
                       they just won't show.)
   • Reorder:          move sections or options up/down.

   ⚠ Don't change an option's `id` after she has started logging:
     the id is what's saved. You CAN change the label and emoji any time.

   Field types:
     single  – pick one (tap again to un-pick)
     multi   – pick any number
     number  – type a number (with unit, min, max, step)
     counter – − and + buttons (e.g. glasses of water)
     text    – free text

   `sensitive: true` marks sections we'll let her hide later (feature #29).
   ===================================================================== */

const LOG_SECTIONS = [
  {
    id: "flow", title: "Flow", emoji: "🩸",
    fields: [{
      id: "flow", type: "single",
      // Picking a flow also marks the day as a period day.
      options: [
        { id: "light",    label: "Light",      emoji: "💧" },
        { id: "medium",   label: "Medium",     emoji: "💧💧" },
        { id: "heavy",    label: "Heavy",      emoji: "💧💧💧" },
        { id: "veryheavy", label: "Very heavy", emoji: "🌊" },
      ],
    }],
  },
  {
    id: "symptoms", title: "Symptoms", emoji: "🤒",
    fields: [{
      id: "symptoms", type: "multi",
      options: [
        { id: "fine",       label: "All good",        emoji: "👍" },
        { id: "cramps",     label: "Cramps",          emoji: "😣" },
        { id: "headache",   label: "Headache",        emoji: "🤕" },
        { id: "tender",     label: "Tender breasts",  emoji: "💢" },
        { id: "backache",   label: "Backache",        emoji: "🔙" },
        { id: "acne",       label: "Acne",            emoji: "🔴" },
        { id: "fatigue",    label: "Fatigue",         emoji: "🥱" },
        { id: "cravings",   label: "Cravings",        emoji: "🍫" },
        { id: "insomnia",   label: "Insomnia",        emoji: "🌙" },
        { id: "pelvicpain", label: "Pelvic pain",     emoji: "⚡" },
        { id: "jointpain",  label: "Joint pain",      emoji: "🦴" },
        { id: "dizziness",  label: "Dizziness",       emoji: "💫" },
        { id: "hotflash",   label: "Hot flashes",     emoji: "🔥" },
        { id: "clots",      label: "Blood clots",     emoji: "⭕" },
        { id: "itching",    label: "Itching",         emoji: "🌀" },
      ],
    }],
  },
  {
    id: "mood", title: "Mood", emoji: "😊",
    fields: [{
      id: "mood", type: "multi",
      options: [
        { id: "happy",     label: "Happy",       emoji: "😊" },
        { id: "calm",      label: "Calm",        emoji: "😌" },
        { id: "loving",    label: "Loving",      emoji: "🥰" },
        { id: "playful",   label: "Playful",     emoji: "😜" },
        { id: "sensitive", label: "Sensitive",   emoji: "🥺" },
        { id: "swings",    label: "Mood swings", emoji: "🎢" },
        { id: "irritable", label: "Irritable",   emoji: "😤" },
        { id: "sad",       label: "Sad",         emoji: "😢" },
        { id: "anxious",   label: "Anxious",     emoji: "😰" },
        { id: "stressed",  label: "Stressed",    emoji: "😫" },
        { id: "unmotivated", label: "Unmotivated", emoji: "😶" },
      ],
    }],
  },
  {
    id: "energy", title: "Energy", emoji: "⚡",
    fields: [{
      id: "energy", type: "single",
      options: [
        { id: "exhausted", label: "Exhausted", emoji: "🪫" },
        { id: "low",       label: "Low",       emoji: "🔋" },
        { id: "ok",        label: "OK",        emoji: "🙂" },
        { id: "high",      label: "High",      emoji: "🚀" },
      ],
    }],
  },
  {
    id: "digestion", title: "Digestion", emoji: "🫄",
    fields: [{
      id: "digestion", type: "multi",
      options: [
        { id: "good",         label: "All good",     emoji: "👍" },
        { id: "bloating",     label: "Bloating",     emoji: "🎈" },
        { id: "nausea",       label: "Nausea",       emoji: "🤢" },
        { id: "gas",          label: "Gas",          emoji: "💨" },
        { id: "constipation", label: "Constipation", emoji: "🧱" },
        { id: "diarrhea",     label: "Diarrhea",     emoji: "🚽" },
      ],
    }],
  },
  {
    id: "discharge", title: "Discharge", emoji: "💧",
    fields: [{
      id: "discharge", type: "single",
      options: [
        { id: "none",     label: "None / dry", emoji: "🌵" },
        { id: "sticky",   label: "Sticky",     emoji: "🍯" },
        { id: "creamy",   label: "Creamy",     emoji: "🥛" },
        { id: "eggwhite", label: "Egg white",  emoji: "🥚" },
        { id: "watery",   label: "Watery",     emoji: "💧" },
        { id: "spotting", label: "Spotting",   emoji: "🔸" },
        { id: "unusual",  label: "Unusual",    emoji: "⚠️" },
      ],
    }],
  },
  {
    id: "sex", title: "Sex & sex drive", emoji: "💕", sensitive: true,
    fields: [
      {
        id: "sex", type: "multi", label: "Sex",
        options: [
          { id: "none",        label: "Didn't have sex", emoji: "🚫" },
          { id: "protected",   label: "Protected",       emoji: "🛡️" },
          { id: "unprotected", label: "Unprotected",     emoji: "❗" },
          { id: "solo",        label: "Solo",            emoji: "✨" },
        ],
      },
      {
        id: "sexDrive", type: "single", label: "Sex drive",
        options: [
          { id: "low",    label: "Low",    emoji: "🧊" },
          { id: "normal", label: "Normal", emoji: "🙂" },
          { id: "high",   label: "High",   emoji: "🔥" },
        ],
      },
    ],
  },
  {
    id: "sleep", title: "Sleep", emoji: "😴",
    fields: [
      { id: "sleepHours", type: "number", label: "Hours slept", unit: "h", min: 0, max: 24, step: 0.5 },
      {
        id: "sleepQuality", type: "single", label: "Quality", summaryLabel: "Sleep",
        options: [
          { id: "poor",  label: "Poor",  emoji: "😩" },
          { id: "ok",    label: "OK",    emoji: "😐" },
          { id: "great", label: "Great", emoji: "😴" },
        ],
      },
    ],
  },
  {
    id: "water", title: "Water", emoji: "🥤",
    fields: [{ id: "water", type: "counter", label: "Glasses", goal: 8 }],
  },
  {
    id: "weight", title: "Weight", emoji: "⚖️", sensitive: true,
    fields: [{ id: "weight", type: "number", label: "Weight", unit: "kg", min: 20, max: 300, step: 0.1 }],
  },
  {
    id: "exercise", title: "Exercise", emoji: "🏃‍♀️",
    fields: [
      {
        id: "exercise", type: "multi",
        options: [
          { id: "walking",  label: "Walking",  emoji: "🚶‍♀️" },
          { id: "running",  label: "Running",  emoji: "🏃‍♀️" },
          { id: "gym",      label: "Gym",      emoji: "🏋️‍♀️" },
          { id: "yoga",     label: "Yoga",     emoji: "🧘‍♀️" },
          { id: "pilates",  label: "Pilates",  emoji: "🤸‍♀️" },
          { id: "cycling",  label: "Cycling",  emoji: "🚴‍♀️" },
          { id: "swimming", label: "Swimming", emoji: "🏊‍♀️" },
          { id: "dancing",  label: "Dancing",  emoji: "💃" },
          { id: "other",    label: "Other",    emoji: "➕" },
        ],
      },
      { id: "exerciseMinutes", type: "number", label: "Minutes", unit: "min", min: 0, max: 600, step: 5 },
    ],
  },
  {
    id: "events", title: "Life events", emoji: "📌",
    fields: [{
      id: "events", type: "multi",
      options: [
        { id: "stress",    label: "Stress",     emoji: "😵" },
        { id: "travel",    label: "Travel",     emoji: "✈️" },
        { id: "sick",      label: "Sick",       emoji: "🤧" },
        { id: "alcohol",   label: "Alcohol",    emoji: "🍷" },
        { id: "latenight", label: "Late night", emoji: "🌃" },
        { id: "bigday",    label: "Big day",    emoji: "🎉" },
      ],
    }],
  },
  {
    id: "meds", title: "Pills & medication", emoji: "💊",
    fields: [{
      id: "meds", type: "multi",
      options: [
        { id: "pill",        label: "Birth control pill", emoji: "💊" },
        { id: "painkiller",  label: "Painkillers",        emoji: "🩹" },
        { id: "vitamins",    label: "Vitamins",           emoji: "🍊" },
        { id: "iron",        label: "Iron",               emoji: "🧲" },
        { id: "antibiotics", label: "Antibiotics",        emoji: "🧪" },
        { id: "other",       label: "Other",              emoji: "➕" },
      ],
    }],
  },
  {
    id: "notes", title: "Notes", emoji: "📝",
    fields: [{ id: "note", type: "text", placeholder: "Anything else about today…" }],
  },
];

/** Find an option's label + emoji, e.g. for showing a summary. */
function findOption(fieldId, optionId) {
  for (const s of LOG_SECTIONS) for (const f of s.fields) {
    if (f.id === fieldId && f.options) return f.options.find(o => o.id === optionId);
  }
  return null;
}
