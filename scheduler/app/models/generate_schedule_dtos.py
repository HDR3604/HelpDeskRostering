from datetime import time
from typing import Optional, Sequence

from pydantic import BaseModel, field_validator, model_validator

from app.linear_scheduler import (
    Assistant,
    ScheduleResult,
    SchedulerConfig,
    Shift,
)


class GenerateScheduleRequest(BaseModel):
    assistants: list[Assistant]
    shifts: list[Shift]
    scheduler_config: Optional[SchedulerConfig] = None

    @field_validator("assistants")
    @classmethod
    def at_least_one_assistant(cls, v: list[Assistant]) -> list[Assistant]:
        if not v:
            raise ValueError("at least one assistant is required")
        return v

    @field_validator("shifts")
    @classmethod
    def at_least_one_shift(cls, v: list[Shift]) -> list[Shift]:
        if not v:
            raise ValueError("at least one shift is required")
        return v

    @model_validator(mode="after")
    def at_least_one_feasible_assignment(self) -> GenerateScheduleRequest:
        for assistant in self.assistants:
            for shift in self.shifts:
                if assistant.is_available(shift):
                    return self
        raise ValueError(
            "no feasible assignments: no assistant's availability covers any shift"
        )


class Assignment(BaseModel):
    assistant_id: str
    shift_id: str
    day_of_week: int
    start: time
    end: time


class GenerateScheduleResponse(BaseModel):
    status: str
    assignments: list[Assignment]
    assistant_hours: dict[str, float]
    metadata: dict

    @classmethod
    def from_result(
        cls,
        result: ScheduleResult,
        shifts: Sequence[Shift],
    ) -> GenerateScheduleResponse:
        shift_lookup = {s.id: s for s in shifts}

        assignments = [
            Assignment(
                assistant_id=aid,
                shift_id=sid,
                day_of_week=shift_lookup[sid].day_of_week,
                start=shift_lookup[sid].start,
                end=shift_lookup[sid].end,
            )
            for aid, sid in result.assignments
        ]

        return cls(
            status=result.status,
            assignments=assignments,
            assistant_hours=result.assistant_hours,
            metadata={
                "objective_value": result.objective_value,
                "solver_status_code": result.solver_status_code,
                "course_shortfalls": {
                    f"{sid}:{code}": val
                    for (sid, code), val in result.course_shortfalls.items()
                    if val > 0
                },
                "staff_shortfalls": {
                    sid: val
                    for sid, val in result.staff_shortfalls.items()
                    if val > 0
                },
            },
        )
