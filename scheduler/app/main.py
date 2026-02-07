import logging

from fastapi import FastAPI, HTTPException, APIRouter

from app.linear_scheduler import solve_helpdesk_schedule
from app.models import GenerateScheduleRequest, GenerateScheduleResponse

logger = logging.getLogger(__name__)

app = FastAPI()

prefix_router = APIRouter(prefix="/api/v1")

@prefix_router.get("/healthy")
async def health_check():
    return {"status": "healthy"}


@prefix_router.post("/schedules/generate", status_code=201, response_model=GenerateScheduleResponse)
async def schedule_generate(req: GenerateScheduleRequest):
    logger.info(
        "schedule generation requested: %d assistants, %d shifts",
        len(req.assistants),
        len(req.shifts),
    )

    try:
        result = solve_helpdesk_schedule(
            assistants=req.assistants,
            shifts=req.shifts,
            config=req.scheduler_config,
        )
    except ValueError as exc:
        logger.warning("solver input validation failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))

    if result.status not in ("Optimal", "Feasible"):
        logger.warning(
            "solver returned non-optimal status: %s (code %d)",
            result.status,
            result.solver_status_code,
        )
        raise HTTPException(
            status_code=422,
            detail=f"solver returned non-optimal status: {result.status}",
        )

    logger.info(
        "schedule generated: status=%s, objective=%.2f, %d assignments",
        result.status,
        result.objective_value or 0.0,
        len(result.assignments),
    )

    return GenerateScheduleResponse.from_result(result, req.shifts)


app.include_router(prefix_router)
