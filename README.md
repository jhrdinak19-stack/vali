# Vali 🌸 — a personal cycle tracker

A small, private cycle and wellbeing tracker, made as a personal project. It's a web app that installs on a phone's home screen. All data stays on the phone. Nothing is sent anywhere.

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The structure: screens, buttons and text |
| `css/styles.css` | How it looks: layout, sizes, colours |
| `js/themes.js` | Colour themes |
| `js/personal.js` | Personal messages |
| `js/logConfig.js` | The sections and options in the daily log |
| `js/dailyLog.js` | The daily log pop-up |
| `js/cycle.js` | Cycle math: averages and predictions |
| `js/insights.js` | The Insights tab: history, charts, reports |
| `js/report.js` | Printable summary |
| `js/tips.js` | Daily tips |
| `js/storage.js` | Saving, loading and backups |
| `js/app.js` | Connects everything and handles taps |
| `sw.js` | Offline support |
| `manifest.json` + `icons/` | App name and home screen icon |

## How it works

1. Logged days are saved on the phone (browser storage), with a manual backup option.
2. `cycle.js` averages recent cycles to estimate upcoming dates.
3. `app.js` redraws the screen whenever something changes.

Predictions are estimates only and are not medical advice.

## Run it locally

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Version history

- **v1:** calendar, predictions, themes, backup
- **v2:** new greeting, progress ring, swipe navigation, extra day types
- **v3:** daily wellbeing log (plus private features), yearly date notes, version label
- **v4:** Insights tab (history, charts, cycle reports, gentle alerts), printable summary, daily tips, at-a-glance tiles, section visibility settings, stricter backup checks
- **v5:** removed the optional lock for now, more reliable updates
- **v6:** screens load independently, so one problem can't blank the others
