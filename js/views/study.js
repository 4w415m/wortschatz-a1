import { h, esc } from "../dom.js";
import { catName } from "../categories.js";
import { S, card, save } from "../state.js";
import { triage, grade, nextIvl, buildQueue,
  newAllowanceLeft, unseenCount, nextDueAt } from "../srs.js";
import { present, PERS } from "../conjugate.js";
import { back, go } from "../router.js";

let app = null;
let queue = [], cur = null, cat = "all";
let revealed = false, articlePick = null, sessionCount = 0;

export function study(k, root) {
  app = root;
  cat = k;
  queue = buildQueue(k);
  sessionCount = 0;
  next();
}

function next() {
  revealed = false;
  articlePick = null;
  const now = Date.now();
  const i = queue.findIndex((w) => { const c = card(w.id); return !c || c.d <= now; });
  if (i < 0) return finished();
  cur = queue.splice(i, 1)[0];
  drawCard();
}

/* "in 3 Stunden" / "morgen" / "in 4 Tagen". Units are spelled out so the
   phrase can be followed by a full stop without doubling an abbreviation dot. */
function when(at) {
  const mins = Math.round((at - Date.now()) / 60000);
  if (mins <= 1) return "gleich";
  if (mins < 60) return "in " + mins + (mins === 1 ? " Minute" : " Minuten");
  const hours = Math.round(mins / 60);
  if (hours < 24) return "in " + hours + (hours === 1 ? " Stunde" : " Stunden");
  const days = Math.round(hours / 24);
  return days === 1 ? "morgen" : "in " + days + " Tagen";
}

/* An empty queue has several causes and they call for different things from
   the learner, so say which one this was rather than a flat "come back later". */
function finished() {
  save();

  const unseen = unseenCount(cat);
  const capped = newAllowanceLeft() === 0 && unseen > 0;
  const due = nextDueAt(cat);

  let title, body, action = "";
  if (capped) {
    /* Nothing new is being offered, which is a setting rather than a lack of
       words -- say which, and how to change it. */
    title = S.set.newPerDay === 0 ? "Keine neuen Wörter eingestellt" : "Tageslimit erreicht";
    body = (S.set.newPerDay === 0
        ? "„Neue Wörter pro Tag“ steht auf 0, also kommt nichts Neues dazu."
        : "Du hast heute alle " + S.set.newPerDay + " neuen Wörter angefangen.") +
      " Noch " + unseen + " warten." +
      (due ? "<br>Nächste Wiederholung " + when(due) + "." : "");
    action = '<button class="ghost" data-settings>Limit ändern</button>';
  } else if (due) {
    title = "Fertig für jetzt";
    body = esc(catName(cat)) + " — " + sessionCount + " Karten in dieser Runde.<br>" +
      "Nächste Wiederholung " + when(due) + ".";
  } else if (unseen === 0) {
    title = "Alles durch";
    body = "In dieser Gruppe ist jedes Wort geplant. Komm wieder, wenn die ersten fällig werden.";
  } else {
    title = "Fertig für jetzt";
    body = esc(catName(cat)) + " — " + sessionCount +
      " Karten in dieser Runde.<br>Komm später wieder, dann sind die nächsten dran.";
  }

  app.innerHTML = "";
  app.appendChild(h('<div class="done"><h2>' + title + "</h2><p>" + body + "</p>" +
    action + '<button class="ghost" data-home>Zur Übersicht</button></div>'));

  const settingsBtn = app.querySelector("[data-settings]");
  if (settingsBtn) settingsBtn.onclick = () => go("settings");
  app.querySelector("[data-home]").onclick = () => back();
}

function drawCard() {
  const w = cur, c = card(w.id), isNew = !c;
  /* Once a card is well established, flip the question round and ask the learner
     to produce the German rather than recognise it. */
  const produce = c && c.s === 2 && c.i >= 10;
  const flagged = !!S.flags[w.id];
  const left = queue.filter((x) => { const cc = card(x.id); return !cc || cc.d <= Date.now(); }).length + 1;

  /* Two roots: .top and .card must both be direct children of #app, because
     .card{flex:1} fills the remaining column height. */
  app.innerHTML =
    '<div class="top"><button class="iconbtn" data-back aria-label="Zurück">‹</button>' +
    '<span class="ttl">' + esc(catName(cat === "all" ? w.cat : cat).split(",")[0]) + "</span>" +
    '<span class="counts"><b>' + left + "</b> übrig</span>" +
    '<button class="iconbtn flagbtn' + (flagged ? " on" : "") +
      '" data-flag aria-label="Fehler melden">⚑</button></div>' +
    '<div class="card"><div class="face" id="face"></div><div class="acts" id="acts"></div></div>';

  app.querySelector("[data-back]").onclick = () => { save(); back(); };
  app.querySelector("[data-flag]").onclick = (e) => {
    if (S.flags[w.id]) delete S.flags[w.id]; else S.flags[w.id] = 1;
    save();
    e.currentTarget.classList.toggle("on");
  };

  paint(produce, isNew);
}

/* ---- the answer side, one shape per category ---- */
function backHtml(w) {
  let b = "<div>";
  if (w.cat === "nouns") {
    b += '<div class="word"><span class="art ' + w.gender + '">' + w.gender + "</span>" + esc(w.singular) + "</div>";
    b += '<div class="plural">' + (w.plural ? "die " + esc(w.plural) : "<s>kein normaler Plural</s>") + "</div>";
    b += '<div class="mean">' + esc(w.en) + "</div>";
  } else if (w.cat === "verbs") {
    b += '<div class="word">' + esc(w.infinitive) + "</div>";
    b += '<div class="mean">' + esc(w.en) + "</div>";
    const forms = present(w);
    b += '<table class="conj">' +
      PERS.map((p, i) => "<tr><td>" + p + "</td><td>" + esc(forms[i]) + "</td></tr>").join("") +
      "</table>";
    b += '<div class="perf">Perfekt: <em>' + esc(w.perfect) + "</em></div>";
    if (w.infinitive === "mögen") {
      b += '<div class="note">möchte, möchtest, möchte, möchten, möchtet, möchten — would like</div>';
    }
    let tags = "";
    if (w.flags.includes("core"))  tags += '<span class="tag core">Kernverb</span>';
    if (w.flags.includes("irr"))   tags += '<span class="tag">unregelmäßig</span>';
    if (w.flags.includes("sep"))   tags += '<span class="tag">trennbar</span>';
    if (w.flags.includes("modal")) tags += '<span class="tag">Modalverb</span>';
    if (w.perfect.startsWith("ist")) tags += '<span class="tag">Perfekt mit sein</span>';
    if (tags) b += '<div class="tags">' + tags + "</div>";
  } else if (w.cat === "adjectives") {
    b += '<div class="word">' + esc(w.word) + '</div><div class="mean">' + esc(w.en) + "</div>";
    if (w.opposite) b += '<div class="opp">Gegenteil: <b>' + esc(w.opposite) + "</b></div>";
  } else if (w.cat === "prepositions") {
    b += '<div class="word">' + esc(w.word) + '</div><div class="mean">' + esc(w.en) + "</div>";
    b += '<div><span class="kase ' + w.case + '">' + w.case +
      (w.case === "Wechsel" ? " — Ort = Dativ, Richtung = Akkusativ" : "") + "</span></div>";
    if (w.note) b += '<div class="note">' + esc(w.note) + "</div>";
  } else {
    b += '<div class="word">' + esc(w.word) + '</div><div class="mean">' + esc(w.en) + "</div>";
    if (w.note) b += '<div class="note">' + esc(w.note) + "</div>";
  }
  return b + "</div>";
}

function paint(produce, isNew) {
  const w = cur;
  const face = document.getElementById("face");
  const acts = document.getElementById("acts");
  const isNoun = w.cat === "nouns";
  face.innerHTML = "";
  acts.innerHTML = "";

  const reveal = () => { revealed = true; paint(produce, isNew); };

  if (!revealed) {
    if (produce) {
      face.appendChild(h('<div><div class="cue">Auf Deutsch?' +
        (isNoun ? " Mit Artikel und Plural." : "") + "</div>" +
        '<div class="word en">' + esc(w.en) + "</div></div>"));
      acts.appendChild(h('<button class="big" data-rev>Antwort zeigen</button>'));
      acts.querySelector("[data-rev]").onclick = reveal;
    } else if (isNoun) {
      face.appendChild(h('<div><div class="cue">Artikel, Plural, Bedeutung?</div>' +
        '<div class="word">' + esc(w.singular) + "</div></div>"));
      const box = h('<div><div class="hint">Tippe den Artikel</div><div class="arts"></div></div>');
      const row = box.querySelector(".arts");
      for (const a of ["der", "die", "das"]) {
        const btn = h('<button class="' + a + '">' + a + "</button>");
        btn.onclick = () => {
          articlePick = a;
          row.querySelectorAll("button").forEach((x) => {
            if (x.textContent === w.gender) x.classList.add("right");
            else if (x.textContent === a) x.classList.add("wrong");
            x.disabled = true;
          });
          setTimeout(reveal, 420);
        };
        row.appendChild(btn);
      }
      acts.appendChild(box);
    } else {
      face.appendChild(h('<div><div class="cue">Was heißt das?</div>' +
        '<div class="word">' + esc(w.cat === "verbs" ? w.infinitive : w.word) + "</div></div>"));
      acts.appendChild(h('<button class="big" data-rev>Antwort zeigen</button>'));
      acts.querySelector("[data-rev]").onclick = reveal;
    }
    return;
  }

  face.appendChild(h(backHtml(w)));

  /* First sight of a word: the learner places it themselves rather than being
     graded on a guess. */
  if (isNew) {
    const box = h('<div class="triage"><div class="hint">Ehrlich: wie gut kanntest du das?</div></div>');
    for (const [kind, title, sub] of [
      ["known", "Kannte ich", "kommt in 30 Tagen wieder"],
      ["shaky", "Wackelig", "kommt in 3 Tagen wieder"],
      ["new", "Neu für mich", "kommt morgen wieder"],
    ]) {
      const btn = h('<button class="big"><b>' + title + "</b><i>" + sub + "</i></button>");
      btn.onclick = () => {
        triage(w.id, kind);
        sessionCount++;
        if (kind === "new") queue.push(w);
        next();
      };
      box.appendChild(btn);
    }
    acts.appendChild(box);
    return;
  }

  const wrongArticle = isNoun && articlePick && articlePick !== w.gender;
  const hint = wrongArticle
    ? "Artikel war falsch — nimm <em>Nochmal</em>"
    : (isNoun ? "Artikel <em>und</em> Plural <em>und</em> Bedeutung richtig?" : "Wie gut saß das?");

  const box = h('<div><div class="hint">' + hint + '</div><div class="grades"></div></div>');
  const row = box.querySelector(".grades");
  for (const [title, g] of [["Nochmal", 0], ["Schwer", 1], ["Gut", 2], ["Leicht", 3]]) {
    const btn = h('<button class="g' + g + (wrongArticle && g === 0 ? " suggest" : "") + '">' + title +
      '<span class="iv">' + nextIvl(w.id, g) + "</span></button>");
    btn.onclick = () => {
      grade(w.id, g);
      sessionCount++;
      if (g === 0) queue.push(w);
      next();
    };
    row.appendChild(btn);
  }
  acts.appendChild(box);
}

/* Desktop shortcuts: space/enter reveals, 1-4 grade. */
document.addEventListener("keydown", (e) => {
  if (!cur || !document.getElementById("acts")) return;
  if (e.key === " " || e.key === "Enter") {
    const r = document.querySelector("[data-rev]");
    if (r) { e.preventDefault(); r.click(); }
  }
  const btns = document.querySelectorAll("#acts button");
  if (/^[1-4]$/.test(e.key) && revealed && btns.length >= 3) {
    btns[Math.min(+e.key - 1, btns.length - 1)].click();
  }
});
