package auth_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/suite"
)

// --- Suite ---

type PermissionMiddlewareTestSuite struct {
	suite.Suite
}

func TestPermissionMiddlewareTestSuite(t *testing.T) {
	suite.Run(t, new(PermissionMiddlewareTestSuite))
}

// --- Helpers ---

func (s *PermissionMiddlewareTestSuite) newRouter(roles []aggregate.Role) *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.Permission(roles))
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	return r
}

func (s *PermissionMiddlewareTestSuite) requestWithAuth(router *chi.Mux, ac *database.AuthContext) *httptest.ResponseRecorder {
	req := httptest.NewRequest("GET", "/test", nil)
	if ac != nil {
		req = req.WithContext(database.WithAuthContext(req.Context(), *ac))
	}
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr
}

func (s *PermissionMiddlewareTestSuite) parseError(rr *httptest.ResponseRecorder) string {
	var body map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	s.Require().NoError(err)
	return body["error"]
}

// --- Tests ---

func (s *PermissionMiddlewareTestSuite) TestPermission_AdminAllowed_AdminRequest() {
	router := s.newRouter([]aggregate.Role{aggregate.Role_Admin})
	rr := s.requestWithAuth(router, &database.AuthContext{
		UserID: "user-123",
		Role:   "admin",
	})

	s.Equal(http.StatusOK, rr.Code)
}

func (s *PermissionMiddlewareTestSuite) TestPermission_StudentAllowed_StudentRequest() {
	studentID := "student-456"
	router := s.newRouter([]aggregate.Role{aggregate.Role_Student})
	rr := s.requestWithAuth(router, &database.AuthContext{
		UserID:    "user-456",
		Role:      "student",
		StudentID: &studentID,
	})

	s.Equal(http.StatusOK, rr.Code)
}

func (s *PermissionMiddlewareTestSuite) TestPermission_BothRolesAllowed_AdminRequest() {
	router := s.newRouter([]aggregate.Role{aggregate.Role_Admin, aggregate.Role_Student})
	rr := s.requestWithAuth(router, &database.AuthContext{
		UserID: "user-789",
		Role:   "admin",
	})

	s.Equal(http.StatusOK, rr.Code)
}

func (s *PermissionMiddlewareTestSuite) TestPermission_BothRolesAllowed_StudentRequest() {
	studentID := "student-101"
	router := s.newRouter([]aggregate.Role{aggregate.Role_Admin, aggregate.Role_Student})
	rr := s.requestWithAuth(router, &database.AuthContext{
		UserID:    "user-101",
		Role:      "student",
		StudentID: &studentID,
	})

	s.Equal(http.StatusOK, rr.Code)
}

func (s *PermissionMiddlewareTestSuite) TestPermission_AdminOnly_StudentRequest_Forbidden() {
	studentID := "student-456"
	router := s.newRouter([]aggregate.Role{aggregate.Role_Admin})
	rr := s.requestWithAuth(router, &database.AuthContext{
		UserID:    "user-456",
		Role:      "student",
		StudentID: &studentID,
	})

	s.Equal(http.StatusForbidden, rr.Code)
	s.Equal("access not allowed", s.parseError(rr))
}

func (s *PermissionMiddlewareTestSuite) TestPermission_StudentOnly_AdminRequest_Forbidden() {
	router := s.newRouter([]aggregate.Role{aggregate.Role_Student})
	rr := s.requestWithAuth(router, &database.AuthContext{
		UserID: "user-123",
		Role:   "admin",
	})

	s.Equal(http.StatusForbidden, rr.Code)
	s.Equal("access not allowed", s.parseError(rr))
}

func (s *PermissionMiddlewareTestSuite) TestPermission_NoAuthContext_Forbidden() {
	router := s.newRouter([]aggregate.Role{aggregate.Role_Admin})
	rr := s.requestWithAuth(router, nil)

	s.Equal(http.StatusForbidden, rr.Code)
	s.Equal("missing auth context from request", s.parseError(rr))
}
