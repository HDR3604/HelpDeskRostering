package infrastructure_test

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	domainErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/service"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type TranscriptsServiceTestSuite struct {
	suite.Suite
	server  *httptest.Server
	mux     *http.ServeMux
	service interfaces.TranscriptsServiceInterface
	logger  *zap.Logger
}

func TestTranscriptsServiceTestSuite(t *testing.T) {
	suite.Run(t, new(TranscriptsServiceTestSuite))
}

func (s *TranscriptsServiceTestSuite) SetupTest() {
	s.mux = http.NewServeMux()
	s.server = httptest.NewServer(s.mux)
	s.logger = zap.NewNop()

	s.Require().NoError(os.Setenv("TRANSCRIPTS_SERVICE_URL", s.server.URL))
	s.service = service.NewTranscriptsService(s.logger)
}

func (s *TranscriptsServiceTestSuite) TearDownTest() {
	s.server.Close()
}

func (s *TranscriptsServiceTestSuite) TestExtractTranscript_Success() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/transcripts/extract", func(w http.ResponseWriter, r *http.Request) {
		s.Equal(http.MethodPost, r.Method)
		s.Contains(r.Header.Get("Content-Type"), "multipart/form-data")

		file, header, err := r.FormFile("file")
		s.Require().NoError(err)
		defer file.Close()
		s.Equal("transcript.pdf", header.Filename)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `{
			"first_name": "John",
			"middle_name": "Michael",
			"last_name": "Doe",
			"student_id": "816000001",
			"current_programme": "BSc",
			"major": "Computer Science",
			"current_term": "2023/2024 Semester II",
			"current_year": 3,
			"degree_gpa": 3.44,
			"overall_gpa": 3.44,
			"courses": [
				{"code": "COMP 1601", "title": "Computer Programming I", "grade": "A+"},
				{"code": "COMP 1602", "title": "Computer Programming II", "grade": null}
			]
		}`)
	})

	result, err := s.service.ExtractTranscript("transcript.pdf", []byte("%PDF-fake-content"))

	s.NoError(err)
	s.Require().NotNil(result)
	s.Equal("John", result.FirstName)
	s.Equal("Michael", result.MiddleName)
	s.Equal("Doe", result.LastName)
	s.Equal("816000001", result.StudentID)
	s.Equal("BSc", result.CurrentProgramme)
	s.Equal("Computer Science", result.Major)
	s.Equal("2023/2024 Semester II", result.CurrentTerm)
	s.Equal(3, result.CurrentYear)
	s.Require().NotNil(result.DegreeGPA)
	s.Equal(3.44, *result.DegreeGPA)
	s.Require().NotNil(result.OverallGPA)
	s.Equal(3.44, *result.OverallGPA)
	s.Len(result.Courses, 2)
	s.Equal("COMP 1601", result.Courses[0].Code)
	s.Require().NotNil(result.Courses[0].Grade)
	s.Equal("A+", *result.Courses[0].Grade)
	s.Nil(result.Courses[1].Grade)
}

func (s *TranscriptsServiceTestSuite) TestExtractTranscript_Returns422() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/transcripts/extract", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = fmt.Fprint(w, `{"detail": "file must be a PDF"}`)
	})

	result, err := s.service.ExtractTranscript("bad.txt", []byte("not a pdf"))

	s.Nil(result)
	s.True(errors.Is(err, domainErrors.ErrTranscriptInvalid))
}

func (s *TranscriptsServiceTestSuite) TestExtractTranscript_Returns500() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/transcripts/extract", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	result, err := s.service.ExtractTranscript("transcript.pdf", []byte("%PDF-fake"))

	s.Nil(result)
	s.True(errors.Is(err, domainErrors.ErrTranscriptsInternal))
}

func (s *TranscriptsServiceTestSuite) TestExtractTranscript_HealthCheckFails() {
	s.server.Close()

	result, err := s.service.ExtractTranscript("transcript.pdf", []byte("%PDF-fake"))

	s.Nil(result)
	s.True(errors.Is(err, domainErrors.ErrTranscriptsUnavailable))
}

func (s *TranscriptsServiceTestSuite) TestExtractTranscript_MalformedResponse() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/transcripts/extract", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `not valid json`)
	})

	result, err := s.service.ExtractTranscript("transcript.pdf", []byte("%PDF-fake"))

	s.Nil(result)
	s.True(errors.Is(err, domainErrors.ErrUnmarshalResponse))
}
