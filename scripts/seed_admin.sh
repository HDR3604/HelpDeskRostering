#!/usr/bin/env sh
set -eu

# Seed an admin user.
#
# Usage:
#   ./scripts/seed_admin.sh <email> <password>
#
# Requires DATABASE_URL to be set (or sourced from .env.local).
#
# Dokploy (inside backend container terminal):
#   ./seed_admin.sh admin@example.com 'MyP@ssw0rd!'
#
# Docker exec (from host):
#   docker exec -e SEED_ADMIN_EMAIL='admin@example.com' \
#               -e SEED_ADMIN_PASSWORD='MyP@ssw0rd!' \
#               <backend-container> ./seed-admin

if [ $# -lt 2 ]; then
  echo "Usage: $0 <email> <password>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"

# Source .env.local for DATABASE_URL if not already set
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT_DIR/.env.local" ]; then
  export DATABASE_URL=$(grep '^DATABASE_URL=' "$ROOT_DIR/.env.local" | cut -d'=' -f2-)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

export SEED_ADMIN_EMAIL="$1"
export SEED_ADMIN_PASSWORD="$2"

echo "Seeding admin: $SEED_ADMIN_EMAIL"
cd "$BACKEND_DIR" && go run ./cmd/seed-admin
