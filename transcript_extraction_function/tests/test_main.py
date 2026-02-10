import pytest
from unittest.mock import patch, MagicMock

from main import parse_transcript, extract_clean_text


# ── Sample transcript text fixtures ──────────────────────────────────────────

SAMPLE_TRANSCRIPT = """\
Student Name: John Doe
Student ID: 123456789
Academic Record

CURRENT PROGRAMME
Degree: BSc
Programme: Computer Science
Faculty: Science and Technology
Major: Computer Science
Department: Computing
Campus: St. Augustine

Term 2023/2024 Semester I

Subject Code Level Title Grade Credits Quality Points GPA Hours
COMP 1601 S UG Computer Programming I A+ 3.00 12.00 4.00
COMP 1602 S UG Computer Programming II A 3.00 12.00 4.00
MATH 1115 S UG Fundamental Mathematics for B+ 3.00 9.00 3.00
General Science
INFO 1601 S UG Introduction to Information B 3.00 9.00 3.00
Technology
Current Term GPA: 3.50

Term 2023/2024 Semester II

COMP 2601 S UG Computer Architecture A- 3.00 11.00 3.67
COMP 2602 S UG Software Engineering I B+ 3.00 9.00 3.00
COMP 2611 S UG Data Structures 3.00 0.00 0.00
Current Term GPA: 3.33

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
Overall: 21.00 18.00 18.00 18.00 62.00 3.44
Degree: 21.00 18.00 18.00 18.00 62.00 3.44
"""

MINIMAL_TRANSCRIPT = """\
Some header text
No structured data here
"""

TRANSCRIPT_NO_GPA = """\
CURRENT PROGRAMME
Degree: BSc
Major: Physics

Term 2024/2025 Semester I

PHYS 1001 S UG Introduction to Physics A 3.00 12.00 4.00

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
"""


# ── parse_transcript tests ───────────────────────────────────────────────────


class TestParseTranscriptFullSample:
    def test_extracts_programme(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        assert result["current_programme"] == "BSc"

    def test_extracts_major(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        assert result["major"] == "Computer Science"

    def test_extracts_current_term(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        assert result["current_term"] == "2023/2024 Semester II"

    def test_extracts_current_year(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        # Highest course level is COMP 2xxx → year 2
        assert result["current_year"] == 2

    def test_extracts_overall_gpa(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        assert result["overall_gpa"] == 3.44

    def test_extracts_degree_gpa(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        assert result["degree_gpa"] == 3.44

    def test_extracts_all_courses(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        codes = [c["code"] for c in result["courses"]]
        assert codes == [
            "COMP 1601",
            "COMP 1602",
            "MATH 1115",
            "INFO 1601",
            "COMP 2601",
            "COMP 2602",
            "COMP 2611",
        ]

    def test_course_grades(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        grades = {c["code"]: c["grade"] for c in result["courses"]}
        assert grades["COMP 1601"] == "A+"
        assert grades["COMP 1602"] == "A"
        assert grades["MATH 1115"] == "B+"
        assert grades["INFO 1601"] == "B"
        assert grades["COMP 2601"] == "A-"
        assert grades["COMP 2602"] == "B+"

    def test_in_progress_course_has_no_grade(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        ds = next(c for c in result["courses"] if c["code"] == "COMP 2611")
        assert ds["grade"] is None

    def test_multiline_course_title(self):
        result = parse_transcript(SAMPLE_TRANSCRIPT)
        math = next(c for c in result["courses"] if c["code"] == "MATH 1115")
        assert "General Science" in math["title"]


class TestParseTranscriptMinimal:
    def test_empty_text_returns_defaults(self):
        result = parse_transcript("")
        assert result["current_programme"] == ""
        assert result["major"] == ""
        assert result["current_term"] == ""
        assert result["current_year"] == 0
        assert result["degree_gpa"] is None
        assert result["overall_gpa"] is None
        assert result["courses"] == []

    def test_no_structured_data(self):
        result = parse_transcript(MINIMAL_TRANSCRIPT)
        assert result["courses"] == []
        assert result["current_programme"] == ""

    def test_no_gpa_totals(self):
        result = parse_transcript(TRANSCRIPT_NO_GPA)
        assert result["degree_gpa"] is None
        assert result["overall_gpa"] is None
        assert result["current_programme"] == "BSc"
        assert result["major"] == "Physics"
        assert result["current_term"] == "2024/2025 Semester I"
        assert len(result["courses"]) == 1
        assert result["courses"][0]["code"] == "PHYS 1001"


# ── extract_clean_text tests ─────────────────────────────────────────────────


class TestExtractCleanText:
    def test_filters_watermark_and_joins_pages(self):
        mock_page = MagicMock()
        mock_filtered = MagicMock()
        mock_filtered.extract_text.return_value = "Page content"
        mock_page.filter.return_value = mock_filtered

        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page, mock_page]

        with patch("main.pdfplumber") as mock_pdfplumber:
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text("dummy.pdf")

        assert result == "Page content\nPage content"
        mock_pdf.close.assert_called_once()

    def test_handles_empty_page(self):
        mock_page = MagicMock()
        mock_filtered = MagicMock()
        mock_filtered.extract_text.return_value = None
        mock_page.filter.return_value = mock_filtered

        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]

        with patch("main.pdfplumber") as mock_pdfplumber:
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text("dummy.pdf")

        assert result == ""
