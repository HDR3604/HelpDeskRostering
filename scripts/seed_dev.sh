#!/usr/bin/env bash
set -euo pipefail

# Dev seed script — creates a test user, shift templates, scheduler config,
# and fires a schedule generation request with realistic assistants.

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="$BASE_URL/api/v1"
DB_CONTAINER="${DB_CONTAINER:-$(docker ps --filter ancestor=postgres:16-alpine -q | head -1)}"
DB_USER="${DB_USER:-helpdesk}"
DB_NAME="${DB_NAME:-helpdesk}"
DEV_USER_ID="${DEV_USER_ID:-11111111-1111-1111-1111-111111111111}"

echo "==> Seeding dev user ($DEV_USER_ID)..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "INSERT INTO auth.users (user_id, email_address, password, role)
   VALUES ('$DEV_USER_ID', 'dev@local.com', 'dev', 'admin')
   ON CONFLICT DO NOTHING;"

# ---------- Shift Templates ----------
echo "==> Creating shift templates..."

# Monday–Friday morning shifts (08:00–12:00)
for day in 1 2 3 4 5; do
  day_name=$(echo "Monday Tuesday Wednesday Thursday Friday" | cut -d' ' -f"$day")
  curl -s -X POST "$API/shift-templates" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$day_name Morning\",
      \"day_of_week\": $day,
      \"start_time\": \"08:00\",
      \"end_time\": \"12:00\",
      \"min_staff\": 3,
      \"max_staff\": 5,
      \"course_demands\": [
        {\"course_code\": \"COMP1000\", \"tutors_required\": 1, \"weight\": 1.0},
        {\"course_code\": \"COMP1100\", \"tutors_required\": 1, \"weight\": 0.8}
      ]
    }" | jq -r '"  Created: \(.name) (\(.id))"'
done

# Monday–Friday afternoon shifts (12:00–16:00)
for day in 1 2 3 4 5; do
  day_name=$(echo "Monday Tuesday Wednesday Thursday Friday" | cut -d' ' -f"$day")
  curl -s -X POST "$API/shift-templates" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$day_name Afternoon\",
      \"day_of_week\": $day,
      \"start_time\": \"12:00\",
      \"end_time\": \"16:00\",
      \"min_staff\": 3,
      \"max_staff\": 6,
      \"course_demands\": [
        {\"course_code\": \"COMP2000\", \"tutors_required\": 1, \"weight\": 1.0},
        {\"course_code\": \"COMP2100\", \"tutors_required\": 1, \"weight\": 0.9},
        {\"course_code\": \"COMP1000\", \"tutors_required\": 1, \"weight\": 0.6}
      ]
    }" | jq -r '"  Created: \(.name) (\(.id))"'
done

# Monday–Friday evening shifts (16:00–19:00)
for day in 1 2 3 4 5; do
  day_name=$(echo "Monday Tuesday Wednesday Thursday Friday" | cut -d' ' -f"$day")
  curl -s -X POST "$API/shift-templates" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$day_name Evening\",
      \"day_of_week\": $day,
      \"start_time\": \"16:00\",
      \"end_time\": \"19:00\",
      \"min_staff\": 2,
      \"max_staff\": 4,
      \"course_demands\": [
        {\"course_code\": \"COMP3000\", \"tutors_required\": 1, \"weight\": 1.0},
        {\"course_code\": \"COMP2000\", \"tutors_required\": 1, \"weight\": 0.7}
      ]
    }" | jq -r '"  Created: \(.name) (\(.id))"'
done

# ---------- Scheduler Config ----------
echo "==> Creating scheduler config..."
CONFIG_ID=$(curl -s -X POST "$API/scheduler-configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Default",
    "course_shortfall_penalty": 2.0,
    "min_hours_penalty": 50.0,
    "max_hours_penalty": 5.0,
    "understaffed_penalty": 500.0,
    "extra_hours_penalty": 5.0,
    "max_extra_penalty": 20.0,
    "baseline_hours_target": 8,
    "solver_time_limit": 120,
    "log_solver_output": true
  }' | jq -r '.id')
echo "  Config ID: $CONFIG_ID"

# ---------- Generate Schedule ----------
echo "==> Generating schedule with 6 assistants..."
curl -s --max-time 300 -X POST "$API/schedules/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"config_id\": \"$CONFIG_ID\",
    \"title\": \"Week 1 — Feb 2026\",
    \"effective_from\": \"2026-02-10\",
    \"effective_to\": \"2026-02-14\",
    \"assistants\": [
      {
        \"id\": \"alice-chen\",
        \"courses\": [\"COMP1000\", \"COMP1100\", \"COMP2000\"],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"}
        ],
        \"min_hours\": 6,
        \"max_hours\": 16,
        \"cost_per_hour\": 28.50
      },
      {
        \"id\": \"bob-martinez\",
        \"courses\": [\"COMP2000\", \"COMP2100\", \"COMP3000\"],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 8,
        \"max_hours\": 20,
        \"cost_per_hour\": 30.00
      },
      {
        \"id\": \"carol-nguyen\",
        \"courses\": [\"COMP1000\", \"COMP1100\"],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 4,
        \"max_hours\": 12,
        \"cost_per_hour\": 25.00
      },
      {
        \"id\": \"david-kim\",
        \"courses\": [\"COMP1000\", \"COMP2000\", \"COMP2100\", \"COMP3000\"],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 10,
        \"max_hours\": 24,
        \"cost_per_hour\": 32.00
      },
      {
        \"id\": \"emma-wilson\",
        \"courses\": [\"COMP1100\", \"COMP2100\"],
        \"availability\": [
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 4,
        \"max_hours\": 12,
        \"cost_per_hour\": 26.00
      },
      {
        \"id\": \"frank-okafor\",
        \"courses\": [\"COMP2000\", \"COMP3000\"],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 6,
        \"max_hours\": 14,
        \"cost_per_hour\": 27.50
      }
    ]
  }" | jq .

# ---------- Generate Schedule (no course requirements) ----------
echo "==> Generating schedule with 10 assistants (no courses)..."
curl -s --max-time 300 -X POST "$API/schedules/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"config_id\": \"$CONFIG_ID\",
    \"title\": \"Week 2 — Feb 2026 (no courses)\",
    \"effective_from\": \"2026-02-17\",
    \"effective_to\": \"2026-02-21\",
    \"assistants\": [
      {
        \"id\": \"grace-taylor\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 8,
        \"max_hours\": 20,
        \"cost_per_hour\": 25.00
      },
      {
        \"id\": \"henry-park\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 1, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 6,
        \"max_hours\": 16,
        \"cost_per_hour\": 28.00
      },
      {
        \"id\": \"isla-jones\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 4,
        \"max_hours\": 16,
        \"cost_per_hour\": 24.00
      },
      {
        \"id\": \"jack-kumar\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 1, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 8,
        \"max_hours\": 20,
        \"cost_per_hour\": 30.00
      },
      {
        \"id\": \"kate-murphy\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 8,
        \"max_hours\": 20,
        \"cost_per_hour\": 26.00
      },
      {
        \"id\": \"liam-chen\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 1, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"16:00:00\", \"end\": \"19:00:00\"}
        ],
        \"min_hours\": 8,
        \"max_hours\": 20,
        \"cost_per_hour\": 27.00
      },
      {
        \"id\": \"mia-santos\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 5, \"start\": \"16:00:00\", \"end\": \"19:00:00\"}
        ],
        \"min_hours\": 6,
        \"max_hours\": 16,
        \"cost_per_hour\": 25.50
      },
      {
        \"id\": \"noah-ahmed\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 6,
        \"max_hours\": 16,
        \"cost_per_hour\": 26.50
      },
      {
        \"id\": \"olivia-wright\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 1, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 4, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"12:00:00\", \"end\": \"16:00:00\"}
        ],
        \"min_hours\": 8,
        \"max_hours\": 20,
        \"cost_per_hour\": 27.50
      },
      {
        \"id\": \"priya-patel\",
        \"courses\": [],
        \"availability\": [
          {\"day_of_week\": 1, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 1, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 2, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 2, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 3, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 3, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"12:00:00\", \"end\": \"16:00:00\"},
          {\"day_of_week\": 4, \"start\": \"16:00:00\", \"end\": \"19:00:00\"},
          {\"day_of_week\": 5, \"start\": \"08:00:00\", \"end\": \"12:00:00\"},
          {\"day_of_week\": 5, \"start\": \"16:00:00\", \"end\": \"19:00:00\"}
        ],
        \"min_hours\": 6,
        \"max_hours\": 16,
        \"cost_per_hour\": 24.50
      }
    ]
  }" | jq .

echo "==> Done!"
