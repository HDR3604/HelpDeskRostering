package auth_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/suite"
)

// --- Suite ---

type JWTMiddlewareTestSuite struct {
	suite.Suite
	mockAuthSvc *mocks.MockAuthService
}

func TestJWTMiddlewareTestSuite(t *testing.T) {
	suite.Run(t, new(JWTMiddlewareTestSuite))
}

func (s *JWTMiddlewareTestSuite) SetupTest() {
	s.mockAuthSvc = &mocks.MockAuthService{}
}

// --- Helpers ---

func (s *JWTMiddlewareTestSuite) newTestRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.JWTAuth(s.mockAuthSvc))
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		ac, ok := database.AuthContextFromContext(r.Context())
		if !ok {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"user_id":    ac.UserID,
			"role":       ac.Role,
			"student_id": ac.StudentID,
		})
	})
	return r
}

func (s *JWTMiddlewareTestSuite) doRequest(router *chi.Mux, authHeader string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("GET", "/test", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr
}

// --- Tests ---

func (s *JWTMiddlewareTestSuite) TestJWT_ValidToken_Admin() {
	s.mockAuthSvc.ValidateAccessTokenFn = func(tokenString string) (*service.Claims, error) {
		return &service.Claims{
			RegisteredClaims: jwt.RegisteredClaims{Subject: "user-123"},
			Role:             "admin",
		}, nil
	}

	router := s.newTestRouter()
	rr := s.doRequest(router, "Bearer valid-token")

	s.Equal(http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("user-123", body["user_id"])
	s.Equal("admin", body["role"])
	s.Nil(body["student_id"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_ValidToken_StudentWithID() {
	studentID := "12345"
	s.mockAuthSvc.ValidateAccessTokenFn = func(tokenString string) (*service.Claims, error) {
		return &service.Claims{
			RegisteredClaims: jwt.RegisteredClaims{Subject: "user-456"},
			Role:             "student",
			StudentID:        &studentID,
		}, nil
	}

	router := s.newTestRouter()
	rr := s.doRequest(router, "Bearer valid-token")

	s.Equal(http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("user-456", body["user_id"])
	s.Equal("student", body["role"])
	s.Equal("12345", body["student_id"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_MissingAuthHeader() {
	router := s.newTestRouter()
	rr := s.doRequest(router, "")

	s.Equal(http.StatusUnauthorized, rr.Code)

	var body map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("missing authorization header", body["error"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_EmptyAuthHeader() {
	router := s.newTestRouter()

	// Set an explicit empty Authorization header.
	// r.Header.Get("Authorization") returns "" for an empty value,
	// so this behaves the same as a missing header.
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "")
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	s.Equal(http.StatusUnauthorized, rr.Code)

	var body map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("missing authorization header", body["error"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_InvalidFormat_NoBearerPrefix() {
	router := s.newTestRouter()
	rr := s.doRequest(router, "Token abc123")

	s.Equal(http.StatusUnauthorized, rr.Code)

	var body map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("invalid authorization header format", body["error"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_InvalidFormat_BearerOnly() {
	// "Bearer" with no space + token: SplitN returns ["Bearer"], len == 1
	router := s.newTestRouter()
	rr := s.doRequest(router, "Bearer")

	s.Equal(http.StatusUnauthorized, rr.Code)

	var body map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("invalid authorization header format", body["error"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_InvalidToken() {
	s.mockAuthSvc.ValidateAccessTokenFn = func(tokenString string) (*service.Claims, error) {
		return nil, authErrors.ErrInvalidAccessToken
	}

	router := s.newTestRouter()
	rr := s.doRequest(router, "Bearer invalid-token")

	s.Equal(http.StatusUnauthorized, rr.Code)

	var body map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("invalid or expired token", body["error"])
}

func (s *JWTMiddlewareTestSuite) TestJWT_BearerCaseInsensitive() {
	s.mockAuthSvc.ValidateAccessTokenFn = func(tokenString string) (*service.Claims, error) {
		return &service.Claims{
			RegisteredClaims: jwt.RegisteredClaims{Subject: "user-789"},
			Role:             "admin",
		}, nil
	}

	router := s.newTestRouter()
	// Lowercase "bearer" should be accepted because middleware uses strings.EqualFold
	rr := s.doRequest(router, "bearer valid-token")

	s.Equal(http.StatusOK, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	s.Equal("user-789", body["user_id"])
	s.Equal("admin", body["role"])
}
