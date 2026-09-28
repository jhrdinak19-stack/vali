# Vali 🌸 — a personal cycle tracker

A private, period tracker built just for one person. It's a web app she installs on her iPhone home screen. Her data stays on her phone.

## What's in the folder

| File | What it does | Edit it when… |
|---|---|---|
| `index.html` | The structure: the screens, buttons and text | adding a new button or section |
| `css/styles.css` | How it looks: layout, sizes, rounded corners | changing the design |
| `js/themes.js` | The colour themes | **adding a theme she asks for** |
| `js/personal.js` | Your messages and date notes ❤ | **adding personal touches** |
| `js/logConfig.js` | What she can log each day (sections and options) | **adding or changing symptoms, moods, etc.** |
| `js/dailyLog.js` | The daily log pop-up sheet | changing how logging works |
| `js/cycle.js` | The math: grouping periods, averages, predictions | changing how predictions work |
| `js/storage.js` | Saving/loading data and backups | changing what gets saved |
| `js/app.js` | Connects everything: draws the screens, handles taps | adding new behaviour |
| `sw.js` | Offline support | adding new files (list them here) |
| `manifest.json` + `icons/` | App name and icon on the home screen | changing the icon |

## How it works (the 30-second version)

1. The only thing saved is a list of **period days** (like `"2026-09-01"`) plus settings.
2. `cycle.js` groups those days into periods. It measures the gap between period starts (the cycle length) and averages her last 6 cycles.
3. Next period = last period start + average cycle. Ovulation ≈ 14 days before that. Fertile window ≈ 5 days before ovulation to 1 day after.
4. `app.js` redraws the screen from that data every time something changes.

## Try it on your computer

The service worker needs a real web server, so opening the file by double-clicking won't fully work. In this folder, run:

```
python -m http.server 8000
```

Then open **http://localhost:8000** in Chrome. Press F12, then Ctrl+Shift+M to see it at iPhone size.

## Put it on Vali's iPhone

1. Create a free GitHub account and a new repository (e.g. `vali-app`).
2. Upload all the files in this folder.
3. In the repo, go to **Settings → Pages**, choose "Deploy from branch", pick `main`, and save.
4. After a minute you'll get a link like `https://yourname.github.io/vali-app/`.
5. On her iPhone, open that link in **Safari**, tap **Share → Add to Home Screen**.

To update the app later, upload the changed files. She gets the new version the next time she opens it with internet.

> **Heads up:** the link will be public, but her *data* isn't. Each phone stores its own data. Still, use a repo name that doesn't advertise what it is if you prefer.

## Update checklist (every time you publish)

1. Bump `APP_VERSION` in `js/app.js` (e.g. 3 → 4).
2. Set the same number in `CACHE` at the top of `sw.js` (`"vali-v4"`).
3. If you added a new file, add it to the `FILES` list in `sw.js`.
4. Test locally, then upload the changed files to GitHub.
5. On the phone: close the app fully, reopen, and check **Settings → Version** at the bottom.

## Version history

- **v1:** period logging, calendar, predictions, themes, backup
- **v2:** "Hello Love" greeting, progress ring, swipe between tabs, ovulation logging
- **v3:** daily log (flow, symptoms, mood, energy, digestion, discharge, sex, sleep, water, weight, exercise, life events, medication, notes), yearly date notes, version label

## Roadmap

- [x] Phase 1: log period days, calendar, predictions, themes, backup
- [ ] Phase 2: daily log (flow, symptoms, mood, notes)
- [ ] Phase 3: insights and charts
- [ ] Phase 4: reminders
- [ ] Phase 5: personal touches (partner view, photos, special days)
- [ ] Phase 6: polish and launch
