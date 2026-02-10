from pydantic import BaseModel


class CourseResponse(BaseModel):
    code: str
    title: str
    grade: str | None


class ExtractTranscriptResponse(BaseModel):
    current_programme: str
    major: str
    current_term: str
    current_year: int
    degree_gpa: float | None
    overall_gpa: float | None
    courses: list[CourseResponse]
