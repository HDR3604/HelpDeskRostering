import logging
import os

from fastapi import FastAPI, HTTPException, APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse

from app.extractor import extract_clean_text_from_bytes, parse_transcript
from app.models import ExtractTranscriptResponse

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Transcript Extraction", version="1.0.0")


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


@prefix_router.post(
    "/transcripts/extract",
    status_code=200,
    response_model=ExtractTranscriptResponse,
)
async def extract_transcript(file: UploadFile):
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(
            status_code=422,
            detail="file must be a PDF (application/pdf)",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=422, detail="uploaded file is empty")

    text = extract_clean_text_from_bytes(pdf_bytes)
    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="could not extract text from PDF — file may be corrupt or not a transcript",
        )

    result = parse_transcript(text)

    logger.info(
        "transcript extracted: %d courses, programme=%s",
        len(result["courses"]),
        result["current_programme"] or "(unknown)",
    )

    return result


app.include_router(prefix_router)
