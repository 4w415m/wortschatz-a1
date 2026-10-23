import { loadWords } from "./data.js";
import { initState, syncConfig } from "./state.js";
import { register, start, rerender, currentRoute } from "./router.js";
import { home } from "./views/home.js";
import { study } from "./views/study.js";
import { settings } from "./views/settings.js";
import { rules } from "./views/rules.js";
import { syncEnabled, syncNow } from "./sync.js";

const app = document.getElementById("app");

function fail(message, detail) {
  app.innerHTML =
    '<div class="boot"><h1>Da ist etwas kaputt</h1><p>' + message + "</p>" +
    (detail ? "<pre></pre>" : "") + "</div>";
  if (detail) app.querySelector("pre").textContent = detail;
}

/* Anything that escapes a handler lands here rather than leaving a half-drawn
   screen with no explanation. */
window.addEventListener("error", (e) => {
  fail("Zeig mir diesen Text:", e.message + "\nZeile " + e.lineno);
});
window.addEventListener("unhandledrejection", (e) => {
  fail("Zeig mir diesen Text:", String(e.reason && e.reason.message || e.reason));
});

register("home", () => home(app));
register("study", (k) => study(k, app));
register("settings", () => settings(app));
register("regeln", () => rules(app));

async function boot() {
  try {
    await loadWords();
  } catch (e) {
    return fail(
      "Die Wortlisten konnten nicht geladen werden. Bist du offline und hast die Seite noch nie geöffnet?",
      e.message
    );
  }

  await initState();
  start();

  /* Opportunistic catch-up on load; a failure here is not worth interrupting for. */
  if (syncEnabled() && syncConfig().code && navigator.onLine) {
    /* Re-render only if the user is still on the overview; redrawing mid-session
       would throw away the queue they are working through. */
    syncNow().then(() => { if (currentRoute() === "home") rerender(); }).catch(() => {});
  }
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
