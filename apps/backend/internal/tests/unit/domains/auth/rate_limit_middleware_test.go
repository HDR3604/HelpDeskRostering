package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/suite"
)

// --- Suite ---

type RateLimitMiddlewareTestSuite struct {
	suite.Suite
}

func TestRateLimitMiddlewareTestSuite(t *testing.T) {
	suite.Run(t, new(RateLimitMiddlewareTestSuite))
}

// --- Helpers ---

func (s *RateLimitMiddlewareTestSuite) newTestRouter(requestsPerMin int) *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.RateLimit(requestsPerMin))
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"ok"}`))
	})
	return r
}

func (s *RateLimitMiddlewareTestSuite) doRequest(router *chi.Mux) *httptest.ResponseRecorder {
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr
}

// --- Tests ---

func (s *RateLimitMiddlewareTestSuite) TestRateLimit_AllowsRequestsWithinLimit() {
	router := s.newTestRouter(5)

	for i := 0; i < 5; i++ {
		rr := s.doRequest(router)
		s.Equal(http.StatusOK, rr.Code, "request %d should be allowed", i+1)
	}
}

func (s *RateLimitMiddlewareTestSuite) TestRateLimit_BlocksRequestsExceedingLimit() {
	router := s.newTestRouter(3)

	// Exhaust the limit
	for i := 0; i < 3; i++ {
		rr := s.doRequest(router)
		s.Equal(http.StatusOK, rr.Code, "request %d should be allowed", i+1)
	}

	// Next request should be rate limited
	rr := s.doRequest(router)
	s.Equal(http.StatusTooManyRequests, rr.Code)
}

func (s *RateLimitMiddlewareTestSuite) TestRateLimit_Returns429StatusCode() {
	router := s.newTestRouter(1)

	// First request succeeds
	rr := s.doRequest(router)
	s.Equal(http.StatusOK, rr.Code)

	// Second request is rate limited
	rr = s.doRequest(router)
	s.Equal(http.StatusTooManyRequests, rr.Code)

	// Verify Retry-After header is set
	s.NotEmpty(rr.Header().Get("Retry-After"), "Retry-After header should be set on 429 responses")
}

func (s *RateLimitMiddlewareTestSuite) TestRateLimit_DifferentIPsHaveSeparateLimits() {
	router := chi.NewRouter()
	router.Use(middleware.RateLimit(1))
	router.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// First IP — allowed
	req1 := httptest.NewRequest("GET", "/test", nil)
	req1.RemoteAddr = "10.0.0.1:1234"
	rr1 := httptest.NewRecorder()
	router.ServeHTTP(rr1, req1)
	s.Equal(http.StatusOK, rr1.Code)

	// First IP — blocked
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "10.0.0.1:1234"
	rr2 := httptest.NewRecorder()
	router.ServeHTTP(rr2, req2)
	s.Equal(http.StatusTooManyRequests, rr2.Code)

	// Second IP — still allowed (different IP, separate bucket)
	req3 := httptest.NewRequest("GET", "/test", nil)
	req3.RemoteAddr = "10.0.0.2:5678"
	rr3 := httptest.NewRecorder()
	router.ServeHTTP(rr3, req3)
	s.Equal(http.StatusOK, rr3.Code)
}
