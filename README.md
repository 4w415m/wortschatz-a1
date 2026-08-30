# Wortschatz A1

An offline-capable German A1 vocabulary trainer. Single-page PWA — no build step, no dependencies.

**Live:** https://4w415m.github.io/wortschatz-a1/

## Features

- Article drilling (**der** / **die** / **das**) with colour-coded genders
- Works offline — a service worker caches the app shell on first visit
- Installable to the home screen on iOS and Android

## Running locally

Any static file server works:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

Note that the service worker only registers over `http`/`https`, so opening
`index.html` directly from the filesystem skips offline caching.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The entire app — markup, styles, and logic |
| `sw.js` | Service worker for offline caching |
| `manifest.webmanifest` | PWA metadata for installation |
| `apple-touch-icon.png` | Home-screen icon |

When editing `index.html`, bump `CACHE` in `sw.js` so returning visitors get the
new version instead of the cached one.
