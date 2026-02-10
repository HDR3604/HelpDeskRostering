"""
extract_transcript.py — Extract structured data from UWI unofficial transcript PDFs.

Filters out the "Unofficial Transcript" watermark overlay (font size > 20)
using pdfplumber's coordinate-based extraction, then outputs JSON with:
  - current_programme, major, current_term, current_year
  - degree_gpa, overall_gpa
  - course_codes[]

Dependencies: pip install pdfplumber

Usage: python3 extract_transcript.py <transcript.pdf>
"""

import sys
import re
import json
import pdfplumber


def extract_clean_text(pdf_path: str) -> str:
    """Extract text from PDF with watermark characters (size > 20) filtered out."""
    pdf = pdfplumber.open(pdf_path)
    pages = []
    for page in pdf.pages:
        filtered = page.filter(
            lambda obj: obj.get("size", 0) < 20 if "size" in obj else True
        )
        pages.append(filtered.extract_text() or "")
    pdf.close()
    return "\n".join(pages)


def parse_transcript(text: str) -> dict:
    lines = text.split("\n")

    # ---- Courses (code + title) ----
    re_course = re.compile(
        r"^([A-Z]{2,4})\s+(\d{4})\s+S\s+UG\s+"
        r"(.+?)\s+"
        r"(?:(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|HD|P)\s+)?"
        r"(\d+\.\d+)\s+(?:\d+\.\d+\s+)?\d+\.\d+"
    )
    re_not_cont = re.compile(
        r"^([A-Z]{2,4}\s+\d{4}\s+S\s+UG|Subject|Term |Current |Cumulative|"
        r"This is|Faculty|Programme|Major|Student |Academic|Final |"
        r"In Progress|TRANSCRIPT|Total |Overall|Degree:|Attempt|"
        r"Hours|Passed|Earned|GPA|Quality|Mark )"
    )

    courses = []
    for i, line in enumerate(lines):
        m = re_course.match(line.strip())
        if m:
            code = f"{m.group(1)} {m.group(2)}"
            title = m.group(3).strip()
            grade = m.group(4)  # None for in-progress courses
            # Check next line for continuation (multi-line titles)
            if i + 1 < len(lines):
                nxt = lines[i + 1].strip()
                if nxt and nxt[0].isupper() and not re_not_cont.match(nxt):
                    title += " " + nxt
            courses.append({"code": code, "title": title, "grade": grade})

    codes = [c["code"] for c in courses]

    # ---- GPAs from TRANSCRIPT TOTALS ----
    overall = re.search(
        r"Overall:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)", text
    )
    degree = re.search(
        r"Degree:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)", text
    )

    # ---- Current programme from CURRENT PROGRAMME block ----
    prog = {}
    in_block = False
    for line in lines:
        tr = line.strip()
        if "CURRENT PROGRAMME" in tr:
            in_block = True
            continue
        if "DEGREE GPA TOTALS" in tr:
            break
        if in_block:
            parts = tr.split(":", 1)
            if len(parts) == 2 and parts[1].strip():
                key, val = parts[0].strip(), parts[1].strip()
                field_map = {
                    "Degree": "degree",
                    "Programme": "programme",
                    "Faculty": "faculty",
                    "Major": "major",
                    "Department": "department",
                    "Campus": "campus",
                }
                if key in field_map:
                    prog[field_map[key]] = val

    # ---- Current year from highest course level ----
    current_year = max((int(c.split()[1]) // 1000 for c in codes), default=0)

    # ---- Current term (last semester in document) ----
    semesters = re.findall(r"(20\d{2}/20\d{2}\s+Semester\s+I{1,2})", text)
    current_term = semesters[-1] if semesters else ""

    return {
        "current_programme": prog.get("degree", ""),
        "major": prog.get("major", ""),
        "current_term": current_term,
        "current_year": current_year,
        "degree_gpa": float(degree.group(6)) if degree else None,
        "overall_gpa": float(overall.group(6)) if overall else None,
        "courses": courses,
    }


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <transcript.pdf>", file=sys.stderr)
        sys.exit(1)

    text = extract_clean_text(sys.argv[1])
    result = parse_transcript(text)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()