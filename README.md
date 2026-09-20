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
  conjugate.js        present tense and imperative
  sync.js             sync codes, merge, transport
  views/              home.js · study.js · settings.js
data/*.json           the word lists
worker/               Cloudflare Worker for cross-device sync
tools/check-data.mjs  validates data/ and pins the conjugator's output
tools/verbs.snapshot.txt  that output, one line per verb
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

Every entry also carries an `example` (`{ de, en }`, one A1-level sentence with
its translation) and a `tip` (a short English usage note, or `null`). Both are
shown on the answer side of the card. Tips should say something the card does
not already show: a gender rule, the case a verb takes, a false friend, why the
Perfekt uses *sein*.

### Verbs

A verb entry looks like this; every field after `en` is optional.

```json
{
  "infinitive": "anmelden",
  "en": "to register, to sign up",
  "stemChange": ["du form", "er form"],   only where the present is irregular
  "forms": ["ich", "du", "er", "wir", "ihr", "sie"],   full set: sein, modals, wissen
  "aux": "hat", "partizip": "angemeldet",  the Perfekt; absent only on möchten
  "praeteritum": [six forms],             sein, haben and möchten (wollte)
  "imperative": "Nimm",                   the du form of the base verb, only where
                                          it cannot be derived (e → i keeps the
                                          change, a → ä drops it); sein has all three
  "reflexive": "akk",                     shown as "sich anmelden", conjugated with
                                          mich/dich/sich, or "dat" for mir/dir/sich
  "takes": "für + Akkusativ",             printed after the headword as written;
                                          also decides the Kasus row on the front
  "third": true,                          used only in the third person: the table
                                          shows es / sie, no imperative
  "flags": ["sep"],                       core · irr · modal · sep · insep
  "example": { "de": "…", "en": "…" },
  "tip": "…"
}
```

`insep` marks a verb with an inseparable prefix (bezahlen, verstehen). It exists
so the card can ask "trennbar or nicht trennbar?" only of verbs that have a
prefix at all. Separable verbs are split by the prefix list in `conjugate.js`;
`check-data.mjs` fails if a `sep` verb has a prefix that list does not know.

The front of a verb card asks for the Perfekt auxiliary, the case the verb
takes (Akkusativ, Dativ, or both for geben-type verbs; no row where `takes`
is Nominativ or absent), regular or irregular, and separable or not. The last
answer flips the card. Each row is derived from the fields above, so a data
fix changes the quiz too.

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

Everything below `data/` started as a mechanical conversion of the original
single-file app by `tools/extract-data.mjs`. The conjugation and scheduling
rewrites were checked against the original implementation: identical output for
all 129 verbs, and identical card state across 7200 graded transitions.

The word lists have since diverged from that conversion, so `extract-data.mjs`
no longer reproduces them. All 754 entries were reviewed against Duden and the
Goethe A1 list, which corrected 27 fields (16 plurals wrongly marked as absent,
7 notes that named only one of the cases a form covers, and 4 glosses), and
every entry gained an example sentence and a tip. Headwords were deliberately
left untouched: card ids are built from them, so changing one would orphan
saved progress.

The verb list then grew from 129 to 169 entries and changed shape: `perfect`
became `aux` + `partizip`, and the fields listed above were added. The 40 new
verbs are ones the existing tips already named (abholen, zuhören, umsteigen,
bedeuten …) plus common A1 syllabus verbs that were missing (möchten,
kennenlernen, regnen, lassen, mitnehmen, tun, wehtun …). Glosses that were
identical between two verbs (öffnen / aufmachen, beginnen / anfangen) were
told apart, since production mode shows only the English. The rewritten
conjugator gives the same present tense as before for all 129 original verbs,
except setzen, which now carries its reflexive pronouns.

## Checking the data

```sh
node tools/check-data.mjs
```

Reports schema problems (a `sep` verb with an unknown prefix, a missing
imperative on an e → i verb, two verbs with the same gloss) and diffs every
verb's present tense and imperative against `tools/verbs.snapshot.txt`. After a deliberate change, `--update` rewrites the
snapshot; the diff it prints first is the review.
