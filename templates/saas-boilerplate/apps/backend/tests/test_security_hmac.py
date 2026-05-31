import json
import time

import pytest

from saas_forge_backend.security.hmac import (
    InvalidSignature,
    canonical_body,
    sign_payload,
    verify_request,
)


def test_canonical_body_is_deterministic():
    a = canonical_body({"b": 2, "a": 1})
    b = canonical_body({"a": 1, "b": 2})
    assert a == b == '{"a":1,"b":2}'


def test_sign_and_verify_roundtrip():
    secret = "test-secret"
    payload = {"user_id": "u1", "value": 42}
    ts, sig = sign_payload(secret, payload)
    verify_request(secret, ts, sig, payload, accepted_secrets=None)


def test_verify_rejects_bad_signature():
    secret = "test-secret"
    payload = {"user_id": "u1"}
    ts, _ = sign_payload(secret, payload)
    with pytest.raises(InvalidSignature):
        verify_request(secret, ts, "deadbeef", payload, accepted_secrets=None)


def test_verify_rejects_stale_timestamp():
    secret = "test-secret"
    payload = {"user_id": "u1"}
    ts = str(int(time.time()) - 120)
    body = canonical_body(payload)
    import hmac as _h
    import hashlib
    sig = _h.new(secret.encode(), f"{ts}\n{body}".encode(), hashlib.sha256).hexdigest()
    with pytest.raises(InvalidSignature):
        verify_request(secret, ts, sig, payload, accepted_secrets=None, max_skew_seconds=60)


def test_verify_accepts_secondary_secret_during_rotation():
    primary = "new-secret"
    secondary = "old-secret"
    payload = {"user_id": "u1"}
    ts, sig = sign_payload(secondary, payload)
    verify_request(primary, ts, sig, payload, accepted_secrets=[secondary])
