package student_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type StudentHandlerTestSuite struct {
	suite.Suite
	mockSvc *mocks.MockBankingDetailsService
	router  *chi.Mux
}

func TestStudentHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(StudentHandlerTestSuite))
}

func (s *StudentHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockBankingDetailsService{}
	hdl := handler.NewStudentHandler(zap.NewNop(), s.mockSvc)
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)
	})
}

func (s *StudentHandlerTestSuite) doRequest(method, path string, body string, authCtx *database.AuthContext) *httptest.ResponseRecorder {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	if authCtx != nil {
		req = req.WithContext(database.WithAuthContext(req.Context(), *authCtx))
	}
	rr := httptest.NewRecorder()
	s.router.ServeHTTP(rr, req)
	return rr
}

func studentAuthCtx() *database.AuthContext {
	sid := "123"
	return &database.AuthContext{
		UserID:    "user-123",
		StudentID: &sid,
		Role:      "student",
	}
}

func adminAuthCtx() *database.AuthContext {
	return &database.AuthContext{
		UserID:    "admin-user",
		StudentID: nil,
		Role:      "admin",
	}
}

func sampleBankingDetails() *aggregate.BankingDetails {
	now := time.Now().UTC()
	return &aggregate.BankingDetails{
		StudentID:     123,
		BankName:      "Bank A",
		BranchName:    "Branch 1",
		AccountType:   aggregate.BankAccountType_Savings,
		AccountNumber: "12345678",
		CreatedAt:     now,
		UpdatedAt:     &now,
	}
}

// --- GetMyBankingDetails ---

func (s *StudentHandlerTestSuite) TestGetMyBankingDetails_Success() {
	s.mockSvc.GetMyBankingDetailsFn = func(ctx context.Context) (*aggregate.BankingDetails, error) {
		return sampleBankingDetails(), nil
	}

	rr := s.doRequest("GET", "/api/v1/students/me/banking-details", "", studentAuthCtx())
	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]interface{}
	s.NoError(json.NewDecoder(rr.Body).Decode(&resp))
	s.Equal("Bank A", resp["bank_name"])
	s.Equal("****5678", resp["account_number"])
}

func (s *StudentHandlerTestSuite) TestGetMyBankingDetails_NotFound() {
	s.mockSvc.GetMyBankingDetailsFn = func(ctx context.Context) (*aggregate.BankingDetails, error) {
		return nil, studentErrors.ErrBankingDetailsNotFound
	}

	rr := s.doRequest("GET", "/api/v1/students/me/banking-details", "", studentAuthCtx())
	s.Equal(http.StatusNotFound, rr.Code)
}

func (s *StudentHandlerTestSuite) TestGetMyBankingDetails_MissingAuth() {
	s.mockSvc.GetMyBankingDetailsFn = func(ctx context.Context) (*aggregate.BankingDetails, error) {
		return nil, studentErrors.ErrMissingAuthContext
	}

	rr := s.doRequest("GET", "/api/v1/students/me/banking-details", "", studentAuthCtx())
	s.Equal(http.StatusUnauthorized, rr.Code)
}

// --- UpsertMyBankingDetails ---

func (s *StudentHandlerTestSuite) TestUpsertMyBankingDetails_Success() {
	s.mockSvc.UpsertMyBankingDetailsFn = func(ctx context.Context, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
		s.Equal("Bank A", input.BankName)
		return sampleBankingDetails(), nil
	}

	body := `{"bank_name":"Bank A","branch_name":"Branch 1","account_type":"savings","account_number":"12345678"}`
	rr := s.doRequest("PUT", "/api/v1/students/me/banking-details", body, studentAuthCtx())
	s.Equal(http.StatusOK, rr.Code)
}

func (s *StudentHandlerTestSuite) TestUpsertMyBankingDetails_InvalidBody() {
	rr := s.doRequest("PUT", "/api/v1/students/me/banking-details", "not json", studentAuthCtx())
	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *StudentHandlerTestSuite) TestUpsertMyBankingDetails_ValidationError() {
	s.mockSvc.UpsertMyBankingDetailsFn = func(ctx context.Context, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
		return nil, studentErrors.ErrInvalidBankName
	}

	body := `{"bank_name":"","branch_name":"Branch 1","account_type":"savings","account_number":"12345678"}`
	rr := s.doRequest("PUT", "/api/v1/students/me/banking-details", body, studentAuthCtx())
	s.Equal(http.StatusBadRequest, rr.Code)
}

// --- GetBankingDetails (admin) ---

func (s *StudentHandlerTestSuite) TestGetBankingDetails_Success() {
	s.mockSvc.GetBankingDetailsByStudentIDFn = func(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error) {
		s.Equal(int32(456), studentID)
		bd := sampleBankingDetails()
		bd.StudentID = 456
		return bd, nil
	}

	rr := s.doRequest("GET", "/api/v1/students/456/banking-details", "", adminAuthCtx())
	s.Equal(http.StatusOK, rr.Code)
}

func (s *StudentHandlerTestSuite) TestGetBankingDetails_InvalidStudentID() {
	rr := s.doRequest("GET", "/api/v1/students/abc/banking-details", "", adminAuthCtx())
	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *StudentHandlerTestSuite) TestGetBankingDetails_NotAuthorized() {
	s.mockSvc.GetBankingDetailsByStudentIDFn = func(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error) {
		return nil, studentErrors.ErrNotAuthorized
	}

	rr := s.doRequest("GET", "/api/v1/students/456/banking-details", "", studentAuthCtx())
	s.Equal(http.StatusForbidden, rr.Code)
}

func (s *StudentHandlerTestSuite) TestGetBankingDetails_NotFound() {
	s.mockSvc.GetBankingDetailsByStudentIDFn = func(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error) {
		return nil, studentErrors.ErrBankingDetailsNotFound
	}

	rr := s.doRequest("GET", "/api/v1/students/456/banking-details", "", adminAuthCtx())
	s.Equal(http.StatusNotFound, rr.Code)
}

// --- UpsertBankingDetails (admin) ---

func (s *StudentHandlerTestSuite) TestUpsertBankingDetails_Success() {
	s.mockSvc.UpsertBankingDetailsByStudentIDFn = func(ctx context.Context, studentID int32, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
		s.Equal(int32(456), studentID)
		bd := sampleBankingDetails()
		bd.StudentID = 456
		return bd, nil
	}

	body := `{"bank_name":"Bank A","branch_name":"Branch 1","account_type":"savings","account_number":"12345678"}`
	rr := s.doRequest("PUT", "/api/v1/students/456/banking-details", body, adminAuthCtx())
	s.Equal(http.StatusOK, rr.Code)
}

func (s *StudentHandlerTestSuite) TestUpsertBankingDetails_InvalidStudentID() {
	body := `{"bank_name":"Bank A","branch_name":"Branch 1","account_type":"savings","account_number":"12345678"}`
	rr := s.doRequest("PUT", "/api/v1/students/abc/banking-details", body, adminAuthCtx())
	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *StudentHandlerTestSuite) TestUpsertBankingDetails_InvalidBody() {
	rr := s.doRequest("PUT", "/api/v1/students/456/banking-details", "not json", adminAuthCtx())
	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *StudentHandlerTestSuite) TestUpsertBankingDetails_NotAuthorized() {
	s.mockSvc.UpsertBankingDetailsByStudentIDFn = func(ctx context.Context, studentID int32, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
		return nil, studentErrors.ErrNotAuthorized
	}

	body := `{"bank_name":"Bank A","branch_name":"Branch 1","account_type":"savings","account_number":"12345678"}`
	rr := s.doRequest("PUT", "/api/v1/students/456/banking-details", body, studentAuthCtx())
	s.Equal(http.StatusForbidden, rr.Code)
}
