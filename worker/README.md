# Sync worker

A single Cloudflare Worker backed by KV. It stores one JSON blob per sync code
and does nothing else — no accounts, no personal data, no merge logic.

## Deploy

```sh
npm install -g wrangler        # once
wrangler login
wrangler kv namespace create PROGRESS
```

Put the returned namespace id into `wrangler.toml`, then:

```sh
wrangler deploy
```

Take the printed `https://wortschatz-sync.<subdomain>.workers.dev` URL and set it
as `SYNC_URL` in `js/config.js`. Until you do, the app hides the sync UI and
works purely locally.

## API

| Method | Path      | Body            | Response          |
| ------ | --------- | --------------- | ----------------- |
| `GET`  | `/s/:code`| —               | progress JSON, or `404` |
| `PUT`  | `/s/:code`| progress JSON   | `{ updatedAt }`   |

`:code` is 16 characters from `0-9 a-z` minus `i l o u`.

## What the security model actually is

The code is a bearer token. Anyone holding it can read and overwrite that
progress, and there is no way to recover or rotate it — losing it means starting
a new one, and sharing it means sharing write access. That is a deliberate
trade for having no accounts and storing nothing that identifies anyone; the
worst case is a corrupted vocabulary schedule, not a leaked identity.

80 bits of randomness puts guessing a valid code far out of reach, so there is
no rate limiting. Add some (or a Durable Object) before storing anything you
would actually miss.

`ALLOWED_ORIGINS` restricts which sites a browser will let read a response. It
is not access control — anything that is not a browser can ignore it.
