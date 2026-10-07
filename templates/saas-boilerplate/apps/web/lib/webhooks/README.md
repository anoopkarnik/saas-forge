# Outgoing webhooks

Users (and, with organizations, workspace admins) add endpoints in **Settings → Webhooks**. Each event is POSTed as JSON:

```json
{
  "id": "evt_…",
  "type": "payment.succeeded",
  "apiVersion": "2026-10-07",
  "createdAt": "2026-10-07T12:00:00.000Z",
  "data": { "userId": "…", "credits": 100, "amount": 200, "currency": "usd", "checkoutId": "cs_…" }
}
```

Headers: `SaaSForge-Signature`, `SaaSForge-Event-Id`, `SaaSForge-Event-Type`. The event id stays the same across retries and replays, so receivers can dedupe on it. Event types and their payloads are in `events.ts`; a payload never changes shape under an existing `apiVersion`.

## Verifying a request

`SaaSForge-Signature: t=<unix seconds>,v1=<hex>` where `v1` is HMAC-SHA256 of `` `${t}.${rawBody}` `` with the endpoint's secret (`whsec_…`, shown once on creation and on rotation). After a rotation, the old secret keeps signing for 24 hours, so the header then carries two `v1` values; accept either. Reject requests older than 5 minutes. Use the raw body, before any JSON parsing.

Node:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(header, rawBody, secret, toleranceSeconds = 300) {
  const parts = header.split(",").map((part) => part.trim().split("="));
  const t = Number(parts.find(([key]) => key === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  return parts
    .filter(([key]) => key === "v1")
    .some(([, value]) => {
      const given = Buffer.from(value, "hex");
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}
```

Python:

```python
import hashlib, hmac, time

def verify(header: str, raw_body: bytes, secret: str, tolerance: int = 300) -> bool:
    parts = [p.strip().split("=", 1) for p in header.split(",")]
    t = next((v for k, v in parts if k == "t"), None)
    if t is None or abs(time.time() - int(t)) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return any(k == "v1" and hmac.compare_digest(v, expected) for k, v in parts)
```

## Delivery

- A 2xx response is success. Anything else, or no answer within 10 seconds, is retried after 1 min, 5 min, 30 min, 2 h, 6 h and 15 h (about 24 hours), then marked failed. Retries need the jobs module running on Inngest (`JOBS_DRIVER=inngest`); inline jobs make one attempt.
- After 15 failed attempts in a row an endpoint is paused (its owner is notified when notifications are installed). Turning it back on resets the count. Any delivery can be replayed from the delivery log.
- Redirects are not followed and response bodies are ignored.

## Security

- Secrets are stored encrypted with AES-256-GCM under `WEBHOOK_SECRET_KEY` (signing needs the raw secret, so they cannot be hashed). Keep the key stable: changing it makes stored secrets unreadable, and endpoints then need a rotation.
- URLs must be `https` in production and must not resolve to private, loopback, link-local or reserved addresses. This is checked when an endpoint is saved and again at connect time, so DNS changes cannot point a delivery at your network.

## Testing locally

Endpoints on `localhost` are refused by the SSRF guard, even in development. Expose your receiver through a tunnel (for example `cloudflared tunnel --url http://localhost:4000` or `ngrok http 4000`) and use its public https URL, then press **Send test event**.
