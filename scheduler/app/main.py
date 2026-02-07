import logging
import os

from fastapi import FastAPI, HTTPException, APIRouter, Request
from fastapi.responses import JSONResponse

from app.linear_scheduler import solve_helpdesk_schedule
from app.models import GenerateScheduleRequest, GenerateScheduleResponse

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="HelpDesk Scheduler", version="1.0.0")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "internal server error"},
    )


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
