#!/usr/bin/env bash
#
# Deploys apps/backend (api + worker) to a Google Compute Engine VM.
#
# Mechanism: package code -> gcloud compute scp -> remote tar -xz ->
# `docker compose build && docker compose up -d`. No registry; the VM builds
# the image. Cheapest deploy path; suitable for small/medium fleets.
#
# Prereqs on YOUR machine:
#   - gcloud CLI installed and authenticated (`gcloud auth login`)
#   - scripts/deploy.env populated (copy from scripts/deploy.env.example)
#
# Prereqs on the VM (one-time setup):
#   - Docker + docker compose v2 installed
#   - The .env file already at $REMOTE_DIR/apps/backend/.env (NOT shipped by
#     this script — secrets must be set on the VM out of band)
#   - User running the deploy can run docker without sudo (i.e., in the
#     `docker` group), or the script needs editing to prefix with `sudo`
#
# This script does NOT run database migrations. Apply Prisma migrations
# separately per docs/superpowers/notes/2026-05-31-ai-backend-migration.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- Load config -------------------------------------------------------------

if [[ -f scripts/deploy.env ]]; then
  # shellcheck disable=SC1091
  source scripts/deploy.env
fi

: "${GCP_PROJECT:?GCP_PROJECT is required (set in scripts/deploy.env or shell env)}"
: "${GCP_ZONE:?GCP_ZONE is required}"
: "${GCP_INSTANCE:?GCP_INSTANCE is required}"
REMOTE_DIR="${REMOTE_DIR:-~/saas-forge}"
COMPOSE_SERVICES="${COMPOSE_SERVICES:-backend-api backend-worker}"

# --- Sanity checks -----------------------------------------------------------

command -v gcloud >/dev/null || { echo "✗ gcloud CLI not found on PATH"; exit 1; }
command -v tar >/dev/null    || { echo "✗ tar not found";                exit 1; }

if [[ ! -f Dockerfile.backend ]]; then
  echo "✗ Run this from the saas-forge repo root (Dockerfile.backend not found)"
  exit 1
fi
if [[ ! -f docker-compose.prod.yml ]]; then
  echo "✗ docker-compose.prod.yml not found"
  exit 1
fi

echo "→ Project:   $GCP_PROJECT"
echo "→ Zone:      $GCP_ZONE"
echo "→ Instance:  $GCP_INSTANCE"
echo "→ Remote:    $REMOTE_DIR"
echo "→ Services:  $COMPOSE_SERVICES"
echo

# --- Package -----------------------------------------------------------------

TARBALL="$(mktemp -t saas-forge-backend-XXXXXX.tar.gz)"
trap 'rm -f "$TARBALL"' EXIT

echo "→ Packaging backend source (excluding .venv, __pycache__, caches)…"
tar -czf "$TARBALL" \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.pytest_cache' \
  --exclude='.ruff_cache' \
  --exclude='.coverage' \
  --exclude='htmlcov' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='node_modules' \
  Dockerfile.backend \
  docker-compose.yml \
  docker-compose.prod.yml \
  apps/backend

ARCHIVE_BYTES=$(stat -c '%s' "$TARBALL" 2>/dev/null || stat -f '%z' "$TARBALL")
echo "→ Packaged $((ARCHIVE_BYTES / 1024)) KB"

# --- Upload ------------------------------------------------------------------

REMOTE_TARBALL="/tmp/saas-forge-backend-$$.tar.gz"

echo "→ Uploading to ${GCP_INSTANCE}:${REMOTE_TARBALL}…"
gcloud compute scp \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  "$TARBALL" \
  "${GCP_INSTANCE}:${REMOTE_TARBALL}"

# --- Remote extract + build + restart ----------------------------------------

echo "→ Extracting and (re)starting services on the VM…"

# Quote-escape the remote script. REMOTE_DIR is intentionally expanded on the
# remote (tilde resolution), so we wrap it in single quotes there.
REMOTE_SCRIPT="$(cat <<EOF
set -euo pipefail

REMOTE_DIR='${REMOTE_DIR}'
mkdir -p "\$REMOTE_DIR"
tar -xzf '${REMOTE_TARBALL}' -C "\$REMOTE_DIR"
rm -f '${REMOTE_TARBALL}'

cd "\$REMOTE_DIR"

if [[ ! -f apps/backend/.env ]]; then
  echo "✗ apps/backend/.env missing on VM. Create it once and re-run." >&2
  exit 1
fi

echo "→ docker compose build ${COMPOSE_SERVICES}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build ${COMPOSE_SERVICES}

echo "→ docker compose up -d ${COMPOSE_SERVICES}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d ${COMPOSE_SERVICES}

echo
echo "→ Container status:"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps ${COMPOSE_SERVICES}
EOF
)"

gcloud compute ssh \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  "$GCP_INSTANCE" \
  --command="$REMOTE_SCRIPT"

echo
echo "✓ Deploy complete."
echo "  Test reachability from your machine (HMAC will reject without signed body):"
echo "    curl -i http://<VM-EXTERNAL-IP>:8000/healthz"
