import pytest
from unittest.mock import patch, MagicMock

from app.extractor import parse_transcript, extract_clean_text, extract_clean_text_from_bytes


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

TRANSCRIPT_EXTRA_GRADES = """\
CURRENT PROGRAMME
Degree: BSc
Major: Chemistry

Term 2024/2025 Semester I

CHEM 1001 S UG General Chemistry W 3.00 0.00 0.00
CHEM 1002 S UG Organic Chemistry I 3.00 0.00 0.00
CHEM 2001 S UG Analytical Chemistry DEF 3.00 0.00 0.00
CHEM 2002 S UG Physical Chemistry MC 3.00 0.00 0.00

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
"""

TRANSCRIPT_SUMMER_TERM = """\
CURRENT PROGRAMME
Degree: BSc
Major: Biology

Term 2024/2025 Semester I

BIOL 1001 S UG Cell Biology A 3.00 12.00 4.00

Term 2024/2025 Summer

BIOL 1002 S UG Genetics B 3.00 9.00 3.00

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
"""

TRANSCRIPT_SEMESTER_III = """\
Term 2024/2025 Semester III

PHYS 2001 S UG Quantum Mechanics A 3.00 12.00 4.00

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
"""

TRANSCRIPT_NO_DEGREE_GPA_MARKER = """\
CURRENT PROGRAMME
Degree: MSc
Major: Mathematics

Term 2024/2025 Semester II

MATH 3001 S UG Abstract Algebra A 3.00 12.00 4.00

TRANSCRIPT TOTALS
Attempt Hours Passed Hours Earned Hours GPA Hours Quality Points GPA
Overall: 3.00 3.00 3.00 3.00 12.00 4.00
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


class TestExtraGrades:
    def test_withdrawn_grade(self):
        result = parse_transcript(TRANSCRIPT_EXTRA_GRADES)
        grades = {c["code"]: c["grade"] for c in result["courses"]}
        assert grades["CHEM 1001"] == "W"

    def test_in_progress_course_no_grade(self):
        result = parse_transcript(TRANSCRIPT_EXTRA_GRADES)
        grades = {c["code"]: c["grade"] for c in result["courses"]}
        assert grades["CHEM 1002"] is None

    def test_deferred_grade(self):
        result = parse_transcript(TRANSCRIPT_EXTRA_GRADES)
        grades = {c["code"]: c["grade"] for c in result["courses"]}
        assert grades["CHEM 2001"] == "DEF"

    def test_medical_comp_grade(self):
        result = parse_transcript(TRANSCRIPT_EXTRA_GRADES)
        grades = {c["code"]: c["grade"] for c in result["courses"]}
        assert grades["CHEM 2002"] == "MC"


class TestTermVariations:
    def test_summer_term(self):
        result = parse_transcript(TRANSCRIPT_SUMMER_TERM)
        assert result["current_term"] == "2024/2025 Summer"

    def test_semester_iii(self):
        result = parse_transcript(TRANSCRIPT_SEMESTER_III)
        assert result["current_term"] == "2024/2025 Semester III"


class TestProgrammeBlockFallback:
    def test_stops_at_transcript_totals_when_no_degree_gpa_marker(self):
        result = parse_transcript(TRANSCRIPT_NO_DEGREE_GPA_MARKER)
        assert result["current_programme"] == "MSc"
        assert result["major"] == "Mathematics"
        assert result["overall_gpa"] == 4.00


class TestSafeYearCalculation:
    def test_malformed_course_code_does_not_crash(self):
        text = """\
BADCODE S UG Some Course A 3.00 12.00 4.00
COMP 2001 S UG Good Course B 3.00 9.00 3.00

DEGREE GPA TOTALS
TRANSCRIPT TOTALS
"""
        result = parse_transcript(text)
        assert result["current_year"] == 2

    def test_no_courses_yields_year_zero(self):
        result = parse_transcript("no courses here")
        assert result["current_year"] == 0


# ── extract_clean_text tests ─────────────────────────────────────────────────


def _make_mock_pdf(pages_text):
    """Build a mock pdfplumber PDF with the given page texts."""
    mock_pdf = MagicMock()
    mock_pages = []
    for text in pages_text:
        mock_page = MagicMock()
        mock_filtered = MagicMock()
        mock_filtered.extract_text.return_value = text
        mock_page.filter.return_value = mock_filtered
        mock_pages.append(mock_page)
    mock_pdf.pages = mock_pages
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    return mock_pdf


class TestExtractCleanText:
    def test_filters_watermark_and_joins_pages(self):
        mock_pdf = _make_mock_pdf(["Page content", "Page content"])

        with patch("app.extractor.pdfplumber") as mock_pdfplumber, \
             patch("app.extractor.os.path.isfile", return_value=True):
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text("dummy.pdf")

        assert result == "Page content\nPage content"

    def test_handles_empty_page(self):
        mock_pdf = _make_mock_pdf([None])

        with patch("app.extractor.pdfplumber") as mock_pdfplumber, \
             patch("app.extractor.os.path.isfile", return_value=True):
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text("dummy.pdf")

        assert result == ""

    def test_missing_file_returns_empty_string(self):
        with patch("app.extractor.os.path.isfile", return_value=False):
            result = extract_clean_text("nonexistent.pdf")
        assert result == ""

    def test_corrupt_pdf_returns_empty_string(self):
        with patch("app.extractor.os.path.isfile", return_value=True), \
             patch("app.extractor.pdfplumber") as mock_pdfplumber:
            mock_pdfplumber.open.side_effect = Exception("corrupt PDF")
            result = extract_clean_text("corrupt.pdf")
        assert result == ""

    def test_page_extraction_failure_skips_page(self):
        good_page = MagicMock()
        good_filtered = MagicMock()
        good_filtered.extract_text.return_value = "Good page"
        good_page.filter.return_value = good_filtered

        bad_page = MagicMock()
        bad_page.filter.side_effect = Exception("page error")
        bad_page.page_number = 2

        mock_pdf = MagicMock()
        mock_pdf.pages = [good_page, bad_page]
        mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
        mock_pdf.__exit__ = MagicMock(return_value=False)

        with patch("app.extractor.pdfplumber") as mock_pdfplumber, \
             patch("app.extractor.os.path.isfile", return_value=True):
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text("partial.pdf")

        assert result == "Good page\n"


# ── extract_clean_text_from_bytes tests ──────────────────────────────────────


class TestExtractCleanTextFromBytes:
    def test_extracts_text_from_bytes(self):
        mock_pdf = _make_mock_pdf(["Page 1", "Page 2"])

        with patch("app.extractor.pdfplumber") as mock_pdfplumber:
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text_from_bytes(b"%PDF-fake-content")

        assert result == "Page 1\nPage 2"

    def test_empty_bytes_returns_empty_string(self):
        result = extract_clean_text_from_bytes(b"")
        assert result == ""

    def test_none_bytes_returns_empty_string(self):
        result = extract_clean_text_from_bytes(None)
        assert result == ""

    def test_corrupt_bytes_returns_empty_string(self):
        with patch("app.extractor.pdfplumber") as mock_pdfplumber:
            mock_pdfplumber.open.side_effect = Exception("not a valid PDF")
            result = extract_clean_text_from_bytes(b"not-a-pdf")
        assert result == ""

    def test_page_failure_skips_page(self):
        good_page = MagicMock()
        good_filtered = MagicMock()
        good_filtered.extract_text.return_value = "Good page"
        good_page.filter.return_value = good_filtered

        bad_page = MagicMock()
        bad_page.filter.side_effect = Exception("page error")
        bad_page.page_number = 2

        mock_pdf = MagicMock()
        mock_pdf.pages = [good_page, bad_page]
        mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
        mock_pdf.__exit__ = MagicMock(return_value=False)

        with patch("app.extractor.pdfplumber") as mock_pdfplumber:
            mock_pdfplumber.open.return_value = mock_pdf
            result = extract_clean_text_from_bytes(b"%PDF-fake")

        assert result == "Good page\n"
