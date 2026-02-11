"""
Transcript extraction engine — Extract structured data from UWI unofficial transcript PDFs.

Filters out the "Unofficial Transcript" watermark overlay (font size > 20)
using pdfplumber's coordinate-based extraction, then returns structured data with:
  - current_programme, major, current_term, current_year
  - degree_gpa, overall_gpa
  - courses[]
"""

import io
import os
import re
import logging

import pdfplumber

logger = logging.getLogger(__name__)


def _extract_pages(pdf) -> list[str]:
    """Extract text from an already-opened pdfplumber PDF, filtering watermark chars."""
    pages = []
    for page in pdf.pages:
        try:
            filtered = page.filter(
                lambda obj: obj.get("size", 0) < 20 if "size" in obj else True
            )
            pages.append(filtered.extract_text() or "")
        except Exception:
            logger.warning("Failed to extract page %s, skipping", page.page_number)
            pages.append("")
    return pages


def extract_clean_text(pdf_path: str) -> str:
    """Extract text from a PDF file path with watermark characters filtered out.

    Returns empty string on any error (missing file, corrupt PDF, etc.).
    """
    if not os.path.isfile(pdf_path):
        logger.error("PDF file not found: %s", pdf_path)
        return ""

    try:
        with pdfplumber.open(pdf_path) as pdf:
            return "\n".join(_extract_pages(pdf))
    except Exception:
        logger.error("Failed to open or read PDF: %s", pdf_path, exc_info=True)
        return ""


def extract_clean_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes (e.g. an HTTP upload blob) with watermark filtered out.

    Returns empty string on any error (corrupt PDF, empty bytes, etc.).
    """
    if not pdf_bytes:
        logger.error("Empty PDF bytes provided")
        return ""

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(_extract_pages(pdf))
    except Exception:
        logger.error("Failed to read PDF from bytes", exc_info=True)
        return ""


def _parse_student_info(text: str) -> dict[str, str]:
    """Extract student name and ID from transcript header."""
    info: dict[str, str] = {"first_name": "", "middle_name": "", "last_name": "", "student_id": ""}

    name_match = re.search(r"Record of:\s*(.+)", text) or re.search(r"Student Name:\s*(.+)", text)
    if name_match:
        parts = name_match.group(1).strip().split()
        if len(parts) >= 3:
            info["first_name"] = parts[0]
            info["middle_name"] = " ".join(parts[1:-1])
            info["last_name"] = parts[-1]
        elif len(parts) == 2:
            info["first_name"], info["last_name"] = parts
        elif len(parts) == 1:
            info["first_name"] = parts[0]

    id_match = re.search(r"Student Number:\s*(\S+)", text) or re.search(r"Student ID:\s*(\S+)", text)
    if id_match:
        info["student_id"] = id_match.group(1).strip()

    return info


def _parse_courses(lines: list[str]) -> list[dict]:
    """Extract course records from transcript lines."""
    re_course = re.compile(
        r"^([A-Z]{2,4})\s+(\d{4})\s+S\s+UG\s+"
        r"(.+?)\s+"
        r"(?:(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F3|F2|F1|F|HD|P|"
        r"W|MC|AB|DEF|NC|EX|NP|INC)\s+)?"
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
    return courses


def _parse_gpas(text: str) -> tuple[float | None, float | None]:
    """Extract overall and degree GPAs from TRANSCRIPT TOTALS section."""
    overall_match = re.search(
        r"Overall:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)", text
    )
    degree_match = re.search(
        r"Degree:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)", text
    )
    overall_gpa = float(overall_match.group(6)) if overall_match else None
    degree_gpa = float(degree_match.group(6)) if degree_match else None
    return overall_gpa, degree_gpa


def _parse_programme(lines: list[str]) -> dict[str, str]:
    """Extract CURRENT PROGRAMME block fields."""
    prog = {}
    in_block = False
    stop_markers = ("DEGREE GPA TOTALS", "TRANSCRIPT TOTALS")
    field_map = {
        "Degree": "degree",
        "Programme": "programme",
        "Faculty": "faculty",
        "Major": "major",
        "Department": "department",
        "Campus": "campus",
    }
    re_course_line = re.compile(r"^[A-Z]{2,4}\s+\d{4}\s+S\s+UG\s+")

    for line in lines:
        tr = line.strip()
        if "CURRENT PROGRAMME" in tr:
            in_block = True
            continue
        if any(marker in tr for marker in stop_markers) or re_course_line.match(tr):
            if in_block:
                break
            continue
        if in_block:
            parts = tr.split(":", 1)
            if len(parts) == 2 and parts[1].strip():
                key, val = parts[0].strip(), parts[1].strip()
                if key in field_map:
                    prog[field_map[key]] = val
    return prog


def _parse_current_year(courses: list[dict]) -> int:
    """Derive current year from the highest course-code level number."""
    year = 0
    for c in courses:
        try:
            level = int(c["code"].split()[1]) // 1000
            year = max(year, level)
        except (IndexError, ValueError):
            continue
    return year


def _parse_current_term(text: str) -> str:
    """Find the last semester/term reference in the document."""
    semesters = re.findall(
        r"(20\d{2}/20\d{2}\s+(?:Semester\s+I{1,3}|Summer))", text
    )
    return semesters[-1] if semesters else ""


def parse_transcript(text: str) -> dict:
    lines = text.split("\n")

    # ---- Courses ----
    try:
        courses = _parse_courses(lines)
    except Exception:
        logger.warning("Failed to parse courses", exc_info=True)
        courses = []

    # ---- GPAs ----
    try:
        overall_gpa, degree_gpa = _parse_gpas(text)
    except Exception:
        logger.warning("Failed to parse GPAs", exc_info=True)
        overall_gpa, degree_gpa = None, None

    # ---- Programme ----
    try:
        prog = _parse_programme(lines)
    except Exception:
        logger.warning("Failed to parse programme block", exc_info=True)
        prog = {}

    # ---- Current year ----
    try:
        current_year = _parse_current_year(courses)
    except Exception:
        logger.warning("Failed to parse current year", exc_info=True)
        current_year = 0

    # ---- Current term ----
    try:
        current_term = _parse_current_term(text)
    except Exception:
        logger.warning("Failed to parse current term", exc_info=True)
        current_term = ""

    # ---- Student info ----
    try:
        student_info = _parse_student_info(text)
    except Exception:
        logger.warning("Failed to parse student info", exc_info=True)
        student_info = {"first_name": "", "middle_name": "", "last_name": "", "student_id": ""}

    return {
        "first_name": student_info["first_name"],
        "middle_name": student_info["middle_name"],
        "last_name": student_info["last_name"],
        "student_id": student_info["student_id"],
        "current_programme": prog.get("degree", ""),
        "major": prog.get("major", ""),
        "current_term": current_term,
        "current_year": current_year,
        "degree_gpa": degree_gpa,
        "overall_gpa": overall_gpa,
        "courses": courses,
    }
