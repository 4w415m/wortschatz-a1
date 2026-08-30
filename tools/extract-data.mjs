/* One-off: pulls the pipe-delimited DATA blocks out of the original single-file
   index.html and writes them as typed JSON under data/. Kept in the repo so the
   conversion is reproducible and reviewable, not a thing that happened once. */
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(process.argv[2] ?? "index.html", "utf8");

const block = (key) => {
  const m = src.match(new RegExp("DATA\\." + key + "\\s*=\\s*`([\\s\\S]*?)`;"));
  if (!m) throw new Error("no data block for " + key);
  return m[1].trim().split("\n").map(l => l.trim()).filter(Boolean).map(l => l.split("|"));
};

/* Blank trailing fields are meaningful absences, not empty strings. */
const opt = (v) => (v && v.trim()) ? v.trim() : null;

const SCHEMAS = {
  /* "artikel|Singular|Plural|english" — "-" plural = no normal plural / plural-only */
  nouns: r => ({ gender: r[0], singular: r[1], plural: r[2] === "-" ? null : r[2], en: r[3] }),

  /* "infinitiv|english|du,er overrides|Perfekt|flags" */
  verbs: r => {
    const ov = opt(r[2]);
    const forms = ov && ov.startsWith("FULL:") ? ov.slice(5).split(",") : null;
    return {
      infinitive: r[0],
      en: r[1],
      /* full 6-person override, else the du/er stem changes, else regular */
      forms,
      stemChange: forms ? null : (ov ? ov.split(",") : null),
      perfect: r[3],
      flags: opt(r[4]) ? r[4].split(",").map(s => s.trim()) : [],
    };
  },

  /* "wort|english|opposite" */
  adjectives: r => ({ word: r[0], en: r[1], opposite: opt(r[2]) }),

  /* "wort|english|case|note" */
  prepositions: r => ({ word: r[0], en: r[1], case: r[2], note: opt(r[3]) }),

  /* "wort|english|note" */
  function: r => ({ word: r[0], en: r[1], note: opt(r[2]) }),
  other: r => ({ word: r[0], en: r[1], note: opt(r[2]) }),
};

const counts = {};
for (const [key, map] of Object.entries(SCHEMAS)) {
  const rows = block(key);
  const bad = rows.filter(r => !r[0] || !r[1]);
  if (bad.length) throw new Error(`${key}: ${bad.length} rows missing required fields`);
  writeFileSync(`data/${key}.json`, JSON.stringify(rows.map(map), null, 2) + "\n");
  counts[key] = rows.length;
}
console.log(JSON.stringify(counts, null, 2));
console.log("total", Object.values(counts).reduce((a, b) => a + b, 0));

/* ---- legacy id migration map ----
   The original single-file app keyed SRS cards by array position ("nouns:12"),
   so any edit to the word lists silently reassigned progress to other words.
   The rebuilt app keys by headword ("nouns:Mann"). Reproduce the old ordering
   exactly — including the core-first sort the original applied to verbs after
   indexing — so saved progress maps onto the right words instead of being lost. */
const HEAD = { nouns: 1, verbs: 0, adjectives: 0, prepositions: 0, function: 0, other: 0 };

const legacy = {};
for (const key of Object.keys(SCHEMAS)) {
  let rows = block(key);
  if (key === "verbs") {
    /* original: stable sort, "core"-flagged verbs first, then re-index */
    rows = rows.map((r, i) => [r, i])
      .sort(([a, ia], [b, ib]) => {
        const ca = (a[4] || "").includes("core"), cb = (b[4] || "").includes("core");
        return ca === cb ? ia - ib : (ca ? -1 : 1);
      })
      .map(([r]) => r);
  }
  rows.forEach((r, i) => { legacy[`${key}:${i}`] = `${key}:${r[HEAD[key]]}`; });
}
writeFileSync("data/legacy-ids.json", JSON.stringify(legacy, null, 2) + "\n");
console.log("legacy id mappings", Object.keys(legacy).length);
