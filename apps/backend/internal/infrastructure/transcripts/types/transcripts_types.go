package types

type CourseResult struct {
	Code  string  `json:"code"`
	Title string  `json:"title"`
	Grade *string `json:"grade"`
}
