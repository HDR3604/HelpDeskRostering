#!/usr/bin/env sh
set -eu

# Seed an admin user.
#
# Usage:
#   ./scripts/seed_admin.sh <first_name> <last_name> <email> <password>
#
# Requires DATABASE_URL to be set (or sourced from .env.local).
#
# Dokploy (inside backend container terminal):
#   ./seed_admin.sh Admin User admin@example.com 'YourPassword'
#
# Docker exec (from host):
#   docker exec -e SEED_ADMIN_FIRST_NAME='Admin' \
#               -e SEED_ADMIN_LAST_NAME='User' \
#               -e SEED_ADMIN_EMAIL='admin@example.com' \
#               -e SEED_ADMIN_PASSWORD='YourPassword' \
#               <backend-container> ./seed-admin

if [ $# -lt 4 ]; then
  echo "Usage: $0 <first_name> <last_name> <email> <password>"
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

export SEED_ADMIN_FIRST_NAME="$1"
export SEED_ADMIN_LAST_NAME="$2"
export SEED_ADMIN_EMAIL="$3"
export SEED_ADMIN_PASSWORD="$4"

echo "Seeding admin: $SEED_ADMIN_FIRST_NAME $SEED_ADMIN_LAST_NAME ($SEED_ADMIN_EMAIL)"
cd "$BACKEND_DIR" && go run ./cmd/seed-admin
