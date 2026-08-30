/* Sync endpoint for Wortschatz A1.
 *
 *   GET  /s/:code  -> the stored progress JSON, or 404 if nothing is stored yet
 *   PUT  /s/:code  -> store progress, returns { updatedAt }
 *
 * The code IS the credential: 80 bits of client-generated randomness, which is
 * far too large to guess, and the only thing standing between a request and the
 * progress behind it. There are no accounts and nothing personal is stored --
 * a blob of card ids, intervals and due dates, under a random key.
 */

const MAX_BYTES = 512 * 1024;
const CODE = /^[0-9abcdefghjkmnpqrstvwxyz]{16}$/;

/* The code travels in the URL, so responses must not be readable by arbitrary
 * sites; this pins who the browser will hand a response back to. */
function cors(origin, allowed) {
  const ok = allowed.includes("*") || allowed.includes(origin);
  return {
    "access-control-allow-origin": ok ? (origin || "*") : allowed[0],
    "access-control-allow-methods": "GET,PUT,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
    const headers = cors(request.headers.get("origin"), allowed);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    const match = new URL(request.url).pathname.match(/^\/s\/([^/]+)$/);
    if (!match) return json({ error: "not found" }, 404, headers);

    const code = match[1].toLowerCase();
    if (!CODE.test(code)) return json({ error: "bad code" }, 400, headers);

    const key = "s:" + code;

    if (request.method === "GET") {
      const stored = await env.PROGRESS.get(key);
      if (stored === null) return json({ error: "empty" }, 404, headers);
      return new Response(stored, {
        headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
      });
    }

    if (request.method === "PUT") {
      const raw = await request.text();
      if (raw.length > MAX_BYTES) return json({ error: "too large" }, 413, headers);

      let state;
      try { state = JSON.parse(raw); }
      catch { return json({ error: "invalid json" }, 400, headers); }
      if (!state || typeof state !== "object" || typeof state.cards !== "object") {
        return json({ error: "not a progress document" }, 400, headers);
      }

      const updatedAt = Date.now();
      /* Merging is the client's job -- it holds both copies and the rules. The
       * worker only ever stores what it is handed. */
      await env.PROGRESS.put(key, JSON.stringify({ ...state, updatedAt }));
      return json({ updatedAt }, 200, headers);
    }

    return json({ error: "method not allowed" }, 405, { ...headers, allow: "GET,PUT,OPTIONS" });
  },
};
