# Wortschatz A1

An offline-capable German A1 vocabulary trainer with spaced repetition.
No build step, no dependencies — plain ES modules served as static files.

**Live:** https://4w415m.github.io/wortschatz-a1/

## Layout

```
index.html            shell only
css/app.css
js/
  app.js              boot + error handling
  router.js           view registry (keeps views from importing each other)
  dom.js              h() / esc() / toast()
  categories.js       the six word groups
  data.js             loads data/*.json, builds the word index
  state.js            persistence, day rollover, v1→v2 migration
  srs.js              scheduling
  conjugate.js        present tense
  sync.js             sync codes, merge, transport
  views/              home.js · study.js · settings.js
data/*.json           the word lists
worker/               Cloudflare Worker for cross-device sync
tools/extract-data.mjs  one-off converter from the original single-file version
```

## Running locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. ES modules and `fetch` need a real origin, so
opening `index.html` from the filesystem will not work.

After changing any cached file, bump `CACHE` in `sw.js` — otherwise returning
visitors keep the old version.

## The word lists

`data/*.json` is the source of truth. Each entry is keyed by its headword, and
card ids are `"<category>:<headword>"` — so adding, removing, or reordering
words leaves existing progress pointing at the right entries. Headwords must
stay unique within a category.

The original version stored progress by array position, which meant any edit to
a list silently reassigned someone's progress to different words.
`data/legacy-ids.json` maps those old ids onto the new ones, and `state.js`
applies it once on first load.

## Cross-device sync

Optional and off by default. Deploy `worker/` (see `worker/README.md`), set
`SYNC_URL` in `js/config.js`, and a sync section appears in Settings: generate a
code on one device, enter it on another.

Merging happens on the client and is per-word: each card keeps whichever copy
was touched last, so two devices used offline both keep their work. The merge is
commutative and idempotent — syncing repeatedly, or in either direction, gives
the same result.

The sync code is a bearer credential. Anyone holding it can read and overwrite
that progress, there is no recovery if it is lost, and it is deliberately stored
outside the backup blob so exporting a backup does not hand over write access.

## Provenance

Everything below `data/` was mechanically converted from the original
single-file app by `tools/extract-data.mjs`. The conjugation and scheduling
rewrites were checked against the original implementation: identical output for
all 129 verbs, and identical card state across 7200 graded transitions.
