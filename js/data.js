import { CATS, CAT } from "./categories.js";

/* Word lists by category, and a flat id -> word index. Populated by loadWords(). */
export const W = {};
export const ALL = {};

/* Card ids are "<category>:<headword>" — stable across edits to the word lists,
   so progress (and anything synced from another device) keeps pointing at the
   same word when entries are added, removed, or reordered. */
export const wordId = (cat, word) => cat + ":" + word[CAT[cat].head];

async function fetchCategory(cat) {
  const res = await fetch(`data/${cat.k}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${cat.k}.json: HTTP ${res.status}`);
  const rows = await res.json();
  return rows.map((row) => ({ ...row, cat: cat.k, id: wordId(cat.k, row) }));
}

export async function loadWords() {
  const lists = await Promise.all(CATS.map(fetchCategory));

  CATS.forEach((cat, i) => { W[cat.k] = lists[i]; });

  /* The 20 core verbs carry most beginner sentences, so they come up first. */
  W.verbs.sort((a, b) => {
    const ca = a.flags.includes("core"), cb = b.flags.includes("core");
    return ca === cb ? 0 : (ca ? -1 : 1);
  });

  for (const cat of CATS) for (const w of W[cat.k]) ALL[w.id] = w;
  return ALL;
}

export const totalWords = () => Object.keys(ALL).length;
