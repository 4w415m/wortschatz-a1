/* Hash-based routing.
 *
 * Views navigate through here rather than importing each other, which keeps
 * home -> study -> settings from forming an import cycle.
 *
 * The hash carries the route ("#/study/nouns") so the back button walks back
 * through the app instead of leaving it, and a reload returns to the screen you
 * were on. Hashes rather than real paths because GitHub Pages serves static
 * files and cannot rewrite unknown paths onto index.html. */

const routes = {};
let started = false;

/* Each history entry carries its own position, so the app can tell whether
   there is anywhere of its own to go back to. A counter would drift as soon as
   the browser's own back button was used; state travels with the entry. */
let lastIndex = 0;
const indexOf = () => (history.state && typeof history.state.i === "number" ? history.state.i : null);

export function register(name, fn) { routes[name] = fn; }

function parse(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return { name: "home" };
  if (parts[0] === "study" && parts[1]) return { name: "study", arg: decodeURIComponent(parts[1]) };
  if (parts[0] === "settings") return { name: "settings" };
  return { name: "home" };
}

const toHash = (name, arg) =>
  name === "home" ? "#/"
    : name === "study" ? "#/study/" + encodeURIComponent(arg)
    : "#/" + name;

function render() {
  /* A null index means the browser just pushed this entry for us (assigning
     history.state is not possible when navigating by hash alone). */
  const i = indexOf();
  if (i === null) { lastIndex += 1; history.replaceState({ i: lastIndex }, ""); }
  else lastIndex = i;

  const { name, arg } = parse(location.hash);
  const fn = routes[name];
  if (!fn) throw new Error("unknown route: " + name);
  fn(arg);
}

export function go(name, arg, { replace = false } = {}) {
  const hash = toHash(name, arg);
  if (location.hash === hash) return render(); /* no hashchange would fire */
  if (replace) {
    /* replaceState keeps this entry's position; location.replace() would drop
       history.state and make the entry look freshly pushed. It also fires no
       hashchange, so render here. */
    history.replaceState({ i: lastIndex }, "", hash);
    return render();
  }
  location.hash = hash; /* the hashchange listener renders */
}

/* Leave the current screen the way the platform back gesture would. A screen
   opened directly by link or reload has no in-app history behind it, so going
   back there means going home rather than off the site. */
export function back() {
  if (lastIndex > 0) history.back();
  else go("home", undefined, { replace: true });
}

export function start() {
  if (started) return;
  started = true;
  addEventListener("hashchange", render);

  /* Normalise a bare or unrecognised hash so the first entry is a real route,
     and anchor it at position 0. */
  const { name, arg } = parse(location.hash);
  const hash = toHash(name, arg);
  history.replaceState({ i: 0 }, "", hash);
  lastIndex = 0;
  render();
}

/* Re-run the current route, e.g. after a background sync changes the data. */
export const rerender = () => render();
export const currentRoute = () => parse(location.hash).name;
