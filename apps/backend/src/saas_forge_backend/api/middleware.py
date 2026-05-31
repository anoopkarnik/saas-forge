from __future__ import annotations

import json
import re
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from saas_forge_backend.config import get_settings
from saas_forge_backend.security.hmac import InvalidSignature, verify_request

# Routes that bypass signature verification.
PUBLIC_ROUTES = re.compile(r"^/(healthz|readyz|metrics|docs|openapi\.json)(/|$)")


class HmacMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if PUBLIC_ROUTES.match(request.url.path):
            return await call_next(request)

        settings = get_settings()
        ts = request.headers.get("X-Saas-Forge-Ts")
        sig = request.headers.get("X-Saas-Forge-Sig")
        if not ts or not sig:
            return Response(status_code=401, content="missing_signature_headers")

        body_bytes = await request.body()
        try:
            payload = json.loads(body_bytes) if body_bytes else {}
        except json.JSONDecodeError:
            return Response(status_code=400, content="invalid_json")

        accepted = (
            [settings.backend_hmac_secret_next]
            if settings.backend_hmac_secret_next
            else None
        )

        try:
            verify_request(
                settings.backend_hmac_secret,
                ts,
                sig,
                payload,
                accepted_secrets=accepted,
            )
        except InvalidSignature as exc:
            return Response(status_code=401, content=str(exc))

        # Stash verified payload on state so route handlers don't re-parse.
        request.state.verified_payload = payload
        return await call_next(request)
