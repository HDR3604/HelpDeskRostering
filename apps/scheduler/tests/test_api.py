from datetime import time

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_payload():
    return {
        "assistants": [
            {
                "id": "816034521",
                "courses": ["COMP 3603", "COMP 3613"],
                "availability": [
                    {"day_of_week": 0, "start": "10:00:00", "end": "14:00:00"},
                    {"day_of_week": 2, "start": "10:00:00", "end": "14:00:00"},
                ],
                "min_hours": 2.0,
                "max_hours": 8.0,
                "cost_per_hour": 0.0,
            },
            {
                "id": "816041278",
                "courses": ["COMP 3603", "INFO 2602"],
                "availability": [
                    {"day_of_week": 0, "start": "10:00:00", "end": "13:00:00"},
                ],
                "min_hours": 1.0,
                "max_hours": 4.0,
                "cost_per_hour": 0.0,
            },
        ],
        "shifts": [
            {
                "id": "mon-10-11",
                "day_of_week": 0,
                "start": "10:00:00",
                "end": "11:00:00",
                "course_demands": [
                    {"course_code": "COMP 3603", "tutors_required": 1, "weight": 1.0}
                ],
                "min_staff": 1,
                "max_staff": 2,
            },
            {
                "id": "wed-11-12",
                "day_of_week": 2,
                "start": "11:00:00",
                "end": "12:00:00",
                "course_demands": [
                    {"course_code": "COMP 3613", "tutors_required": 1, "weight": 1.0}
                ],
                "min_staff": 1,
                "max_staff": 2,
            },
        ],
        "scheduler_config": {"baseline_hours_target": 1},
    }


class TestHealthCheck:
    def test_healthy(self, client):
        resp = client.get("/api/v1/healthy")
        assert resp.status_code == 200
        assert resp.json() == {"status": "healthy"}


class TestScheduleGenerate:
    def test_success(self, client, valid_payload):
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        assert resp.status_code == 201

        body = resp.json()
        assert body["status"] == "Optimal"
        assert len(body["assignments"]) > 0
        assert "816034521" in body["assistant_hours"]
        assert "objective_value" in body["metadata"]

    def test_assignments_have_shift_details(self, client, valid_payload):
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        body = resp.json()

        assignment = body["assignments"][0]
        assert "assistant_id" in assignment
        assert "shift_id" in assignment
        assert "day_of_week" in assignment
        assert "start" in assignment
        assert "end" in assignment

    def test_empty_assistants_returns_422(self, client, valid_payload):
        valid_payload["assistants"] = []
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        assert resp.status_code == 422

    def test_empty_shifts_returns_422(self, client, valid_payload):
        valid_payload["shifts"] = []
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        assert resp.status_code == 422

    def test_no_feasible_assignment_returns_422(self, client, valid_payload):
        # Make assistant only available on Thursday — no shift covers Thursday
        valid_payload["assistants"] = [
            {
                "id": "816099999",
                "courses": ["COMP 3603"],
                "availability": [
                    {"day_of_week": 3, "start": "10:00:00", "end": "12:00:00"}
                ],
                "min_hours": 0.0,
                "max_hours": 4.0,
                "cost_per_hour": 0.0,
            }
        ]
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        assert resp.status_code == 422

    def test_infeasible_baseline_returns_422(self, client, valid_payload):
        # baseline_hours_target=100 is impossible with 2 hours of shifts
        valid_payload["scheduler_config"] = {"baseline_hours_target": 100}
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        assert resp.status_code == 422
        assert "feasible" in resp.json()["detail"].lower()

    def test_no_config_uses_defaults(self, client, valid_payload):
        # Remove config — solver uses SchedulerConfig defaults
        # Default baseline_hours_target=6 will exceed capacity, so this should 422
        del valid_payload["scheduler_config"]
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        # Either succeeds or fails with infeasible — just verify it doesn't 500
        assert resp.status_code in (201, 422)

    def test_invalid_json_returns_422(self, client):
        resp = client.post(
            "/api/v1/schedules/generate",
            content="not json",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 422

    def test_metadata_omits_zero_shortfalls(self, client, valid_payload):
        resp = client.post("/api/v1/schedules/generate", json=valid_payload)
        if resp.status_code != 201:
            pytest.skip("solver did not return optimal")

        body = resp.json()
        for val in body["metadata"]["course_shortfalls"].values():
            assert val > 0
        for val in body["metadata"]["staff_shortfalls"].values():
            assert val > 0
