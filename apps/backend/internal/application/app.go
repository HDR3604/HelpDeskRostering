package application

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	authHandler "github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	authService "github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	consentHandler "github.com/HDR3604/HelpDeskApp/internal/domain/consent/handler"
	payrollHandler "github.com/HDR3604/HelpDeskApp/internal/domain/payroll/handler"
	payrollService "github.com/HDR3604/HelpDeskApp/internal/domain/payroll/service"
	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	scheduleService "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	studentHandler "github.com/HDR3604/HelpDeskApp/internal/domain/student/handler"
	studentService "github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
	timelogHandler "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/handler"
	timelogService "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
	transcriptHandler "github.com/HDR3604/HelpDeskApp/internal/domain/transcript/handler"
	userHandler "github.com/HDR3604/HelpDeskApp/internal/domain/user/handler"
	userService "github.com/HDR3604/HelpDeskApp/internal/domain/user/service"
	verificationHandler "github.com/HDR3604/HelpDeskApp/internal/domain/verification/handler"
	verificationService "github.com/HDR3604/HelpDeskApp/internal/domain/verification/service"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	consentRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/consent"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	emailService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	payrollRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/payroll"
	scheduleRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/schedule"
	schedulerService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/service"
	studentRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/student"
	timelogRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/timelog"
	transcriptsService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/service"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	verificationInfra "github.com/HDR3604/HelpDeskApp/internal/infrastructure/verification"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

type App struct {
	config  Config
	db      *sql.DB
	logger  *zap.Logger
	server  *http.Server
	authSvc authService.AuthServiceInterface
}

func NewApp(cfg Config) (*App, error) {
	// Logger
	var logger *zap.Logger
	var err error
	if cfg.Environment == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	// Database
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("connected to database")

	// Infrastructure
	txManager := database.NewTxManager(db, logger)

	// Repositories
	userRepository := userRepo.NewUserRepository(logger)
	refreshTokenRepository := authRepo.NewRefreshTokenRepository(logger)
	authTokenRepository := authRepo.NewAuthTokenRepository(logger)
	scheduleRepository := scheduleRepo.NewScheduleRepository(logger)
	scheduleGenerationRepository := scheduleRepo.NewScheduleGenerationRepository(logger)
	shiftTemplateRepo := scheduleRepo.NewShiftTemplateRepository(logger)
	schedulerConfigRepo := scheduleRepo.NewSchedulerConfigRepository(logger)
	bankingDetailsRepository := studentRepo.NewBankingDetailsRepository(logger, cfg.EncryptionKey)
	consentRepository := consentRepo.NewConsentRepository(logger)
	studentRepository := studentRepo.NewStudentRepository(logger)
	verificationRepository := verificationInfra.NewVerificationRepository(logger)
	timeLogRepository := timelogRepo.NewTimeLogRepository(logger)
	clockInCodeRepository := timelogRepo.NewClockInCodeRepository(logger)
	paymentRepository := payrollRepo.NewPaymentRepository(logger)

	// Seed default admin (idempotent, skipped if env vars not set)
	if err := seedDefaultAdmin(context.Background(), cfg, logger, txManager, userRepository); err != nil {
		logger.Warn("failed to seed default admin", zap.Error(err))
	}

	// Email sender
	var emailSenderSvc emailInterfaces.EmailSenderInterface
	if cfg.Environment == "production" {
		emailSenderSvc = emailService.NewResendEmailSenderService(logger)
	} else {
		emailSenderSvc = emailService.NewMailpitEmailSenderService(logger)
	}

	// Services
	userSvc := userService.NewUserService(logger, txManager, userRepository) // available for future user CRUD endpoints
	transcriptsSvc := transcriptsService.NewTranscriptsService(logger)

	authSvc := authService.NewAuthService(
		logger,
		txManager,
		userRepository,
		refreshTokenRepository,
		authTokenRepository,
		emailSenderSvc,
		[]byte(cfg.JWTSecret),
		cfg.AccessTokenTTL,
		cfg.RefreshTokenTTL,
		cfg.VerificationTokenTTL,
		cfg.OnboardingTokenTTL,
		cfg.FrontendURL,
		cfg.FromEmail,
	)

	scheduleGenerationSvc := scheduleService.NewScheduleGenerationService(logger, scheduleGenerationRepository, txManager)
	schedulerSvc := schedulerService.NewSchedulerService(logger)
	shiftTemplateSvc := scheduleService.NewShiftTemplateService(logger, shiftTemplateRepo, txManager)
	schedulerConfigSvc := scheduleService.NewSchedulerConfigService(logger, schedulerConfigRepo, txManager)
	scheduleSvc := scheduleService.NewScheduleService(logger, scheduleRepository, txManager, scheduleGenerationSvc, schedulerSvc, shiftTemplateSvc, schedulerConfigSvc)
	bankingDetailsSvc := studentService.NewBankingDetailsService(logger, txManager, bankingDetailsRepository, consentRepository)
	studentSvc := studentService.NewStudentService(logger, studentRepository, txManager)
	verificationSvc := verificationService.NewVerificationService(logger, txManager, verificationRepository, emailSenderSvc, cfg.FromEmail)
	timeLogSvc := timelogService.NewTimeLogService(logger, txManager, timeLogRepository, clockInCodeRepository, scheduleRepository, cfg.HelpDeskLongitude, cfg.HelpDeskLatitude)
	payrollSvc := payrollService.NewPayrollService(logger, txManager, paymentRepository, studentRepository, bankingDetailsRepository)

	// Handlers
	consentHdl := consentHandler.NewConsentHandler(logger)
	authHdl := authHandler.NewAuthHandler(logger, authSvc, cfg.AccessTokenTTL)
	transcriptHdl := transcriptHandler.NewTranscriptHandler(logger, transcriptsSvc)
	scheduleHdl := scheduleHandler.NewScheduleHandler(logger, scheduleSvc, studentSvc, shiftTemplateSvc, emailSenderSvc, cfg.FromEmail)
	scheduleGenerationHdl := scheduleHandler.NewScheduleGenerationHandler(logger, scheduleGenerationSvc)
	shiftTemplateHdl := scheduleHandler.NewShiftTemplateHandler(logger, shiftTemplateSvc)
	schedulerConfigHdl := scheduleHandler.NewSchedulerConfigHandler(logger, schedulerConfigSvc)
	studentHdl := studentHandler.NewStudentHandler(logger, bankingDetailsSvc, studentSvc, authSvc, emailSenderSvc, cfg.FromEmail, cfg.FrontendURL)
	userHdl := userHandler.NewUserHandler(logger, userSvc)
	verificationHdl := verificationHandler.NewVerificationHandler(logger, verificationSvc)
	timeLogHdl := timelogHandler.NewTimeLogHandler(logger, timeLogSvc)
	payrollHdl := payrollHandler.NewPayrollHandler(logger, payrollSvc)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           3600,
	}))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			next.ServeHTTP(w, r)
		})
	})

	registerRoutes(r, cfg, authHdl, authSvc, consentHdl, transcriptHdl, scheduleHdl, scheduleGenerationHdl, shiftTemplateHdl, schedulerConfigHdl, studentHdl, userHdl, verificationHdl, timeLogHdl, payrollHdl)

	app := &App{
		config:  cfg,
		db:      db,
		logger:  logger,
		authSvc: authSvc,
		server: &http.Server{
			Addr:         ":" + cfg.Port,
			Handler:      r,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}

	return app, nil
}

func (a *App) Run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Start background token cleanup
	go a.runTokenCleanup(ctx)

	// Start server in a goroutine
	errCh := make(chan error, 1)
	go func() {
		a.logger.Info("server starting", zap.String("addr", a.server.Addr))
		if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	// Wait for interrupt or server error
	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case <-ctx.Done():
		a.logger.Info("shutting down server")
	}

	// Graceful shutdown with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := a.server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown error: %w", err)
	}

	a.logger.Info("server stopped")
	return nil
}

const tokenCleanupInterval = 24 * time.Hour

func (a *App) runTokenCleanup(ctx context.Context) {
	// Run once on startup
	if err := a.authSvc.CleanupStaleTokens(ctx); err != nil {
		a.logger.Error("initial token cleanup failed", zap.Error(err))
	}

	ticker := time.NewTicker(tokenCleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := a.authSvc.CleanupStaleTokens(ctx); err != nil {
				a.logger.Error("token cleanup failed", zap.Error(err))
			}
		}
	}
}

func devAuthMiddleware(userID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := database.WithAuthContext(r.Context(), database.AuthContext{
				UserID: userID,
				Role:   "admin",
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func (a *App) Shutdown() {
	if a.db != nil {
		if err := a.db.Close(); err != nil {
			a.logger.Error("failed to close database", zap.Error(err))
		}
	}
	_ = a.logger.Sync()
}
