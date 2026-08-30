/* Views navigate through here rather than importing each other, which keeps
   home -> study -> settings from forming an import cycle. */
const routes = {};

export function register(name, fn) { routes[name] = fn; }

export function go(name, arg) {
  const fn = routes[name];
  if (!fn) throw new Error("unknown route: " + name);
  return fn(arg);
}
