#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
./goose -dir ./migrations postgres "$DATABASE_URL" up

# Seed default admin (if env vars are set)
if [ -n "$SEED_ADMIN_EMAIL" ]; then
    echo "Seeding default admin..."
    ./seed-admin || echo "Admin seed skipped or already exists"
fi

# Execute the main command (./server)
exec "$@"
