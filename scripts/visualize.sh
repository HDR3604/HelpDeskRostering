#!/usr/bin/env bash
set -euo pipefail

# Terminal visualizer for shift templates and schedules.
# Usage:
#   ./scripts/visualize.sh shifts              Show shift templates as a weekly grid
#   ./scripts/visualize.sh schedules           List all active schedules
#   ./scripts/visualize.sh schedule <id>       Show a schedule's assignments as a weekly grid

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="$BASE_URL/api/v1"
COL_W=16

# ── Helpers ──────────────────────────────────────────────────────────────────

pad() {
  local str="$1" w="${2:-$COL_W}"
  printf "%-${w}s" "$str"
}

repeat_char() {
  local ch="$1" n="$2"
  printf '%*s' "$n" '' | tr ' ' "$ch"
}

LABEL_W=12

# Strip seconds from HH:MM:SS → HH:MM, leave HH:MM as-is
strip_secs() {
  local t="$1"
  if [ "${#t}" -eq 8 ]; then echo "${t%:00}"; else echo "$t"; fi
}

# Format a time range: "08:00:00|12:00:00" → "08:00-12:00"
fmt_range() { echo "$(strip_secs "$1")-$(strip_secs "$2")"; }

print_header() {
  printf "%s│" "$(pad "" "$LABEL_W")"
  for day in Mon Tue Wed Thu Fri; do
    printf " %s│" "$(pad "$day" $((COL_W - 1)))"
  done
  echo
}

print_separator() {
  printf "%s┼" "$(repeat_char "─" "$LABEL_W")"
  for i in 1 2 3 4 5; do
    printf "%s┼" "$(repeat_char "─" "$COL_W")"
  done
  echo
}

print_top_border() {
  printf "%s┬" "$(repeat_char "─" "$LABEL_W")"
  for i in 1 2 3 4 5; do
    printf "%s┬" "$(repeat_char "─" "$COL_W")"
  done
  echo
}

print_bottom_border() {
  printf "%s┴" "$(repeat_char "─" "$LABEL_W")"
  for i in 1 2 3 4 5; do
    printf "%s┴" "$(repeat_char "─" "$COL_W")"
  done
  echo
}

# Print a row of cells: first arg is the label (left column), then 5 cell values
print_row() {
  local label="$1"; shift
  printf "%s│" "$(pad "$label" "$LABEL_W")"
  for i in 1 2 3 4 5; do
    local val="${1:-}"
    shift || true
    printf " %s│" "$(pad "$val" $((COL_W - 1)))"
  done
  echo
}

# ── Shift Templates ─────────────────────────────────────────────────────────

cmd_shifts() {
  local data
  data=$(curl -sf "$API/shift-templates/" 2>/dev/null) || {
    echo "Error: could not fetch shift templates. Is the backend running?"
    exit 1
  }

  local count
  count=$(echo "$data" | jq 'length')
  echo ""
  echo "Shift Templates ($count active)"
  echo "$(repeat_char "═" $((17 + ${#count})))"
  echo ""
  print_top_border
  print_header
  print_separator

  # Get unique time slots sorted by start_time
  local slots
  slots=$(echo "$data" | jq -r '[.[] | {start: .start_time, end: .end_time}] | unique | sort_by(.start) | .[] | "\(.start)|\(.end)"')

  local first=true
  while IFS='|' read -r slot_start slot_end; do
    [ -z "$slot_start" ] && continue

    if [ "$first" = true ]; then
      first=false
    else
      print_separator
    fi

    # For each time slot, collect data per day (1=Mon..5=Fri)
    # Row 1: time label + shift names
    local names=()
    local staffing=()
    local max_courses=0

    for day in 1 2 3 4 5; do
      local tmpl
      tmpl=$(echo "$data" | jq -r --arg s "$slot_start" --arg e "$slot_end" --argjson d "$day" \
        '[.[] | select(.start_time == $s and .end_time == $e and .day_of_week == $d)] | first // empty')

      if [ -z "$tmpl" ]; then
        names+=("")
        staffing+=("")
      else
        local name min_staff max_staff staff_str
        name=$(echo "$tmpl" | jq -r '.name | split(" ") | last')
        min_staff=$(echo "$tmpl" | jq -r '.min_staff')
        max_staff=$(echo "$tmpl" | jq -r '.max_staff // empty')
        if [ -n "$max_staff" ]; then
          staff_str="Staff: ${min_staff}-${max_staff}"
        else
          staff_str="Staff: ${min_staff}+"
        fi
        names+=("$name")
        staffing+=("$staff_str")

        local nc
        nc=$(echo "$tmpl" | jq '.course_demands | length')
        [ "$nc" -gt "$max_courses" ] && max_courses=$nc
      fi
    done

    # Print time label + names
    local time_label
    time_label=$(fmt_range "$slot_start" "$slot_end")
    print_row "$time_label" "${names[@]}"
    print_row "" "${staffing[@]}"

    # Print course demand rows
    for ((ci = 0; ci < max_courses; ci++)); do
      local courses=()
      for day in 1 2 3 4 5; do
        local course
        course=$(echo "$data" | jq -r --arg s "$slot_start" --arg e "$slot_end" --argjson d "$day" --argjson ci "$ci" \
          '[.[] | select(.start_time == $s and .end_time == $e and .day_of_week == $d)] | first // empty
           | if . == "" or . == null then "" else .course_demands[$ci] // empty | if . == "" or . == null then "" else "\(.course_code)(\(.tutors_required))" end end')
        courses+=("${course:-}")
      done
      print_row "" "${courses[@]}"
    done

  done <<< "$slots"

  print_bottom_border
  echo ""
}

# ── Schedule List ────────────────────────────────────────────────────────────

cmd_schedules() {
  local data
  data=$(curl -sf "$API/schedules/" 2>/dev/null) || {
    echo "Error: could not fetch schedules. Is the backend running?"
    exit 1
  }

  local count
  count=$(echo "$data" | jq 'length')
  echo ""
  echo "Active Schedules ($count)"
  echo "$(repeat_char "═" $((20 + ${#count})))"
  echo ""

  if [ "$count" -eq 0 ]; then
    echo "  No active schedules found."
    echo ""
    return
  fi

  printf "  %-4s %-10s %-30s %-20s %s\n" "#" "ID" "Title" "Effective" "Assigns"
  printf "  %-4s %-10s %-30s %-20s %s\n" "---" "--------" "-----" "---------" "-------"

  echo "$data" | jq -r 'to_entries[] | "\(.key)|\(.value.schedule_id)|\(.value.title)|\(.value.effective_from)|\(.value.effective_to // "-")|\(.value.assignments | length)"' | \
  while IFS='|' read -r idx id title eff_from eff_to n_assigns; do
    local short_id="${id:0:8}"
    local num=$((idx + 1))
    local title_trunc="$title"
    [ ${#title_trunc} -gt 28 ] && title_trunc="${title_trunc:0:26}.."
    local eff_range
    if [ "$eff_to" = "-" ] || [ "$eff_to" = "null" ]; then
      eff_range="${eff_from} →"
    else
      eff_range="${eff_from:5} → ${eff_to:5}"
    fi
    printf "  %-4s %-10s %-30s %-20s %s\n" "$num" "$short_id" "$title_trunc" "$eff_range" "$n_assigns"
  done

  echo ""
  echo "  View a schedule: ./scripts/visualize.sh schedule <full-id>"
  echo ""
}

# ── Schedule Detail ──────────────────────────────────────────────────────────

cmd_schedule() {
  local schedule_id="$1"

  if [ -z "$schedule_id" ]; then
    # No ID given — show the list and exit
    cmd_schedules
    return
  fi

  local data
  data=$(curl -sf "$API/schedules/$schedule_id" 2>/dev/null) || {
    echo "Error: could not fetch schedule $schedule_id"
    exit 1
  }

  local title eff_from eff_to is_active
  title=$(echo "$data" | jq -r '.title')
  eff_from=$(echo "$data" | jq -r '.effective_from')
  eff_to=$(echo "$data" | jq -r '.effective_to // "open"')
  is_active=$(echo "$data" | jq -r '.is_active')

  echo "Schedule: \"$title\""
  echo "Effective: $eff_from → $eff_to  |  Active: $is_active"
  echo "$(repeat_char "═" 50)"
  echo ""

  # Parse assignments
  local assignments
  assignments=$(echo "$data" | jq '.assignments')

  local n_assigns
  n_assigns=$(echo "$assignments" | jq 'length')
  if [ "$n_assigns" -eq 0 ]; then
    echo "  No assignments in this schedule."
    echo ""
    return
  fi

  print_top_border
  print_header
  print_separator

  # Get unique time slots from assignments
  local slots
  slots=$(echo "$assignments" | jq -r '[.[] | {start: .start, end: .end}] | unique | sort_by(.start) | .[] | "\(.start)|\(.end)"')

  local first=true
  while IFS='|' read -r slot_start slot_end; do
    [ -z "$slot_start" ] && continue

    if [ "$first" = true ]; then
      first=false
    else
      print_separator
    fi

    # Find max number of assistants in any day for this slot
    local max_assistants=0
    for day in 1 2 3 4 5; do
      local nc
      nc=$(echo "$assignments" | jq --arg s "$slot_start" --arg e "$slot_end" --argjson d "$day" \
        '[.[] | select(.start == $s and .end == $e and .day_of_week == $d)] | length')
      [ "$nc" -gt "$max_assistants" ] && max_assistants=$nc
    done

    local time_label
    time_label=$(fmt_range "$slot_start" "$slot_end")

    # Print rows
    for ((ri = 0; ri < max_assistants; ri++)); do
      local label=""
      [ "$ri" -eq 0 ] && label="$time_label"

      local cells=()
      for day in 1 2 3 4 5; do
        local assistant
        assistant=$(echo "$assignments" | jq -r --arg s "$slot_start" --arg e "$slot_end" --argjson d "$day" --argjson ri "$ri" \
          '[.[] | select(.start == $s and .end == $e and .day_of_week == $d)] | sort_by(.assistant_id) | .[$ri].assistant_id // ""')
        cells+=("$assistant")
      done
      print_row "$label" "${cells[@]}"
    done

  done <<< "$slots"

  print_bottom_border

  # Assistant hours summary
  local hours
  hours=$(echo "$data" | jq -r '.scheduler_metadata.assistant_hours // empty')
  if [ -n "$hours" ] && [ "$hours" != "null" ]; then
    echo ""
    echo "Assistant Hours:"
    local hour_lines
    hour_lines=$(echo "$hours" | jq -r 'to_entries | sort_by(.key) | .[] | "\(.key)|\(.value)"')
    local col=0
    while IFS='|' read -r name hrs; do
      [ -z "$name" ] && continue
      local padded
      padded=$(printf "%-14s" "$name" | tr ' ' '.')
      printf "  %s %5sh" "$padded" "$hrs"
      col=$((col + 1))
      if [ "$col" -ge 3 ]; then
        echo
        col=0
      fi
    done <<< "$hour_lines"
    [ "$col" -ne 0 ] && echo
  fi

  echo ""
}

# ── Availability ─────────────────────────────────────────────────────────────

cmd_availability() {
  local schedule_id="$1"

  if [ -z "$schedule_id" ]; then
    cmd_schedules
    return
  fi

  # Fetch schedule to get generation_id and title
  local sched
  sched=$(curl -sf "$API/schedules/$schedule_id" 2>/dev/null) || {
    echo "Error: could not fetch schedule $schedule_id"
    exit 1
  }

  local title gen_id
  title=$(echo "$sched" | jq -r '.title')
  gen_id=$(echo "$sched" | jq -r '.generation_id // empty')

  if [ -z "$gen_id" ]; then
    echo "Schedule \"$title\" has no generation (manually created). No availability data."
    exit 1
  fi

  # Fetch generation to get request_payload with assistant availability
  local gen
  gen=$(curl -sf "$API/schedule-generations/$gen_id" 2>/dev/null) || {
    echo "Error: could not fetch generation $gen_id"
    exit 1
  }

  local payload
  payload=$(echo "$gen" | jq '.request_payload')

  if [ "$payload" = "null" ] || [ -z "$payload" ]; then
    echo "Generation has no request payload."
    exit 1
  fi

  local assistants
  assistants=$(echo "$payload" | jq '.assistants')

  echo "Availability: \"$title\""
  echo "$(repeat_char "═" 50)"
  echo ""

  # Collect all unique time windows across all assistants
  local slots
  slots=$(echo "$assistants" | jq -r '
    [.[] | .availability[] | {start: .start, end: .end}]
    | unique | sort_by(.start) | .[] | "\(.start)|\(.end)"
  ')

  print_top_border
  print_header
  print_separator

  local first=true
  while IFS='|' read -r slot_start slot_end; do
    [ -z "$slot_start" ] && continue

    if [ "$first" = true ]; then
      first=false
    else
      print_separator
    fi

    # Find max assistants available in any day for this slot
    local max_avail=0
    for day in 1 2 3 4 5; do
      local nc
      nc=$(echo "$assistants" | jq --arg s "$slot_start" --arg e "$slot_end" --argjson d "$day" '
        [.[] | select(.availability[] | .day_of_week == $d and .start == $s and .end == $e) | .id]
        | length
      ')
      [ "$nc" -gt "$max_avail" ] && max_avail=$nc
    done

    local time_label
    time_label=$(fmt_range "$slot_start" "$slot_end")

    for ((ri = 0; ri < max_avail; ri++)); do
      local label=""
      [ "$ri" -eq 0 ] && label="$time_label"

      local cells=()
      for day in 1 2 3 4 5; do
        local name
        name=$(echo "$assistants" | jq -r --arg s "$slot_start" --arg e "$slot_end" --argjson d "$day" --argjson ri "$ri" '
          [.[] | select(.availability[] | .day_of_week == $d and .start == $s and .end == $e) | .id]
          | sort | .[$ri] // ""
        ')
        cells+=("$name")
      done
      print_row "$label" "${cells[@]}"
    done

  done <<< "$slots"

  print_bottom_border

  # Summary: assistant hours constraints
  echo ""
  echo "Assistant Constraints:"
  local constraint_lines
  constraint_lines=$(echo "$assistants" | jq -r '.[] | "\(.id)|\(.min_hours)|\(.max_hours)|\(.cost_per_hour)|\(.courses | join(", "))"')
  printf "  %-16s %s  %s  %s  %s\n" "Name" "Min" "Max" "\$/hr" "Courses"
  printf "  %-16s %s  %s  %s  %s\n" "────" "───" "───" "────" "───────"
  while IFS='|' read -r name min_h max_h cost courses; do
    [ -z "$name" ] && continue
    printf "  %-16s %3s  %3s  %4s  %s\n" "$name" "$min_h" "$max_h" "$cost" "${courses:--}"
  done <<< "$constraint_lines"

  echo ""
}

# ── All ──────────────────────────────────────────────────────────────────────

resolve_schedule_id() {
  local id="$1"
  if [ -n "$id" ]; then
    echo "$id"
    return
  fi
  local list
  list=$(curl -sf "$API/schedules/" 2>/dev/null) || return 1
  echo "$list" | jq -r 'first.schedule_id // empty'
}

cmd_all() {
  local schedule_id
  schedule_id=$(resolve_schedule_id "${1:-}") || {
    echo "Error: could not fetch schedules. Is the backend running?"
    exit 1
  }

  if [ -z "$schedule_id" ]; then
    echo "No active schedules found. Showing shift templates only."
    echo ""
    cmd_shifts
    return
  fi

  cmd_shifts
  cmd_schedule "$schedule_id"
  cmd_availability "$schedule_id"
}

# ── Main ─────────────────────────────────────────────────────────────────────

usage() {
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Commands:"
  echo "  all [id]            Show shifts, schedule, and availability (default: most recent)"
  echo "  shifts              Show shift templates as a weekly grid"
  echo "  schedule            List all active schedules"
  echo "  schedule <id>       Show a schedule's assignments as a weekly grid"
  echo "  availability <id>   Show assistant availability for a schedule"
  echo ""
}

case "${1:-}" in
  all)                 cmd_all "${2:-}" ;;
  shifts)              cmd_shifts ;;
  schedule|schedules)  cmd_schedule "${2:-}" ;;
  availability)        cmd_availability "${2:-}" ;;
  -h|--help)           usage ;;
  *)                   usage; exit 1 ;;
esac
