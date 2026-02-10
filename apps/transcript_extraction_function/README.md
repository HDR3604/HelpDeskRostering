# Transcript Extraction Service

A stateless FastAPI service that extracts structured data from UWI unofficial transcript PDFs. It accepts a PDF file upload, filters out watermark overlays, parses course records, GPAs, programme info, and current term/year, then returns structured JSON.

## Quick Start

```bash
# Local development (with hot reload)
cd transcript_extraction_function
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8001

# Or via Docker
docker compose -f docker-compose.local.yml up transcript-extraction

# Run tests
.venv/bin/python -m pytest tests/ -v
```

## API

Base URL: `http://localhost:8001/api/v1`

### `GET /healthy`

Returns `{"status": "healthy"}`.

### `POST /transcripts/extract`

Extracts structured data from a transcript PDF. Returns `200` on success.

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | The PDF file to extract (must be `application/pdf`) |

#### Example

```bash
curl -X POST http://localhost:8001/api/v1/transcripts/extract \
  -F "file=@transcript.pdf"
```

---

## Response Body

```jsonc
{
  "current_programme": "BSc",              // degree from CURRENT PROGRAMME block
  "major": "Computer Science",             // major field of study
  "current_term": "2023/2024 Semester II", // last semester found in document
  "current_year": 2,                       // derived from highest course level (e.g. COMP 2xxx = year 2)
  "degree_gpa": 3.44,                      // from TRANSCRIPT TOTALS (null if not found)
  "overall_gpa": 3.44,                     // from TRANSCRIPT TOTALS (null if not found)
  "courses": [
    {
      "code": "COMP 1601",                 // subject code + number
      "title": "Computer Programming I",   // course title (multi-line titles are joined)
      "grade": "A+"                         // letter grade, or null if in-progress
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `current_programme` | string | Degree type (e.g. "BSc", "MSc"). Empty string if not found. |
| `major` | string | Major field of study. Empty string if not found. |
| `current_term` | string | Last semester in the document (e.g. "2023/2024 Semester II", "2024/2025 Summer"). Empty string if not found. |
| `current_year` | int | Study year derived from highest course code level (COMP **2**xxx = year 2). `0` if no courses found. |
| `degree_gpa` | float \| null | Degree GPA from TRANSCRIPT TOTALS section. `null` if not found. |
| `overall_gpa` | float \| null | Overall GPA from TRANSCRIPT TOTALS section. `null` if not found. |
| `courses` | array | All course records found. Empty array if none found. |
| `courses[].code` | string | Subject code and number (e.g. "COMP 1601"). |
| `courses[].title` | string | Course title. Multi-line titles are joined with a space. |
| `courses[].grade` | string \| null | Letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F, HD, P, W, MC, AB, DEF, NC, EX, NP, INC). `null` for in-progress courses with no grade yet. |

---

## Validation Rules

| Rule | HTTP Status | Error |
|------|-------------|-------|
| File is not `application/pdf` | 422 | `file must be a PDF (application/pdf)` |
| File is empty (0 bytes) | 422 | `uploaded file is empty` |
| No text could be extracted from PDF | 422 | `could not extract text from PDF — file may be corrupt or not a transcript` |

---

## Error Responses

All errors return JSON with a `detail` field.

### 422 - Validation Error

```json
{ "detail": "file must be a PDF (application/pdf)" }
```

```json
{ "detail": "could not extract text from PDF — file may be corrupt or not a transcript" }
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

## How Extraction Works

1. **PDF opened** with pdfplumber. Each page is filtered to remove watermark characters (font size > 20), which removes the "Unofficial Transcript" overlay.

2. **Courses parsed** via regex matching lines like `COMP 1601 S UG Computer Programming I A+ 3.00 12.00 4.00`. Multi-line titles (next line is a continuation) are joined automatically.

3. **GPAs extracted** from the `TRANSCRIPT TOTALS` section — specifically the `Overall:` and `Degree:` rows.

4. **Programme info** parsed from the `CURRENT PROGRAMME` block (Degree, Programme, Faculty, Major, Department, Campus).

5. **Current year** derived from the highest course code level number (e.g. COMP **2**601 = year 2).

6. **Current term** is the last semester reference found (e.g. "2024/2025 Semester II").

Each extraction step is isolated — a failure in one section does not prevent the others from being extracted. Failed sections fall back to their default values (empty string, `null`, `0`, or `[]`).

---

## Project Structure

```
transcript_extraction_function/
├── app/
│   ├── main.py                         # FastAPI app, routes, error handling
│   ├── extractor.py                    # PDF extraction + transcript parsing logic
│   └── models/
│       ├── __init__.py
│       └── extract_transcript_dtos.py  # Pydantic response models
├── tests/
│   ├── conftest.py                     # sys.path setup
│   ├── test_main.py                    # Unit tests for extraction logic
│   └── test_api.py                     # API endpoint tests
├── Dockerfile                          # Production image
├── Dockerfile.dev                      # Dev image with hot reload
├── requirements.txt                    # Production dependencies
└── requirements-dev.txt                # + test dependencies
```
