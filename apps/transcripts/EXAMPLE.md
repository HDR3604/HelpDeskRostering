# Transcript Extraction - Example

## Input

A UWI unofficial transcript PDF containing watermark overlays, programme information, course records across multiple semesters, and GPA totals.

After watermark filtering, the extracted text looks like this:

```
Student Name: Jane Smith
Student ID: 816045123
Academic Record

CURRENT PROGRAMME
Degree: BSc
Programme: Computer Science (General)
Faculty: Science and Technology
Major: Computer Science
Department: Computing and Information Technology
Campus: St. Augustine

Term 2022/2023 Semester I

Subject Code Level Title Grade Credits Quality Points GPA Hours
COMP 1601 S UG Computer Programming I A+ 3.00 12.00 4.00
COMP 1602 S UG Computer Programming II A 3.00 12.00 4.00
MATH 1115 S UG Fundamental Mathematics for B+ 3.00 9.00 3.00
General Science
INFO 1601 S UG Introduction to Information B 3.00 9.00 3.00
Technology
Current Term GPA: 3.50

Term 2022/2023 Semester II

COMP 1603 S UG Computer Programming III A- 3.00 11.00 3.67
COMP 1604 S UG Mathematics for Computing B+ 3.00 9.00 3.00
FOUN 1101 S UG Caribbean Civilisation A 3.00 12.00 4.00
INFO 1600 S UG Introduction to Computing W 3.00 0.00 0.00
Current Term GPA: 3.56

Term 2023/2024 Semester I

COMP 2601 S UG Computer Architecture A 3.00 12.00 4.00
COMP 2602 S UG Software Engineering I B 3.00 9.00 3.00
COMP 2611 S UG Data Structures B+ 3.00 9.00 3.00
INFO 2602 S UG Web Programming DEF 3.00 0.00 0.00
Current Term GPA: 3.33

Term 2023/2024 Semester II

COMP 2603 S UG Object-Oriented Programming 3.00 0.00 0.00
COMP 2604 S UG Operating Systems 3.00 0.00 0.00
Current Term GPA: In Progress

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
Overall: 36.00 30.00 30.00 30.00 104.00 3.47
Degree: 36.00 30.00 30.00 30.00 104.00 3.47
```

---

## Request

```bash
curl -X POST http://localhost:8001/api/v1/transcripts/extract \
  -F "file=@jane-smith-transcript.pdf"
```

---

## Response

```json
{
  "current_programme": "BSc",
  "major": "Computer Science",
  "current_term": "2023/2024 Semester II",
  "current_year": 2,
  "degree_gpa": 3.47,
  "overall_gpa": 3.47,
  "courses": [
    {
      "code": "COMP 1601",
      "title": "Computer Programming I",
      "grade": "A+"
    },
    {
      "code": "COMP 1602",
      "title": "Computer Programming II",
      "grade": "A"
    },
    {
      "code": "MATH 1115",
      "title": "Fundamental Mathematics for General Science",
      "grade": "B+"
    },
    {
      "code": "INFO 1601",
      "title": "Introduction to Information Technology",
      "grade": "B"
    },
    {
      "code": "COMP 1603",
      "title": "Computer Programming III",
      "grade": "A-"
    },
    {
      "code": "COMP 1604",
      "title": "Mathematics for Computing",
      "grade": "B+"
    },
    {
      "code": "FOUN 1101",
      "title": "Caribbean Civilisation",
      "grade": "A"
    },
    {
      "code": "INFO 1600",
      "title": "Introduction to Computing",
      "grade": "W"
    },
    {
      "code": "COMP 2601",
      "title": "Computer Architecture",
      "grade": "A"
    },
    {
      "code": "COMP 2602",
      "title": "Software Engineering I",
      "grade": "B"
    },
    {
      "code": "COMP 2611",
      "title": "Data Structures",
      "grade": "B+"
    },
    {
      "code": "INFO 2602",
      "title": "Web Programming",
      "grade": "DEF"
    },
    {
      "code": "COMP 2603",
      "title": "Object-Oriented Programming",
      "grade": null
    },
    {
      "code": "COMP 2604",
      "title": "Operating Systems",
      "grade": null
    }
  ]
}
```

---

## Breakdown

### Programme Info

Extracted from the `CURRENT PROGRAMME` block between the header and the first `Term` line:

| Field | Value |
|-------|-------|
| `current_programme` | `"BSc"` (from `Degree: BSc`) |
| `major` | `"Computer Science"` (from `Major: Computer Science`) |

### Current Term & Year

| Field | How | Value |
|-------|-----|-------|
| `current_term` | Last semester reference in the document | `"2023/2024 Semester II"` |
| `current_year` | Highest course code level: COMP **2**xxx = year 2 | `2` |

### GPAs

From the `TRANSCRIPT TOTALS` section — the last number in each row:

| Field | Row | Value |
|-------|-----|-------|
| `overall_gpa` | `Overall: 36.00 30.00 30.00 30.00 104.00 3.47` | `3.47` |
| `degree_gpa` | `Degree: 36.00 30.00 30.00 30.00 104.00 3.47` | `3.47` |

### Courses

14 courses extracted across 4 semesters:

| Code | Grade | Notes |
|------|-------|-------|
| COMP 1601 | A+ | Standard grade |
| MATH 1115 | B+ | Multi-line title: "Fundamental Mathematics for" + "General Science" |
| INFO 1600 | W | Withdrawn — recognized as a valid grade |
| INFO 2602 | DEF | Deferred — recognized as a valid grade |
| COMP 2603 | `null` | In-progress — no grade assigned yet |
| COMP 2604 | `null` | In-progress — no grade assigned yet |

### Supported Grade Types

| Grade | Meaning |
|-------|---------|
| A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F | Standard letter grades |
| HD | High distinction |
| P | Pass |
| W | Withdrawn |
| MC | Medical compensation |
| AB | Absent |
| DEF | Deferred |
| NC | No credit |
| EX | Exemption |
| NP | Not passed |
| INC | Incomplete |
| `null` | In-progress (no grade yet) |
