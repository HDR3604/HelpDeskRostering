# Scheduler Service

A stateless FastAPI service that generates optimal helpdesk schedules using mixed-integer linear programming (PuLP). It takes assistants, shifts, and an optional config, then returns shift assignments that respect availability, course expertise, hour limits, and fairness constraints.

## Quick Start

```bash
# Local development (with hot reload)
cd apps/scheduler
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# Or via Docker (from project root)
docker compose -f docker-compose.local.yml up scheduler

# Run tests
.venv/bin/python -m pytest tests/ -v
```

## API

Base URL: `http://localhost:8000/api/v1`

### `GET /healthy`

Returns `{"status": "healthy"}`.

### `POST /schedules/generate`

Generates an optimal schedule. Returns `201` on success.

---

## Request Body

```jsonc
{
  "assistants": [
    {
      "id": "816034521",                          // unique identifier
      "courses": ["COMP 3603", "INFO 2602"],       // courses they can tutor
      "availability": [
        {
          "day_of_week": 0,                        // 0=Mon, 1=Tue, ..., 6=Sun
          "start": "10:00:00",                     // inclusive
          "end": "14:00:00"                        // exclusive
        }
      ],
      "min_hours": 4.0,                            // minimum weekly hours
      "max_hours": 10.0,                           // maximum weekly hours (null = no limit)
      "cost_per_hour": 0.0                         // for cost optimization (0 = ignore)
    }
  ],
  "shifts": [
    {
      "id": "mon-10-11",                           // unique identifier
      "day_of_week": 0,
      "start": "10:00:00",
      "end": "11:00:00",
      "course_demands": [
        {
          "course_code": "COMP 3603",              // course that needs coverage
          "tutors_required": 1,                    // how many tutors for this course
          "weight": 1.0                            // priority weight (higher = more important)
        }
      ],
      "min_staff": 2,                              // minimum total staff on this shift
      "max_staff": 3                               // maximum staff (null = no limit)
    }
  ],
  "scheduler_config": null                         // optional, uses defaults if omitted
}
```

### Validation Rules

| Rule | HTTP Status | Error |
|------|-------------|-------|
| `assistants` is empty | 422 | `at least one assistant is required` |
| `shifts` is empty | 422 | `at least one shift is required` |
| No assistant's availability covers any shift | 422 | `no feasible assignments` |
| Solver returns infeasible/error status | 422 | `solver returned non-optimal status: {status}` |

---

## Response Body

```jsonc
{
  "status": "Optimal",                             // "Optimal", "Feasible", or error
  "assignments": [
    {
      "assistant_id": "816034521",
      "shift_id": "mon-10-11",
      "day_of_week": 0,                            // denormalized for frontend convenience
      "start": "10:00:00",
      "end": "11:00:00"
    }
  ],
  "assistant_hours": {
    "816034521": 9.0                               // total hours assigned per assistant
  },
  "metadata": {
    "objective_value": 1828.0,                     // solver's minimized penalty score
    "solver_status_code": 1,                       // PuLP status (1 = Optimal)
    "course_shortfalls": {
      "tue-13-14:COMP 3613": 1.0                   // shift:course pairs with unmet demand
    },
    "staff_shortfalls": {
      "mon-12-13": 1.0                             // shifts below min_staff (value = gap)
    }
  }
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `status` | `"Optimal"` = best solution found. `"Feasible"` = valid but possibly suboptimal. |
| `assignments` | Flat list with denormalized shift details so the frontend can render directly. |
| `assistant_hours` | Total weekly hours per assistant. |
| `metadata.objective_value` | Total weighted penalty the solver minimized. Lower is better. Useful for comparing configs. |
| `metadata.course_shortfalls` | Only non-zero entries. Format `"shift_id:course_code": gap`. Means no available+qualified assistant could be assigned. |
| `metadata.staff_shortfalls` | Only non-zero entries. Shifts where fewer than `min_staff` were assigned. |

---

## Scheduler Config

All fields are optional. Pass `"scheduler_config": { ... }` in the request to override defaults.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `course_shortfall_penalty` | float | 1.0 | Penalty per unmet course tutor demand per shift |
| `min_hours_penalty` | float | 10.0 | Penalty per hour below an assistant's `min_hours` |
| `max_hours_penalty` | float | 5.0 | Penalty per hour above an assistant's `max_hours` |
| `understaffed_penalty` | float | 100.0 | Penalty per staff member below `min_staff` per shift |
| `extra_hours_penalty` | float | 5.0 | Penalty per hour above `baseline_hours_target` |
| `max_extra_penalty` | float | 20.0 | Penalty for exceeding max extra hours (fairness) |
| `baseline_hours_target` | int | 6 | Target hours per assistant. Deviations are penalized to keep workload fair |
| `allow_minimum_violation` | bool | false | If true, allows assigning below `min_hours` without hard constraint |
| `staff_shortfall_max` | int | null | Cap on how understaffed a single shift can be (null = no cap) |
| `solver_time_limit` | int | null | Max solver runtime in seconds (null = no limit) |
| `solver_gap` | float | null | Acceptable optimality gap (e.g. 0.05 = 5%). Speeds up large problems |
| `log_solver_output` | bool | false | Print PuLP/CBC solver logs to stdout |

### Tuning Guide

- **Not enough staff?** Lower `baseline_hours_target` or increase assistants' `max_hours`.
- **Course gaps?** Increase `course_shortfall_penalty` to prioritize course coverage over staffing.
- **Uneven hours?** Increase `extra_hours_penalty` and `max_extra_penalty` to flatten distribution.
- **Solver too slow?** Set `solver_time_limit` and/or `solver_gap` to accept a good-enough solution.
- **Want to debug?** Set `log_solver_output: true` and `LOG_LEVEL=DEBUG` env var.

---

## Error Responses

All errors return JSON with a `detail` field.

### 422 - Validation / Solver Error

```json
{ "detail": "at least one assistant is required" }
```

```json
{ "detail": "solver returned non-optimal status: Infeasible" }
```

### 500 - Internal Server Error

```json
{ "detail": "internal server error" }
```

Stack traces are logged server-side but never exposed in the response.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

---

## Project Structure

```
scheduler/
├── app/
│   ├── main.py                  # FastAPI app, routes, error handling
│   ├── linear_scheduler.py      # PuLP solver (dataclasses + solve function)
│   ├── models/
│   │   ├── __init__.py
│   │   └── generate_schedule_dtos.py  # Pydantic request/response models
│   └── EXAMPLE.md               # Full worked example with visual calendars
├── tests/
│   ├── conftest.py              # Shared fixtures
│   ├── test_dtos.py             # Model validation tests
│   └── test_api.py              # API endpoint tests
├── Dockerfile                   # Production image
├── Dockerfile.dev               # Dev image with hot reload
├── requirements.txt             # Production dependencies
└── requirements-dev.txt         # + test dependencies
```

See [EXAMPLE.md](./EXAMPLE.md) for a full worked example with visual calendars showing input, output, and explanations.
