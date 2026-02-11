import io
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)

SAMPLE_RESULT = {
    "first_name": "John",
    "middle_name": "",
    "last_name": "Doe",
    "student_id": "123456789",
    "current_programme": "BSc",
    "major": "Computer Science",
    "current_term": "2023/2024 Semester II",
    "current_year": 2,
    "degree_gpa": 3.44,
    "overall_gpa": 3.44,
    "courses": [
        {"code": "COMP 1601", "title": "Computer Programming I", "grade": "A+"},
    ],
}


class TestHealthCheck:
    def test_healthy(self):
        resp = client.get("/api/v1/healthy")
        assert resp.status_code == 200
        assert resp.json() == {"status": "healthy"}


class TestExtractTranscript:
    def test_valid_pdf_returns_result(self):
        with patch("app.main.extract_clean_text_from_bytes", return_value="some text"), \
             patch("app.main.parse_transcript", return_value=SAMPLE_RESULT):
            resp = client.post(
                "/api/v1/transcripts/extract",
                files={"file": ("transcript.pdf", b"%PDF-fake", "application/pdf")},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["current_programme"] == "BSc"
        assert body["major"] == "Computer Science"
        assert len(body["courses"]) == 1
        assert body["courses"][0]["code"] == "COMP 1601"

    def test_non_pdf_rejected(self):
        resp = client.post(
            "/api/v1/transcripts/extract",
            files={"file": ("notes.txt", b"hello world", "text/plain")},
        )
        assert resp.status_code == 422
        assert "PDF" in resp.json()["detail"]

    def test_empty_file_rejected(self):
        resp = client.post(
            "/api/v1/transcripts/extract",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        assert resp.status_code == 422
        assert "empty" in resp.json()["detail"]

    def test_corrupt_pdf_returns_422(self):
        with patch("app.main.extract_clean_text_from_bytes", return_value=""):
            resp = client.post(
                "/api/v1/transcripts/extract",
                files={"file": ("bad.pdf", b"%PDF-corrupt", "application/pdf")},
            )
        assert resp.status_code == 422
        assert "corrupt" in resp.json()["detail"] or "extract" in resp.json()["detail"]

    def test_missing_file_field_returns_422(self):
        resp = client.post("/api/v1/transcripts/extract")
        assert resp.status_code == 422
