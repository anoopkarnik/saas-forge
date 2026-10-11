#!/usr/bin/env bash
#
# Builds the backend API image, tags it with a git-SHA pin AND
# `:latest`, pushes it to Docker Hub, and (optionally) triggers Coolify
# webhooks so the running server pulls and restarts immediately.
#
# Prereqs on YOUR machine:
#   - docker buildx available (default in modern Docker)
#   - `docker login` already done for the Docker Hub namespace in deploy.env
#   - scripts/deploy.env populated (copy from scripts/deploy.env.example)
#
# Prereqs on the server side:
#   - Coolify running and a resource configured for the image. The resource
#     points at `<NAMESPACE>/<IMAGE>:latest`. The matching env vars
#     (BACKEND_HMAC_SECRET, BACKEND_DATABASE_URL, OPENAI_API_KEY,
#     etc.) are set in the Coolify resource's Environment tab — secrets are
#     NOT shipped through this script.
#
# Does NOT run database migrations. Apply Prisma migrations separately per
# docs/superpowers/notes/2026-05-31-ai-backend-migration.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- Load config -------------------------------------------------------------

if [[ -f scripts/deploy.env ]]; then
  # shellcheck disable=SC1091
  source scripts/deploy.env
fi

: "${DOCKERHUB_NAMESPACE:?DOCKERHUB_NAMESPACE is required (set in scripts/deploy.env)}"
: "${DOCKERHUB_API_IMAGE:?DOCKERHUB_API_IMAGE is required}"
BUILD_PLATFORM="${BUILD_PLATFORM:-linux/amd64}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

API_REPO="${DOCKERHUB_NAMESPACE}/${DOCKERHUB_API_IMAGE}"

# --- Sanity checks -----------------------------------------------------------

command -v docker >/dev/null || { echo "✗ docker not found on PATH"; exit 1; }
docker buildx version >/dev/null || { echo "✗ docker buildx unavailable"; exit 1; }

if [[ ! -f Dockerfile.backend ]]; then
  echo "✗ Run from the saas-forge repo root (Dockerfile.backend not found)"
  exit 1
fi

echo "→ Platform:  $BUILD_PLATFORM"
echo "→ Tag:       $IMAGE_TAG (plus :latest)"
echo "→ API repo:  $API_REPO"
echo

# --- Build api ---------------------------------------------------------------

echo "→ Building $API_REPO …"
docker buildx build \
  --platform "$BUILD_PLATFORM" \
  -f Dockerfile.backend \
  --target api \
  -t "${API_REPO}:${IMAGE_TAG}" \
  -t "${API_REPO}:latest" \
  --load \
  .

# --- Push --------------------------------------------------------------------

echo "→ Pushing ${API_REPO}:${IMAGE_TAG}"
docker push "${API_REPO}:${IMAGE_TAG}"
echo "→ Pushing ${API_REPO}:latest"
docker push "${API_REPO}:latest"

# --- Trigger Coolify ---------------------------------------------------------

trigger_coolify() {
  local label="$1"
  local url="$2"
  if [[ -z "$url" ]]; then
    echo "→ $label webhook not set; skipping. Coolify's watcher will catch :latest on its own cycle."
    return
  fi
  echo "→ Triggering Coolify redeploy: $label"
  local response
  response="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$url" \
      ${COOLIFY_TOKEN:+-H "Authorization: Bearer $COOLIFY_TOKEN"})"
  if [[ "$response" =~ ^2[0-9][0-9]$ ]]; then
    echo "  ✓ HTTP $response"
  else
    echo "  ✗ HTTP $response — check the webhook URL / token"
    return 1
  fi
}

echo
trigger_coolify "api"    "${COOLIFY_WEBHOOK_API:-}"

echo
echo "✓ Deploy complete."
echo "  api    → ${API_REPO}:${IMAGE_TAG}"
