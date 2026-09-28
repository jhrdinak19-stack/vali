/* =====================================================================
   lock.js — the optional PIN lock (feature #28)
   ---------------------------------------------------------------------
   How it works:
   • She picks a 4-digit PIN in Settings.
   • We never store the PIN itself. We store a "hash": a scrambled
     fingerprint of it made with PBKDF2 (a standard password-scrambling
     method built into the phone's browser). To check a PIN, we scramble
     what she typed the same way and compare the fingerprints.
   • The app locks when it opens and whenever she leaves it (switches
     apps or locks her phone). So the app-switcher preview never shows
     her data either.

   Honest limits: this is a screen lock, like a lock on a diary. It keeps
   people who pick up her phone out of the app. It doesn't encrypt the
   data itself; her iPhone's own passcode is what protects the phone's
   storage.

   Forgot PIN? It can't be recovered (that's the point). The only way
   in is "Erase & reset", which deletes the app's data. She can then
   restore a backup (backups never contain the PIN).
   ===================================================================== */

const PIN_LENGTH = 4;
const MAX_TRIES = 5;          // after this many wrong tries...
const WAIT_SECONDS = 30;      // ...she has to wait this long

let lockMode = null;          // "unlock", "set" or "confirm" (null = closed)
let pinEntry = "";            // digits typed so far
let pinFirst = "";            // the first entry when setting a new PIN
let wrongTries = 0;
let waitUntil = 0;

// ---------- Scrambling ("hashing") the PIN ---------------------------

/** Turn bytes into hex text, e.g. [255, 1] -> "ff01". */
function toHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a PIN with a salt (random extra text) using PBKDF2. Returns hex text. */
async function hashPin(pin, saltHex) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(saltHex), iterations: 150000, hash: "SHA-256" },
    key, 256);
  return toHex(bits);
}

function hasPin() {
  return Boolean(data.settings.pinHash && data.settings.pinSalt);
}

// ---------- Showing / hiding the lock screen -------------------------

function showLockScreen(mode) {
  lockMode = mode;
  pinEntry = "";
  if (logDay) closeLog();                       // close the log sheet if it's open
  $("lock-forgot").hidden = mode !== "unlock";
  $("lock-cancel").hidden = mode === "unlock";  // can't cancel an unlock!
  $("lock-reset-box").hidden = true;
  updateLockScreen();
  document.body.classList.add("locked");
}

function hideLockScreen() {
  lockMode = null;
  pinEntry = "";
  document.body.classList.remove("locked");
}

/** Lock the app (called on start and when she leaves the app). */
function lockApp() {
  if (hasPin() && lockMode !== "unlock") showLockScreen("unlock");
}

function updateLockScreen(message) {
  $("lock-title").textContent = {
    unlock: "Enter your PIN",
    set: "Choose a 4-digit PIN",
    confirm: "Type it again to confirm",
  }[lockMode] || "";
  $("lock-message").textContent = message || "";
  // Filled dots for each digit typed so far
  $("lock-dots").innerHTML = Array.from({ length: PIN_LENGTH }, (_, i) =>
    `<i class="${i < pinEntry.length ? "filled" : ""}"></i>`).join("");
}

/** Little shake animation for a wrong PIN. */
function shakeDots() {
  const dots = $("lock-dots");
  dots.classList.remove("shake");
  void dots.offsetWidth;                         // restart the animation
  dots.classList.add("shake");
}

// ---------- Typing digits --------------------------------------------

async function pressDigit(d) {
  if (!lockMode || pinEntry.length >= PIN_LENGTH) return;
  const waitLeft = Math.ceil((waitUntil - Date.now()) / 1000);
  if (lockMode === "unlock" && waitLeft > 0) {
    updateLockScreen(`Too many tries. Wait ${waitLeft}s.`);
    return;
  }
  pinEntry += d;
  updateLockScreen();
  if (pinEntry.length === PIN_LENGTH) await pinComplete();
}

function pressDelete() {
  pinEntry = pinEntry.slice(0, -1);
  updateLockScreen();
}

async function pinComplete() {
  const pin = pinEntry;

  if (lockMode === "unlock") {
    const hash = await hashPin(pin, data.settings.pinSalt);
    if (hash === data.settings.pinHash) {
      wrongTries = 0;
      hideLockScreen();
      render();
    } else {
      wrongTries++;
      pinEntry = "";
      shakeDots();
      if (wrongTries >= MAX_TRIES) {
        wrongTries = 0;
        waitUntil = Date.now() + WAIT_SECONDS * 1000;
        updateLockScreen(`Too many tries. Wait ${WAIT_SECONDS}s.`);
      } else {
        updateLockScreen("Wrong PIN, try again");
      }
    }
  } else if (lockMode === "set") {
    pinFirst = pin;
    lockMode = "confirm";
    pinEntry = "";
    updateLockScreen();
  } else if (lockMode === "confirm") {
    if (pin !== pinFirst) {
      lockMode = "set";
      pinEntry = "";
      shakeDots();
      updateLockScreen("Those didn't match, let's start again");
      return;
    }
    // Save a fresh random salt + the hash. Never the PIN itself.
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    data.settings.pinSalt = salt;
    data.settings.pinHash = await hashPin(pin, salt);
    pinFirst = "";
    saveData(data);
    hideLockScreen();
    render();
    toast("PIN lock is on 🔒");
  }
}

// ---------- Settings: turn on / change / turn off --------------------

function renderLockSettings() {
  const on = hasPin();
  $("lock-status").textContent = on
    ? "On. The app asks for your PIN when it opens."
    : "Off. Add a PIN so only you can open the app.";
  $("btn-pin-set").textContent = on ? "Change PIN" : "Set a PIN";
  $("btn-pin-off").hidden = !on;
}

// ---------- Hooking up the buttons (called once from app.js) ---------

function setupLock() {
  // Keypad: every button with data-digit, plus delete
  $("lock-keypad").addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.digit !== undefined) pressDigit(btn.dataset.digit);
    else if (btn.id === "lock-delete") pressDelete();
  });

  // A physical keyboard also works (handy when testing on a PC)
  document.addEventListener("keydown", e => {
    if (!lockMode) return;
    if (/^\d$/.test(e.key)) pressDigit(e.key);
    else if (e.key === "Backspace") pressDelete();
  });

  $("lock-cancel").addEventListener("click", () => { pinFirst = ""; hideLockScreen(); });

  $("lock-forgot").addEventListener("click", () => {
    $("lock-reset-box").hidden = false;
  });

  // Erase & reset needs two taps, like "Delete all data"
  $("lock-reset").addEventListener("click", e => {
    const btn = e.currentTarget;
    if (!btn.dataset.armed) {
      btn.dataset.armed = "yes";
      btn.textContent = "Tap again to erase everything";
      setTimeout(() => { delete btn.dataset.armed; btn.textContent = "Erase & reset"; }, 4000);
      return;
    }
    data = structuredClone(DEFAULT_DATA);
    saveData(data);
    delete btn.dataset.armed;
    btn.textContent = "Erase & reset";
    hideLockScreen();
    render();
    toast("App reset. You can restore a backup in Settings.");
  });

  $("btn-pin-set").addEventListener("click", () => showLockScreen("set"));

  $("btn-pin-off").addEventListener("click", () => {
    data.settings.pinHash = null;
    data.settings.pinSalt = null;
    saveAndRender();
    toast("PIN lock is off");
  });

  // Lock as soon as she leaves the app (home button, app switcher, screen off).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) lockApp();
  });

  lockApp(); // lock on start
}
