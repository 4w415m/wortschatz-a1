import { esc } from "../dom.js";
import { CATS, catName } from "../categories.js";
import { totalWords } from "../data.js";
import { S, refresh } from "../state.js";
import { stats, dueCount } from "../srs.js";
import { go } from "../router.js";

function catButton(k, desc) {
  const s = stats(k);
  const due = dueCount(k);
  const pct = (n) => (s.total ? (n / s.total) * 100 : 0);
  return '<button class="cat" data-cat="' + esc(k) + '">' +
    '<div class="row1"><span class="nm">' + esc(catName(k)) + "</span>" +
    '<span class="due">' + (due ? "<b>" + due + " fällig</b>" : "<span>" + s.total + " Wörter</span>") + "</span></div>" +
    '<div class="desc">' + esc(desc) + "</div>" +
    '<div class="bar">' +
      '<i style="background:var(--die);width:' + pct(s.lr) + '%"></i>' +
      '<i style="background:var(--amber);width:' + pct(s.yg) + '%"></i>' +
      '<i style="background:var(--das);width:' + pct(s.mt) + '%"></i>' +
    "</div></button>";
}

export function home(app) {
  refresh();
  const acc = S.day.tot ? Math.round((S.day.ok / S.day.tot) * 100) : 0;

  let html = '<div class="wrap"><div class="masthead"><h1>Wortschatz A1</h1>' +
    '<button class="iconbtn" data-go="settings" aria-label="Einstellungen">⚙</button></div>' +
    '<p class="sub">' + totalWords() + " Wörter · A1.2</p>" +
    '<div class="today">' +
      '<div><div class="n">' + dueCount("all") + '</div><div class="l">fällig</div></div>' +
      '<div><div class="n">' + (S.day.rv + S.day.nw) + '</div><div class="l">heute gemacht</div></div>' +
      '<div><div class="n">' + (S.day.tot ? acc + "%" : "–") + '</div><div class="l">richtig</div></div>' +
      '<div class="flame"><div class="n">' + S.streak.n + '</div><div class="l">Tage in Folge</div></div>' +
    "</div>";

  html += catButton("all", "alle sechs Gruppen zusammen");
  for (const c of CATS) html += catButton(c.k, c.desc);

  html += '<div class="legend" style="margin-top:16px">' +
    '<b><i class="dot" style="background:#2A3242"></i>neu</b>' +
    '<b><i class="dot" style="background:var(--die)"></i>am Lernen</b>' +
    '<b><i class="dot" style="background:var(--amber)"></i>frisch</b>' +
    '<b><i class="dot" style="background:var(--das)"></i>sitzt</b></div></div>';

  app.innerHTML = html;
  app.querySelectorAll("[data-cat]").forEach((b) => { b.onclick = () => go("study", b.dataset.cat); });
  app.querySelector("[data-go=settings]").onclick = () => go("settings");
}
