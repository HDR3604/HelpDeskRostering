from datetime import time

import pytest

from app.linear_scheduler import (
    Assistant,
    AvailabilityWindow,
    CourseDemand,
    SchedulerConfig,
    Shift,
)


@pytest.fixture
def monday_morning_shift() -> Shift:
    return Shift(
        id="mon-10-11",
        day_of_week=0,
        start=time(10, 0),
        end=time(11, 0),
        course_demands=[CourseDemand("COMP 3603", tutors_required=1)],
        min_staff=1,
        max_staff=2,
    )


@pytest.fixture
def monday_afternoon_shift() -> Shift:
    return Shift(
        id="mon-13-14",
        day_of_week=0,
        start=time(13, 0),
        end=time(14, 0),
        course_demands=[CourseDemand("INFO 2602", tutors_required=1)],
        min_staff=1,
        max_staff=2,
    )


@pytest.fixture
def wednesday_shift() -> Shift:
    return Shift(
        id="wed-11-12",
        day_of_week=2,
        start=time(11, 0),
        end=time(12, 0),
        course_demands=[
            CourseDemand("COMP 3603", tutors_required=1),
            CourseDemand("COMP 3613", tutors_required=1),
        ],
        min_staff=2,
        max_staff=3,
    )


@pytest.fixture
def two_shifts(monday_morning_shift, wednesday_shift) -> list[Shift]:
    return [monday_morning_shift, wednesday_shift]


@pytest.fixture
def assistant_a() -> Assistant:
    """Available Mon 10-14, Wed 10-14. Knows COMP 3603, COMP 3613."""
    return Assistant(
        id="816034521",
        courses=["COMP 3603", "COMP 3613"],
        availability=[
            AvailabilityWindow(day_of_week=0, start=time(10, 0), end=time(14, 0)),
            AvailabilityWindow(day_of_week=2, start=time(10, 0), end=time(14, 0)),
        ],
        min_hours=2.0,
        max_hours=8.0,
    )


@pytest.fixture
def assistant_b() -> Assistant:
    """Available Mon 10-13. Knows COMP 3603, INFO 2602."""
    return Assistant(
        id="816041278",
        courses=["COMP 3603", "INFO 2602"],
        availability=[
            AvailabilityWindow(day_of_week=0, start=time(10, 0), end=time(13, 0)),
        ],
        min_hours=1.0,
        max_hours=4.0,
    )


@pytest.fixture
def two_assistants(assistant_a, assistant_b) -> list[Assistant]:
    return [assistant_a, assistant_b]


@pytest.fixture
def low_baseline_config() -> SchedulerConfig:
    return SchedulerConfig(baseline_hours_target=2)
