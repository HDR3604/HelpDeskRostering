from datetime import time

import pytest
from pydantic import ValidationError

from app.linear_scheduler import (
    Assistant,
    AvailabilityWindow,
    CourseDemand,
    ScheduleResult,
    SchedulerConfig,
    Shift,
)
from app.models.generate_schedule_dtos import (
    GenerateScheduleRequest,
    GenerateScheduleResponse,
)


class TestGenerateScheduleRequest:
    def test_valid_request(self, two_assistants, two_shifts, low_baseline_config):
        req = GenerateScheduleRequest(
            assistants=two_assistants,
            shifts=two_shifts,
            scheduler_config=low_baseline_config,
        )
        assert len(req.assistants) == 2
        assert len(req.shifts) == 2
        assert req.scheduler_config.baseline_hours_target == 2

    def test_config_defaults_to_none(self, two_assistants, two_shifts):
        req = GenerateScheduleRequest(
            assistants=two_assistants,
            shifts=two_shifts,
        )
        assert req.scheduler_config is None

    def test_empty_assistants_rejected(self, two_shifts):
        with pytest.raises(ValidationError, match="at least one assistant"):
            GenerateScheduleRequest(assistants=[], shifts=two_shifts)

    def test_empty_shifts_rejected(self, two_assistants):
        with pytest.raises(ValidationError, match="at least one shift"):
            GenerateScheduleRequest(assistants=two_assistants, shifts=[])

    def test_no_feasible_assignment_rejected(self):
        """Assistant available Tuesday, shift is Monday — no overlap."""
        assistant = Assistant(
            id="816099999",
            courses=["COMP 3603"],
            availability=[
                AvailabilityWindow(day_of_week=1, start=time(10, 0), end=time(12, 0)),
            ],
        )
        shift = Shift(
            id="mon-10-11",
            day_of_week=0,
            start=time(10, 0),
            end=time(11, 0),
            course_demands=[CourseDemand("COMP 3603", tutors_required=1)],
        )
        with pytest.raises(ValidationError, match="no feasible assignments"):
            GenerateScheduleRequest(assistants=[assistant], shifts=[shift])

    def test_partial_overlap_is_feasible(self, assistant_a, monday_morning_shift):
        """Only one assistant covers one shift — still valid."""
        req = GenerateScheduleRequest(
            assistants=[assistant_a],
            shifts=[monday_morning_shift],
        )
        assert len(req.assistants) == 1


class TestGenerateScheduleResponse:
    def _make_result(self, shifts):
        """Minimal ScheduleResult with one assignment per shift."""
        return ScheduleResult(
            status="Optimal",
            objective_value=0.0,
            assignments=[("816034521", shifts[0].id), ("816041278", shifts[1].id)],
            assistant_hours={"816034521": 1.0, "816041278": 1.0},
            course_shortfalls={
                (shifts[0].id, "COMP 3603"): 0.0,
                (shifts[1].id, "COMP 3603"): 1.0,
            },
            staff_shortfalls={shifts[0].id: 0.0, shifts[1].id: 0.5},
            solver_status_code=1,
        )

    def test_from_result_maps_assignments(self, two_shifts):
        result = self._make_result(two_shifts)
        resp = GenerateScheduleResponse.from_result(result, two_shifts)

        assert resp.status == "Optimal"
        assert len(resp.assignments) == 2

        first = resp.assignments[0]
        assert first.assistant_id == "816034521"
        assert first.shift_id == "mon-10-11"
        assert first.day_of_week == 0
        assert first.start == time(10, 0)
        assert first.end == time(11, 0)

    def test_from_result_maps_hours(self, two_shifts):
        result = self._make_result(two_shifts)
        resp = GenerateScheduleResponse.from_result(result, two_shifts)

        assert resp.assistant_hours["816034521"] == 1.0
        assert resp.assistant_hours["816041278"] == 1.0

    def test_from_result_filters_zero_shortfalls(self, two_shifts):
        result = self._make_result(two_shifts)
        resp = GenerateScheduleResponse.from_result(result, two_shifts)

        # Only non-zero shortfalls appear
        assert "wed-11-12:COMP 3603" in resp.metadata["course_shortfalls"]
        assert "mon-10-11:COMP 3603" not in resp.metadata["course_shortfalls"]

        assert "wed-11-12" in resp.metadata["staff_shortfalls"]
        assert "mon-10-11" not in resp.metadata["staff_shortfalls"]

    def test_from_result_metadata_has_solver_fields(self, two_shifts):
        result = self._make_result(two_shifts)
        resp = GenerateScheduleResponse.from_result(result, two_shifts)

        assert resp.metadata["objective_value"] == 0.0
        assert resp.metadata["solver_status_code"] == 1

    def test_empty_assignments(self, two_shifts):
        """Feasible but no assignments (e.g., all shortfalls)."""
        result = ScheduleResult(
            status="Optimal",
            objective_value=100.0,
            assignments=[],
            assistant_hours={},
            course_shortfalls={},
            staff_shortfalls={},
            solver_status_code=1,
        )
        resp = GenerateScheduleResponse.from_result(result, two_shifts)

        assert resp.assignments == []
        assert resp.assistant_hours == {}
        assert resp.metadata["course_shortfalls"] == {}
        assert resp.metadata["staff_shortfalls"] == {}
