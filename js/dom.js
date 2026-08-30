/* Tiny DOM helpers shared by every view. */

/* Build an element from an HTML string.
   Returns the first root only, so callers must pass markup with a single root —
   passing two siblings silently drops the second. Use el.innerHTML directly when
   you need several roots under an existing parent. */
export function h(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  if (d.children.length > 1) {
    throw new Error("h() got " + d.children.length + " roots; it can only return one");
  }
  return d.firstElementChild;
}

export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function toast(msg) {
  const t = h('<div class="toast">' + esc(msg) + "</div>");
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
