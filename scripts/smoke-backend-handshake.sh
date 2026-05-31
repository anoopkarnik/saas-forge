#!/usr/bin/env bash
set -euo pipefail

SECRET="${BACKEND_HMAC_SECRET:-dev-only-change-me-32bytes-hex0000}"
URL="${BACKEND_URL:-http://localhost:8000}"
TS="$(date +%s)"
BODY='{"agent_id":"noop","input":{},"user_id":"smoke-test"}'
SIG="$(printf '%s\n%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)"

echo "→ Unsigned (expect 401):"
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" \
  -X POST "$URL/agents/stream" -H "Content-Type: application/json" -d "$BODY"

echo "→ Signed (expect 501 from stub):"
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" \
  -X POST "$URL/agents/stream" \
  -H "Content-Type: application/json" \
  -H "X-Saas-Forge-Ts: $TS" \
  -H "X-Saas-Forge-Sig: $SIG" \
  -H "X-Saas-Forge-Req-Id: smoke-test" \
  -d "$BODY"

echo "→ Healthz (expect 200):"
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" "$URL/healthz"
