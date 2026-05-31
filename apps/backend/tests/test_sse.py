import json

import pytest

from saas_forge_backend.api.sse import sse_event


def test_sse_event_format():
    assert sse_event("token", {"delta": "Hi"}) == 'event: token\ndata: {"delta":"Hi"}\n\n'


def test_sse_event_end_with_empty_payload():
    assert sse_event("end", {}) == "event: end\ndata: {}\n\n"


def test_sse_event_rejects_unknown_type():
    with pytest.raises(ValueError):
        sse_event("nope", {})
