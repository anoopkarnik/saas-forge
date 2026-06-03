from __future__ import annotations

import hashlib
import hmac as _hmac
import json
import time
from collections.abc import Iterable


class InvalidSignature(Exception):
    """Raised when HMAC verification fails for any reason."""


def canonical_body(payload: dict) -> str:
    """Deterministic JSON encoding used for signing.

    `ensure_ascii=False` is required to match Node's `JSON.stringify`, which
    leaves non-ASCII characters unescaped. Without this, the web client signs
    raw UTF-8 but Python re-canonicalizes to `\\uXXXX` escapes — breaking HMAC
    verification for any payload with non-ASCII content (Unicode names,
    non-English queries, emoji).
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _compute(secret: str, ts: str, body: str) -> str:
    msg = f"{ts}\n{body}".encode()
    return _hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def sign_payload(secret: str, payload: dict, *, ts: str | None = None) -> tuple[str, str]:
    """Return (timestamp, signature) for a payload."""
    ts = ts or str(int(time.time()))
    body = canonical_body(payload)
    return ts, _compute(secret, ts, body)


def verify_request(
    primary_secret: str,
    ts: str,
    signature: str,
    payload: dict,
    *,
    accepted_secrets: Iterable[str] | None = None,
    max_skew_seconds: int = 60,
) -> None:
    """Raise InvalidSignature on any failure. Returns None on success."""
    try:
        ts_int = int(ts)
    except (TypeError, ValueError):
        raise InvalidSignature("invalid_timestamp_format") from None

    now = int(time.time())
    if abs(now - ts_int) > max_skew_seconds:
        raise InvalidSignature("stale_timestamp")

    body = canonical_body(payload)
    candidates = [primary_secret, *(accepted_secrets or [])]
    for secret in candidates:
        expected = _compute(secret, ts, body)
        if _hmac.compare_digest(expected, signature):
            return
    raise InvalidSignature("signature_mismatch")
