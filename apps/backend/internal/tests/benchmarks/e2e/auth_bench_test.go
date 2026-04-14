package e2e_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	authDtos "github.com/HDR3604/HelpDeskApp/internal/domain/auth/types/dtos"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/HDR3604/HelpDeskApp/internal/tests/benchmarks"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// e2eEnv holds the full-stack test environment for E2E auth benchmarks.
type e2eEnv struct {
	bdb       *benchmarks.BenchDB
	txManager database.TxManagerInterface
	router    *chi.Mux
	authSvc   service.AuthServiceInterface
	mu        sync.Mutex
	lastEmail string // last captured verification URL
}

func setupE2E(b *testing.B) *e2eEnv {
	b.Helper()
	logger := zap.NewNop()

	bdb := benchmarks.SharedBenchDB(b)
	txManager := bdb.TxManager
	ctx := bdb.Ctx()
	_ = ctx

	// Clean state before each E2E benchmark
	_ = txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		for _, t := range []string{"auth.refresh_tokens", "auth.auth_tokens", "public.email_verifications", "auth.students", "auth.users"} {
			if _, err := tx.ExecContext(ctx, "DELETE FROM "+t); err != nil {
				return err
			}
		}
		return nil
	})

	uRepo := userRepo.NewUserRepository(logger)
	refreshTokenRepo := authRepo.NewRefreshTokenRepository(logger)
	authTokenRepo := authRepo.NewAuthTokenRepository(logger)

	env := &e2eEnv{bdb: bdb, txManager: txManager}

	emailSender := &mocks.MockEmailSender{
		SendFn: func(_ context.Context, req emailDtos.SendEmailRequest) (*emailDtos.SendEmailResponse, error) {
			if req.Template != nil {
				if v, ok := req.Template.Variables["VERIFICATION_URL"]; ok {
					env.mu.Lock()
					env.lastEmail, _ = v.(string)
					env.mu.Unlock()
				}
			}
			return &emailDtos.SendEmailResponse{ID: "bench-msg"}, nil
		},
	}

	jwtSecret := []byte("e2e-bench-secret-at-least-32-bytes!!")
	authSvc := service.NewAuthService(
		logger, txManager, uRepo, refreshTokenRepo, authTokenRepo, emailSender,
		jwtSecret, 3600, 86400, 86400, 604800,
		"http://localhost:3000", "noreply@test.com",
	)
	env.authSvc = authSvc

	hdl := handler.NewAuthHandler(logger, authSvc, 3600)

	r := chi.NewRouter()
	r.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))
			hdl.RegisterAuthenticatedRoutes(r)
		})
	})
	env.router = r
	return env
}

func (e *e2eEnv) doRequest(method, path, body, accessToken string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+accessToken)
	}
	rr := httptest.NewRecorder()
	e.router.ServeHTTP(rr, req)
	return rr
}

func (e *e2eEnv) cleanup(b *testing.B) {
	b.Helper()
	ctx := context.Background()
	err := e.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "DELETE FROM auth.refresh_tokens"); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM auth.auth_tokens"); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, "DELETE FROM auth.users")
		return err
	})
	if err != nil {
		b.Fatalf("cleanup: %v", err)
	}
}

// ---------------------------------------------------------------------------
// BenchmarkE2E_Register — full register flow (HTTP → handler → service → DB)
// ---------------------------------------------------------------------------

func BenchmarkE2E_Register(b *testing.B) {
	env := setupE2E(b)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		email := "bench-" + uuid.New().String()[:8] + "@uwi.edu"
		body := `{"first_name":"Bench","last_name":"User","email":"` + email + `","password":"BenchPass1!","role":"admin"}`
		rr := env.doRequest(http.MethodPost, "/api/v1/auth/register", body, "")
		if rr.Code != http.StatusCreated {
			b.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body.String())
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkE2E_LoginWithDB — register + login (measures real bcrypt + DB)
// ---------------------------------------------------------------------------

func BenchmarkE2E_LoginWithDB(b *testing.B) {
	env := setupE2E(b)

	// Pre-register and verify a user for login benchmarking
	email := "bench-login@uwi.edu"
	regBody := `{"first_name":"Bench","last_name":"User","email":"` + email + `","password":"BenchPass1!","role":"admin"}`
	rr := env.doRequest(http.MethodPost, "/api/v1/auth/register", regBody, "")
	if rr.Code != http.StatusCreated {
		b.Fatalf("register setup: %d %s", rr.Code, rr.Body.String())
	}

	// Manually verify email via DB (faster than extracting verification token)
	ctx := context.Background()
	err := env.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "UPDATE auth.users SET email_verified_at = NOW() WHERE email_address = $1", email)
		return err
	})
	if err != nil {
		b.Fatalf("verify setup: %v", err)
	}

	loginBody := `{"email":"` + email + `","password":"BenchPass1!"}`

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := env.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkE2E_RefreshToken — login then refresh (token rotation with DB)
// ---------------------------------------------------------------------------

func BenchmarkE2E_RefreshToken(b *testing.B) {
	env := setupE2E(b)

	email := "bench-refresh@uwi.edu"
	regBody := `{"first_name":"Bench","last_name":"User","email":"` + email + `","password":"BenchPass1!","role":"admin"}`
	rr := env.doRequest(http.MethodPost, "/api/v1/auth/register", regBody, "")
	if rr.Code != http.StatusCreated {
		b.Fatalf("register setup: %d %s", rr.Code, rr.Body.String())
	}

	ctx := context.Background()
	_ = env.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "UPDATE auth.users SET email_verified_at = NOW() WHERE email_address = $1", email)
		return err
	})

	loginBody := `{"email":"` + email + `","password":"BenchPass1!"}`

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Login to get a fresh refresh token
		loginRR := env.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
		if loginRR.Code != http.StatusOK {
			b.Fatalf("login: %d %s", loginRR.Code, loginRR.Body.String())
		}
		var tokenResp authDtos.AuthTokenResponse
		json.NewDecoder(loginRR.Body).Decode(&tokenResp)

		// Refresh
		refreshBody := `{"refresh_token":"` + tokenResp.RefreshToken + `"}`
		refreshRR := env.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
		if refreshRR.Code != http.StatusOK {
			b.Fatalf("refresh: %d %s", refreshRR.Code, refreshRR.Body.String())
		}
	}
}
