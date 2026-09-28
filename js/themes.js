/* =====================================================================
   themes.js — colour themes she can choose from
   ---------------------------------------------------------------------
   Each theme is just a list of colours. The styles in css/styles.css
   use these as variables (e.g. var(--accent)), so changing a colour here
   changes it everywhere in the app.

   TO ADD A NEW THEME: copy one block below, give it a new id and
   label, and change the colours. That's it. It shows up in Settings.
   Tip: search "hex color picker" on Google to find colour codes.
   ===================================================================== */

const THEMES = {
  blossom: {
    label: "Blossom",            // pink + green, her favourites
    bg: "#fdf6f8",               // page background
    surface: "#ffffff",          // cards
    text: "#3a2a30",             // main text
    muted: "#8a7a80",            // secondary text
    accent: "#e8628c",           // main pink (buttons, ring)
    accent2: "#7bb88f",          // green highlight
    period: "#e8628c",           // logged period days
    predicted: "#f7c6d4",        // predicted period days
    fertile: "#cfe8d6",          // fertile window
    ovulation: "#7bb88f",        // ovulation day
  },
  rose: {
    label: "Rose",               // soft Flo-like pinks
    bg: "#fff5f7", surface: "#ffffff", text: "#40262e", muted: "#94747e",
    accent: "#f2587e", accent2: "#f59ab1",
    period: "#f2587e", predicted: "#fbd0dc", fertile: "#d9ecf7", ovulation: "#5aa9d6",
  },
  matcha: {
    label: "Matcha",             // green-forward with pink touches
    bg: "#f4f8f2", surface: "#ffffff", text: "#27352b", muted: "#74857a",
    accent: "#5e9e72", accent2: "#e98aa6",
    period: "#e3668d", predicted: "#f6cbd8", fertile: "#d5ead9", ovulation: "#5e9e72",
  },
  lavender: {
    label: "Lavender",
    bg: "#f8f5fd", surface: "#ffffff", text: "#2f2840", muted: "#83799a",
    accent: "#9b7fd4", accent2: "#e98aa6",
    period: "#e3668d", predicted: "#f3cfdc", fertile: "#e3dbf6", ovulation: "#9b7fd4",
  },
  night: {
    label: "Night",              // dark mode, easy on the eyes at night
    bg: "#1d1a1f", surface: "#2a252c", text: "#f4e9ee", muted: "#a898a0",
    accent: "#f07fa2", accent2: "#8fd0a3",
    period: "#f07fa2", predicted: "#6b3f4e", fertile: "#34503d", ovulation: "#8fd0a3",
  },
};

/** Apply a theme by setting CSS variables on the page. */
function applyTheme(id) {
  const theme = THEMES[id] || THEMES.blossom;
  const root = document.documentElement; // the <html> element
  for (const [name, value] of Object.entries(theme)) {
    if (name !== "label") root.style.setProperty(`--${name}`, value);
  }
  // Also colour the iPhone status bar area to match.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);
}
