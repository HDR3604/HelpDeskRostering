# Transcript Test Fixtures

Place PDF files here for the transcript extraction benchmarks:

- `single_page.pdf` — A 1-page UWI unofficial transcript 
- `multi_page.pdf` — A 3-5 page transcript with many courses
- `large.pdf` — A 10+ page transcript (stress test)

## Generating Fixtures

Use the Python script in `apps/transcripts/tests/` sample text or create
synthetic PDFs with `fpdf2`:

```bash
pip install fpdf2
python generate_fixtures.py
```

The `generate_fixtures.py` script below creates sample transcripts from the
text constants in the existing Python tests:

```python
from fpdf import FPDF

SAMPLE_TEXT = """
Record of: John Michael Doe
Student Number: 123456789

CURRENT PROGRAMME
Degree       : BSc
Programme    : Computer Science
Major        : Computer Science
Faculty      : Science and Technology

COMP 1601    S UG  Computer Programming I          A+   3.00  ...
COMP 1602    S UG  Computer Programming II         A    3.00  ...
COMP 2603    S UG  Object Oriented Programming I   B+   3.00  ...
INFO 2602    S UG  Web Programming                 A-   3.00  ...

TRANSCRIPT TOTALS
Overall:                                            3.44
Degree:                                             3.44

2023/2024 Semester II
"""

def make_pdf(text: str, path: str, pages: int = 1):
    pdf = FPDF()
    for _ in range(pages):
        pdf.add_page()
        pdf.set_font("Helvetica", size=10)
        for line in text.split("\\n"):
            pdf.cell(0, 5, line, ln=True)
    pdf.output(path)

make_pdf(SAMPLE_TEXT, "single_page.pdf", pages=1)
make_pdf(SAMPLE_TEXT * 3, "multi_page.pdf", pages=3)
make_pdf(SAMPLE_TEXT * 10, "large.pdf", pages=10)
```
