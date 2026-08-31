import { h, esc, toast } from "../dom.js";
import { catName, summary } from "../categories.js";
import { ALL } from "../data.js";
import { S, save, replaceState, resetState, syncConfig } from "../state.js";
import { unseenCount } from "../srs.js";
import { syncEnabled, createCode, validCode, syncNow, forgetSync } from "../sync.js";
import { back } from "../router.js";

/* Computed rather than written down: the old fixed sentence claimed "15 a day,
   whole vocabulary in six weeks", which was wrong even for 15 and survived every
   change to the default. */
function paceNote() {
  const left = unseenCount("all");
  if (left === 0) return "<p>Du hast jedes Wort schon einmal gesehen.</p>";
  if (S.set.newPerDay === 0) {
    return "<p>Auf 0 kommen keine neuen Wörter dazu. " + left + " warten noch.</p>";
  }
  const days = Math.ceil(left / S.set.newPerDay);
  return "<p>Bei " + S.set.newPerDay + " neuen Wörtern pro Tag sind die restlichen " + left +
    " in gut " + days + " Tagen durch, wenn du täglich kommst. Wörter, die du mit " +
    "„Kannte ich“ wegtippst, zählen nicht gegen das Limit — dann geht es schneller.</p>";
}

function syncSection() {
  if (!syncEnabled()) return "";
  const { code, lastSync } = syncConfig();
  const when = lastSync ? new Date(lastSync).toLocaleString("de-DE") : "noch nie";

  if (!code) {
    return '<h2>Geräte abgleichen</h2>' +
      "<p>Erzeug einen Code auf einem Gerät und gib ihn auf dem anderen ein. Dann teilen sich beide denselben Fortschritt.</p>" +
      '<p class="warn">Wer den Code hat, kann deinen Fortschritt lesen und überschreiben. Gib ihn nicht weiter.</p>' +
      '<button class="ghost" data-newcode>Sync-Code erzeugen</button>' +
      '<button class="ghost" data-joincode>Code eingeben</button>';
  }
  return '<h2>Geräte abgleichen</h2>' +
    '<div class="field"><label>Dein Sync-Code</label><code class="synccode">' + esc(code) + "</code></div>" +
    "<p>Zuletzt abgeglichen: " + esc(when) + "</p>" +
    '<button class="ghost" data-sync>Jetzt abgleichen</button>' +
    '<button class="ghost" data-copycode>Code kopieren</button>' +
    '<button class="ghost danger" data-unlink>Sync trennen</button>';
}

export function settings(app) {
  const flagged = Object.keys(S.flags).filter((id) => ALL[id]);

  let html = '<div class="wrap panel"><div class="masthead"><h1>Einstellungen</h1>' +
    '<button class="iconbtn" data-home aria-label="Zurück">✕</button></div>' +

    "<h2>Tageslimit</h2>" +
    '<div class="field"><label for="np">Neue Wörter pro Tag</label>' +
      '<input id="np" type="number" min="0" max="100" value="' + S.set.newPerDay + '"></div>' +
    '<div class="field"><label for="mr">Wiederholungen pro Tag</label>' +
      '<input id="mr" type="number" min="10" max="500" value="' + S.set.maxRev + '"></div>' +
    '<div id="pace">' + paceNote() + "</div>" +

    syncSection() +

    "<h2>Fortschritt sichern</h2>" +
    "<p>Ohne Abgleich liegt der Fortschritt nur in diesem Browser. Kopier dir den Text ab und zu irgendwohin.</p>" +
    '<textarea id="ex" readonly></textarea>' +
    '<button class="ghost" data-copy>Kopieren</button>' +
    '<button class="ghost" data-imp>Sicherung einspielen</button>' +

    "<h2>Gemeldete Fehler (" + flagged.length + ")</h2>";

  if (!flagged.length) {
    html += "<p>Nichts markiert. Wenn dir ein Artikel oder Plural falsch vorkommt, tipp im Kartenfenster oben rechts auf ⚑ — dann taucht das Wort hier auf und du kannst es gegen dein Kursbuch prüfen.</p>";
  } else {
    for (const id of flagged) {
      const w = ALL[id];
      html += '<div class="flagged"><span>' + esc(summary(w)) + "</span><em>" +
        esc(catName(w.cat).split(",")[0]) + "</em></div>";
    }
    html += '<button class="ghost" data-clearflags>Markierungen zurücksetzen</button>';
  }

  html += "<h2>Neu anfangen</h2><p>Löscht jeden Fortschritt in allen sechs Gruppen.</p>" +
    '<button class="ghost danger" data-reset>Allen Fortschritt löschen</button></div>';

  app.innerHTML = html;

  const ta = app.querySelector("#ex");
  ta.value = JSON.stringify(S);

  /* Commit on change rather than on close: the panel can now also be left with
     the browser back button, which fires no click on ✕. */
  /* A blank or non-numeric field means "leave this alone". Coercing it to a
     number instead would read empty as 0 and quietly stop all new words, with
     nothing on screen to explain why the app had gone silent. */
  const current = (sel) => (sel === "#np" ? S.set.newPerDay : S.set.maxRev);

  const readLimit = (sel, min, max) => {
    const el = app.querySelector(sel);
    const raw = el.value.trim();
    const n = raw === "" ? NaN : Number(raw);
    const value = Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
    el.value = value ?? current(sel);
    return value;
  };

  const commitLimits = () => {
    const np = readLimit("#np", 0, 100);
    const mr = readLimit("#mr", 10, 500);
    if (np !== null) S.set.newPerDay = np;
    if (mr !== null) S.set.maxRev = mr;
    save();
    app.querySelector("#pace").innerHTML = paceNote();
  };
  app.querySelector("#np").onchange = commitLimits;
  app.querySelector("#mr").onchange = commitLimits;

  app.querySelector("[data-home]").onclick = () => { commitLimits(); back(); };

  app.querySelector("[data-copy]").onclick = async () => {
    try { await navigator.clipboard.writeText(ta.value); toast("Kopiert"); }
    catch { ta.select(); toast("Text markieren und kopieren"); }
  };

  app.querySelector("[data-imp]").onclick = () => {
    ta.readOnly = false;
    ta.value = "";
    ta.placeholder = "Sicherung hier einfügen, dann nochmal tippen";
    ta.focus();
    const btn = app.querySelector("[data-imp]");
    btn.textContent = "Jetzt einspielen";
    btn.onclick = () => {
      try {
        const o = JSON.parse(ta.value);
        if (!o || typeof o !== "object" || !o.cards) throw new Error("no cards");
        replaceState(o);
        toast("Eingespielt");
        back();
      } catch { toast("Das war keine gültige Sicherung"); }
    };
  };

  const clear = app.querySelector("[data-clearflags]");
  if (clear) clear.onclick = () => { S.flags = {}; save(); settings(app); };

  app.querySelector("[data-reset]").onclick = () => {
    if (confirm("Wirklich allen Fortschritt löschen?")) { resetState(); back(); }
  };

  wireSync(app);
}

function wireSync(app) {
  const run = async (code, okMsg) => {
    toast("Wird abgeglichen …");
    try { await syncNow(code); toast(okMsg); settings(app); }
    catch (e) { toast("Abgleich fehlgeschlagen: " + e.message); }
  };

  const newCode = app.querySelector("[data-newcode]");
  if (newCode) newCode.onclick = () => run(createCode(), "Sync eingerichtet");

  const join = app.querySelector("[data-joincode]");
  if (join) join.onclick = () => {
    const entered = prompt("Sync-Code vom anderen Gerät:");
    if (entered === null) return;
    if (!validCode(entered)) return toast("Das sieht nicht wie ein Sync-Code aus");
    run(entered, "Abgeglichen");
  };

  const sync = app.querySelector("[data-sync]");
  if (sync) sync.onclick = () => run(undefined, "Abgeglichen");

  const copyCode = app.querySelector("[data-copycode]");
  if (copyCode) copyCode.onclick = async () => {
    try { await navigator.clipboard.writeText(syncConfig().code); toast("Code kopiert"); }
    catch { toast("Code konnte nicht kopiert werden"); }
  };

  const unlink = app.querySelector("[data-unlink]");
  if (unlink) unlink.onclick = () => {
    if (!confirm("Sync trennen? Der Fortschritt auf diesem Gerät bleibt erhalten.")) return;
    forgetSync();
    toast("Sync getrennt");
    settings(app);
  };
}
