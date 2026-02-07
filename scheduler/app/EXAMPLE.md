# HelpDesk Scheduler - Example Scenario

## Problem

The HelpDesk operates **Monday-Friday, 10am-4pm** in 1-hour shifts. Given a pool of student assistants — each with their own course expertise, weekly availability, and hour constraints — the scheduler must assign assistants to shifts such that:

- Each shift has **2-3 staff** on duty
- **Course-specific demand** is covered (at least 1 tutor per required course per shift)
- Each assistant only works shifts they're **available** for and **qualified** in (based on courses)
- Weekly hours fall within each assistant's **min/max range**
- Hours are distributed **fairly** across assistants (baseline target)

---

## Assistants

| ID          | Courses                                   | Min Hrs | Max Hrs |
|-------------|-------------------------------------------|---------|---------|
| 816034521   | COMP 3603, COMP 3613, INFO 2602           | 4       | 10      |
| 816041278   | COMP 3603, COMP 2611                       | 3       | 8       |
| 816027893   | INFO 2602, INFO 2604, COMP 2611            | 4       | 9       |
| 816055610   | COMP 3603, COMP 3613, COMP 2611, INFO 2604 | 5       | 12      |
| 816038745   | INFO 2602, COMP 3613                       | 3       | 8       |

### Availability Calendar

```
             Mon           Tue           Wed           Thu           Fri
           ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
 816034521 │ 10am - 2pm  │             │ 11am - 4pm  │             │ 10am - 1pm  │
           ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
 816041278 │ 10am - 1pm  │ 10am - 4pm  │             │ 12pm - 4pm  │             │
           ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
 816027893 │             │ 10am - 2pm  │ 10am - 1pm  │ 10am - 3pm  │             │
           ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
 816055610 │ 11am - 4pm  │ 10am - 1pm  │  1pm - 4pm  │             │ 10am - 4pm  │
           ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
 816038745 │ 10am - 12pm │             │ 10am - 4pm  │  1pm - 4pm  │             │
           └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Shift Schedule (Course Demands)

Each cell shows which courses need a tutor during that hour. Every shift requires 2-3 staff total.

```
          Mon             Tue             Wed             Thu             Fri
        ┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
 10-11  │ COMP 3603     │ COMP 2611     │ INFO 2602     │ INFO 2602     │ COMP 3613     │
        │ INFO 2602     │ INFO 2602     │               │ INFO 2604     │               │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
 11-12  │ COMP 3613     │ COMP 3603     │ COMP 3603     │ COMP 3603     │ COMP 3603     │
        │ COMP 2611     │               │ COMP 3613     │               │               │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
 12-1   │ COMP 3603     │ INFO 2604     │ COMP 2611     │ COMP 2611     │ INFO 2602     │
        │               │               │               │               │ COMP 2611     │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
  1-2   │ INFO 2604     │ COMP 3613     │ INFO 2604     │ COMP 3613     │ INFO 2604     │
        │               │               │               │               │               │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
  2-3   │ COMP 3613     │ COMP 3603     │ COMP 3603     │ INFO 2604     │ COMP 3613     │
        │               │               │               │               │               │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
  3-4   │ COMP 2611     │ INFO 2602     │ COMP 3613     │ COMP 3603     │ COMP 3603     │
        │               │               │               │               │               │
        └───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

---

## Config

| Parameter              | Value |
|------------------------|-------|
| baseline_hours_target  | 4     |

The solver tries to give each assistant close to 4 hours/week, penalizing deviations to keep workload fair.

---

## Request

<details>
<summary>Click to expand curl command</summary>

```bash
curl -s -X POST "http://localhost:8000/api/v1/schedules/generate" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF' | python3 -m json.tool
{
  "assistants": [
    {
      "id": "816034521",
      "courses": ["COMP 3603", "COMP 3613", "INFO 2602"],
      "availability": [
        { "day_of_week": 0, "start": "10:00:00", "end": "14:00:00" },
        { "day_of_week": 2, "start": "11:00:00", "end": "16:00:00" },
        { "day_of_week": 4, "start": "10:00:00", "end": "13:00:00" }
      ],
      "min_hours": 4.0,
      "max_hours": 10.0,
      "cost_per_hour": 0.0
    },
    {
      "id": "816041278",
      "courses": ["COMP 3603", "COMP 2611"],
      "availability": [
        { "day_of_week": 0, "start": "10:00:00", "end": "13:00:00" },
        { "day_of_week": 1, "start": "10:00:00", "end": "16:00:00" },
        { "day_of_week": 3, "start": "12:00:00", "end": "16:00:00" }
      ],
      "min_hours": 3.0,
      "max_hours": 8.0,
      "cost_per_hour": 0.0
    },
    {
      "id": "816027893",
      "courses": ["INFO 2602", "INFO 2604", "COMP 2611"],
      "availability": [
        { "day_of_week": 1, "start": "10:00:00", "end": "14:00:00" },
        { "day_of_week": 2, "start": "10:00:00", "end": "13:00:00" },
        { "day_of_week": 3, "start": "10:00:00", "end": "15:00:00" }
      ],
      "min_hours": 4.0,
      "max_hours": 9.0,
      "cost_per_hour": 0.0
    },
    {
      "id": "816055610",
      "courses": ["COMP 3603", "COMP 3613", "COMP 2611", "INFO 2604"],
      "availability": [
        { "day_of_week": 0, "start": "11:00:00", "end": "16:00:00" },
        { "day_of_week": 1, "start": "10:00:00", "end": "13:00:00" },
        { "day_of_week": 2, "start": "13:00:00", "end": "16:00:00" },
        { "day_of_week": 4, "start": "10:00:00", "end": "16:00:00" }
      ],
      "min_hours": 5.0,
      "max_hours": 12.0,
      "cost_per_hour": 0.0
    },
    {
      "id": "816038745",
      "courses": ["INFO 2602", "COMP 3613"],
      "availability": [
        { "day_of_week": 0, "start": "10:00:00", "end": "12:00:00" },
        { "day_of_week": 2, "start": "10:00:00", "end": "16:00:00" },
        { "day_of_week": 3, "start": "13:00:00", "end": "16:00:00" }
      ],
      "min_hours": 3.0,
      "max_hours": 8.0,
      "cost_per_hour": 0.0
    }
  ],
  "shifts": [
    {
      "id": "mon-10-11", "day_of_week": 0, "start": "10:00:00", "end": "11:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 },
        { "course_code": "INFO 2602", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "mon-11-12", "day_of_week": 0, "start": "11:00:00", "end": "12:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 },
        { "course_code": "COMP 2611", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "mon-12-13", "day_of_week": 0, "start": "12:00:00", "end": "13:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "mon-13-14", "day_of_week": 0, "start": "13:00:00", "end": "14:00:00",
      "course_demands": [
        { "course_code": "INFO 2604", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "mon-14-15", "day_of_week": 0, "start": "14:00:00", "end": "15:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "mon-15-16", "day_of_week": 0, "start": "15:00:00", "end": "16:00:00",
      "course_demands": [
        { "course_code": "COMP 2611", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "tue-10-11", "day_of_week": 1, "start": "10:00:00", "end": "11:00:00",
      "course_demands": [
        { "course_code": "COMP 2611", "tutors_required": 1, "weight": 1.0 },
        { "course_code": "INFO 2602", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "tue-11-12", "day_of_week": 1, "start": "11:00:00", "end": "12:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "tue-12-13", "day_of_week": 1, "start": "12:00:00", "end": "13:00:00",
      "course_demands": [
        { "course_code": "INFO 2604", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "tue-13-14", "day_of_week": 1, "start": "13:00:00", "end": "14:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "tue-14-15", "day_of_week": 1, "start": "14:00:00", "end": "15:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "tue-15-16", "day_of_week": 1, "start": "15:00:00", "end": "16:00:00",
      "course_demands": [
        { "course_code": "INFO 2602", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "wed-10-11", "day_of_week": 2, "start": "10:00:00", "end": "11:00:00",
      "course_demands": [
        { "course_code": "INFO 2602", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "wed-11-12", "day_of_week": 2, "start": "11:00:00", "end": "12:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 },
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "wed-12-13", "day_of_week": 2, "start": "12:00:00", "end": "13:00:00",
      "course_demands": [
        { "course_code": "COMP 2611", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "wed-13-14", "day_of_week": 2, "start": "13:00:00", "end": "14:00:00",
      "course_demands": [
        { "course_code": "INFO 2604", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "wed-14-15", "day_of_week": 2, "start": "14:00:00", "end": "15:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "wed-15-16", "day_of_week": 2, "start": "15:00:00", "end": "16:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "thu-10-11", "day_of_week": 3, "start": "10:00:00", "end": "11:00:00",
      "course_demands": [
        { "course_code": "INFO 2602", "tutors_required": 1, "weight": 1.0 },
        { "course_code": "INFO 2604", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "thu-11-12", "day_of_week": 3, "start": "11:00:00", "end": "12:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "thu-12-13", "day_of_week": 3, "start": "12:00:00", "end": "13:00:00",
      "course_demands": [
        { "course_code": "COMP 2611", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "thu-13-14", "day_of_week": 3, "start": "13:00:00", "end": "14:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "thu-14-15", "day_of_week": 3, "start": "14:00:00", "end": "15:00:00",
      "course_demands": [
        { "course_code": "INFO 2604", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "thu-15-16", "day_of_week": 3, "start": "15:00:00", "end": "16:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "fri-10-11", "day_of_week": 4, "start": "10:00:00", "end": "11:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "fri-11-12", "day_of_week": 4, "start": "11:00:00", "end": "12:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "fri-12-13", "day_of_week": 4, "start": "12:00:00", "end": "13:00:00",
      "course_demands": [
        { "course_code": "INFO 2602", "tutors_required": 1, "weight": 1.0 },
        { "course_code": "COMP 2611", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "fri-13-14", "day_of_week": 4, "start": "13:00:00", "end": "14:00:00",
      "course_demands": [
        { "course_code": "INFO 2604", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "fri-14-15", "day_of_week": 4, "start": "14:00:00", "end": "15:00:00",
      "course_demands": [
        { "course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    },
    {
      "id": "fri-15-16", "day_of_week": 4, "start": "15:00:00", "end": "16:00:00",
      "course_demands": [
        { "course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0 }
      ],
      "min_staff": 2, "max_staff": 3
    }
  ],
  "scheduler_config": {
    "baseline_hours_target": 4
  }
}
EOF
```

</details>

---

## Response

The solver returns an **optimal** schedule. Here's what each field means:

### `status`

The solver outcome. `"Optimal"` means the best possible solution was found. Other values: `"Feasible"` (a valid but possibly suboptimal solution), or error statuses like `"Infeasible"`.

### `assignments`

A flat list of who works where. Each entry includes denormalized shift details so the frontend can render directly without a separate lookup.

#### Result Calendar (who's on duty each hour)

Using short IDs for readability: **521** = 816034521, **278** = 816041278, **893** = 816027893, **610** = 816055610, **745** = 816038745

```
          Mon             Tue             Wed             Thu             Fri
        ┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
 10-11  │ 278, 745      │ 893           │ 745           │ 893           │ 521           │
        │               │  *            │  *            │  *            │  *            │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
 11-12  │ 521, 278      │ 278, 893      │ 521, 893      │ 893           │ 521           │
        │               │               │               │  *            │  *            │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
 12-1   │ 521           │ 278, 610      │ 893, 745      │ 278           │ 521, 610      │
        │  *            │               │               │  *            │               │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
  1-2   │ 521, 610      │ 278, 893      │ 610, 745      │ 893, 745      │ 610           │
        │               │               │               │               │  *            │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
  2-3   │ 610           │ 278           │ 521, 745      │ 893, 745      │ 610           │
        │  *            │  *            │               │               │  *            │
        ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
  3-4   │ 610           │ 278           │ 521           │ 278, 745      │ 610           │
        │  *            │  *            │  *            │               │  *            │
        └───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘

 * = staff shortfall (only 1 person when 2 are required)
```

### `assistant_hours`

Total weekly hours assigned to each assistant.

| Assistant   | Hours | Min | Max | Status               |
|-------------|-------|-----|-----|----------------------|
| 816034521   | 9     | 4   | 10  | Within range         |
| 816041278   | 9     | 3   | 8   | Over max by 1        |
| 816027893   | 9     | 4   | 9   | At max               |
| 816055610   | 9     | 5   | 12  | Within range         |
| 816038745   | 8     | 3   | 8   | At max               |

Hours are distributed fairly (8-9 hrs each) despite the baseline target of 4. The solver pushes hours above baseline because 30 shifts x 2 min_staff = 60 staff-slots need filling with only 5 assistants.

### `metadata`

Solver diagnostics for understanding tradeoffs.

#### `objective_value: 1828.0`

The total weighted penalty score the solver minimized. Lower is better. Not meaningful on its own, but useful for comparing different configs.

#### `solver_status_code: 1`

PuLP internal code. `1` = Optimal.

#### `course_shortfalls`

Shifts where a required course tutor **could not be assigned** (no available+qualified assistant). Format: `"shift_id:course_code": gap`.

| Shift       | Course Needed | Gap | Why                                                        |
|-------------|---------------|-----|------------------------------------------------------------|
| tue-13-14   | COMP 3613     | 1   | Only 278 + 893 available; neither knows COMP 3613          |
| tue-15-16   | INFO 2602     | 1   | Only 278 available; they don't know INFO 2602              |
| thu-11-12   | COMP 3603     | 1   | Only 893 available; they don't know COMP 3603              |

These are unavoidable given the availability/course constraints. To fix: add more assistants or expand availability windows.

#### `staff_shortfalls`

Shifts where fewer than `min_staff` (2) were assigned. Value = how many more staff are needed.

```
16 of 30 shifts are understaffed by 1 person:

  Mon: 12-1, 2-3, 3-4
  Tue: 10-11, 2-3, 3-4
  Wed: 10-11, 3-4
  Thu: 10-11, 11-12, 12-1
  Fri: 10-11, 11-12, 1-2, 2-3, 3-4
```

This is expected: 30 shifts x 2 min_staff = 60 slots, but 5 assistants can only provide ~44 hours total. The solver does the best it can, prioritizing shifts where course demands are hardest to fill.

### Raw JSON

<details>
<summary>Click to expand full response</summary>

```json
{
  "status": "Optimal",
  "assignments": [
    { "assistant_id": "816034521", "shift_id": "mon-11-12", "day_of_week": 0, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816034521", "shift_id": "mon-12-13", "day_of_week": 0, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816034521", "shift_id": "mon-13-14", "day_of_week": 0, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816034521", "shift_id": "wed-11-12", "day_of_week": 2, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816034521", "shift_id": "wed-14-15", "day_of_week": 2, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816034521", "shift_id": "wed-15-16", "day_of_week": 2, "start": "15:00:00", "end": "16:00:00" },
    { "assistant_id": "816034521", "shift_id": "fri-10-11", "day_of_week": 4, "start": "10:00:00", "end": "11:00:00" },
    { "assistant_id": "816034521", "shift_id": "fri-11-12", "day_of_week": 4, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816034521", "shift_id": "fri-12-13", "day_of_week": 4, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816041278", "shift_id": "mon-10-11", "day_of_week": 0, "start": "10:00:00", "end": "11:00:00" },
    { "assistant_id": "816041278", "shift_id": "mon-11-12", "day_of_week": 0, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816041278", "shift_id": "tue-11-12", "day_of_week": 1, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816041278", "shift_id": "tue-12-13", "day_of_week": 1, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816041278", "shift_id": "tue-13-14", "day_of_week": 1, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816041278", "shift_id": "tue-14-15", "day_of_week": 1, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816041278", "shift_id": "tue-15-16", "day_of_week": 1, "start": "15:00:00", "end": "16:00:00" },
    { "assistant_id": "816041278", "shift_id": "thu-12-13", "day_of_week": 3, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816041278", "shift_id": "thu-15-16", "day_of_week": 3, "start": "15:00:00", "end": "16:00:00" },
    { "assistant_id": "816027893", "shift_id": "tue-10-11", "day_of_week": 1, "start": "10:00:00", "end": "11:00:00" },
    { "assistant_id": "816027893", "shift_id": "tue-11-12", "day_of_week": 1, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816027893", "shift_id": "tue-13-14", "day_of_week": 1, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816027893", "shift_id": "wed-11-12", "day_of_week": 2, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816027893", "shift_id": "wed-12-13", "day_of_week": 2, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816027893", "shift_id": "thu-10-11", "day_of_week": 3, "start": "10:00:00", "end": "11:00:00" },
    { "assistant_id": "816027893", "shift_id": "thu-11-12", "day_of_week": 3, "start": "11:00:00", "end": "12:00:00" },
    { "assistant_id": "816027893", "shift_id": "thu-13-14", "day_of_week": 3, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816027893", "shift_id": "thu-14-15", "day_of_week": 3, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816055610", "shift_id": "mon-13-14", "day_of_week": 0, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816055610", "shift_id": "mon-14-15", "day_of_week": 0, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816055610", "shift_id": "mon-15-16", "day_of_week": 0, "start": "15:00:00", "end": "16:00:00" },
    { "assistant_id": "816055610", "shift_id": "tue-12-13", "day_of_week": 1, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816055610", "shift_id": "wed-13-14", "day_of_week": 2, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816055610", "shift_id": "fri-12-13", "day_of_week": 4, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816055610", "shift_id": "fri-13-14", "day_of_week": 4, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816055610", "shift_id": "fri-14-15", "day_of_week": 4, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816055610", "shift_id": "fri-15-16", "day_of_week": 4, "start": "15:00:00", "end": "16:00:00" },
    { "assistant_id": "816038745", "shift_id": "mon-10-11", "day_of_week": 0, "start": "10:00:00", "end": "11:00:00" },
    { "assistant_id": "816038745", "shift_id": "wed-10-11", "day_of_week": 2, "start": "10:00:00", "end": "11:00:00" },
    { "assistant_id": "816038745", "shift_id": "wed-12-13", "day_of_week": 2, "start": "12:00:00", "end": "13:00:00" },
    { "assistant_id": "816038745", "shift_id": "wed-13-14", "day_of_week": 2, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816038745", "shift_id": "wed-14-15", "day_of_week": 2, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816038745", "shift_id": "thu-13-14", "day_of_week": 3, "start": "13:00:00", "end": "14:00:00" },
    { "assistant_id": "816038745", "shift_id": "thu-14-15", "day_of_week": 3, "start": "14:00:00", "end": "15:00:00" },
    { "assistant_id": "816038745", "shift_id": "thu-15-16", "day_of_week": 3, "start": "15:00:00", "end": "16:00:00" }
  ],
  "assistant_hours": {
    "816034521": 9.0,
    "816041278": 9.0,
    "816027893": 9.0,
    "816055610": 9.0,
    "816038745": 8.0
  },
  "metadata": {
    "objective_value": 1828.0,
    "solver_status_code": 1,
    "course_shortfalls": {
      "tue-13-14:COMP 3613": 1.0,
      "tue-15-16:INFO 2602": 1.0,
      "thu-11-12:COMP 3603": 1.0
    },
    "staff_shortfalls": {
      "mon-12-13": 1.0,
      "mon-14-15": 1.0,
      "mon-15-16": 1.0,
      "tue-10-11": 1.0,
      "tue-14-15": 1.0,
      "tue-15-16": 1.0,
      "wed-10-11": 1.0,
      "wed-15-16": 1.0,
      "thu-10-11": 1.0,
      "thu-11-12": 1.0,
      "thu-12-13": 1.0,
      "fri-10-11": 1.0,
      "fri-11-12": 1.0,
      "fri-13-14": 1.0,
      "fri-14-15": 1.0,
      "fri-15-16": 1.0
    }
  }
}
```

</details>
