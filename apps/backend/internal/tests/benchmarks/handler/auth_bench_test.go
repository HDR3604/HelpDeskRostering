package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// buildRouter creates a chi router with auth routes wired to the mock service.
func buildRouter(authSvc *mocks.MockAuthService) *chi.Mux {
	logger := zap.NewNop()
	hdl := handler.NewAuthHandler(logger, authSvc, 3600)

	r := chi.NewRouter()
	r.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))
			hdl.RegisterAuthenticatedRoutes(r)
		})
	})
	return r
}

// ---------------------------------------------------------------------------
// BenchmarkLoginHandler — measures HTTP JSON decode → service → JSON encode
// ---------------------------------------------------------------------------

func BenchmarkLoginHandler(b *testing.B) {
	authSvc := &mocks.MockAuthService{
		LoginFn: func(_ context.Context, _, _ string) (string, string, error) {
			return "access-token-value", "refresh-token-value", nil
		},
	}
	router := buildRouter(authSvc)
	body := `{"email":"bench@uwi.edu","password":"BenchPass1!"}`

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkRegisterHandler
// ---------------------------------------------------------------------------

func BenchmarkRegisterHandler(b *testing.B) {
	authSvc := &mocks.MockAuthService{
		RegisterFn: func(_ context.Context, firstName, lastName, email, _, role string) (*userAggregate.User, error) {
			now := time.Now()
			return &userAggregate.User{
				ID:        uuid.New(),
				FirstName: firstName,
				LastName:  lastName,
				Email:     email,
				Role:      userAggregate.Role(role),
				IsActive:  true,
				CreatedAt: &now,
			}, nil
		},
	}
	router := buildRouter(authSvc)
	body := `{"first_name":"Bench","last_name":"User","email":"bench@uwi.edu","password":"BenchPass1!","role":"admin"}`

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusCreated {
			b.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body.String())
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkRefreshHandler
// ---------------------------------------------------------------------------

func BenchmarkRefreshHandler(b *testing.B) {
	authSvc := &mocks.MockAuthService{
		RefreshFn: func(_ context.Context, _ string) (string, string, error) {
			return "new-access", "new-refresh", nil
		},
	}
	router := buildRouter(authSvc)
	body := `{"refresh_token":"some-refresh-token"}`

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkJWTMiddleware — measures JWT validation in the middleware path
// ---------------------------------------------------------------------------

func BenchmarkJWTMiddleware(b *testing.B) {
	claims := &service.Claims{
		FirstName: "Bench",
		LastName:  "User",
		Email:     "bench@uwi.edu",
		Role:      "admin",
	}
	authSvc := &mocks.MockAuthService{
		ValidateAccessTokenFn: func(_ string) (*service.Claims, error) {
			return claims, nil
		},
	}

	r := chi.NewRouter()
	r.Use(middleware.JWTAuth(authSvc))
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer test-token")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rr.Code)
		}
	}
}
