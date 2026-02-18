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
	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	scheduleService "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	userService "github.com/HDR3604/HelpDeskApp/internal/domain/user/service"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	emailService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	scheduleRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/schedule"
	schedulerService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/service"
	transcriptsService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/service"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

type App struct {
	config Config
	db     *sql.DB
	logger *zap.Logger
	server *http.Server
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
	emailVerificationRepository := authRepo.NewEmailVerificationRepository(logger)
	scheduleRepository := scheduleRepo.NewScheduleRepository(logger)
	scheduleGenerationRepository := scheduleRepo.NewScheduleGenerationRepository(logger)
	shiftTemplateRepo := scheduleRepo.NewShiftTemplateRepository(logger)
	schedulerConfigRepo := scheduleRepo.NewSchedulerConfigRepository(logger)

	// Email sender
	var emailSenderSvc emailInterfaces.EmailSenderInterface
	if cfg.Environment == "production" {
		emailSenderSvc = emailService.NewResendEmailSenderService(logger)
	} else {
		emailSenderSvc = emailService.NewMailpitEmailSenderService(logger)
	}

	// Services
	_ = userService.NewUserService(logger, txManager, userRepository) // available for future user CRUD endpoints
	transcriptsSvc := transcriptsService.NewTranscriptsService(logger)
	_ = transcriptsSvc // TODO: inject into domain service when needed

	authSvc := authService.NewAuthService(
		logger,
		txManager,
		userRepository,
		refreshTokenRepository,
		emailVerificationRepository,
		emailSenderSvc,
		[]byte(cfg.JWTSecret),
		cfg.AccessTokenTTL,
		cfg.RefreshTokenTTL,
		cfg.VerificationTokenTTL,
		cfg.FrontendURL,
		cfg.FromEmail,
	)

	scheduleGenerationSvc := scheduleService.NewScheduleGenerationService(logger, scheduleGenerationRepository, txManager)
	schedulerSvc := schedulerService.NewSchedulerService(logger)
	shiftTemplateSvc := scheduleService.NewShiftTemplateService(logger, shiftTemplateRepo, txManager)
	schedulerConfigSvc := scheduleService.NewSchedulerConfigService(logger, schedulerConfigRepo, txManager)
	scheduleSvc := scheduleService.NewScheduleService(logger, scheduleRepository, txManager, scheduleGenerationSvc, schedulerSvc, shiftTemplateSvc, schedulerConfigSvc)

	// Handlers
	authHdl := authHandler.NewAuthHandler(logger, authSvc, cfg.AccessTokenTTL)
	scheduleHdl := scheduleHandler.NewScheduleHandler(logger, scheduleSvc)
	scheduleGenerationHdl := scheduleHandler.NewScheduleGenerationHandler(logger, scheduleGenerationSvc)
	shiftTemplateHdl := scheduleHandler.NewShiftTemplateHandler(logger, shiftTemplateSvc)
	schedulerConfigHdl := scheduleHandler.NewSchedulerConfigHandler(logger, schedulerConfigSvc)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)

	registerRoutes(r, cfg, authHdl, authSvc, scheduleHdl, scheduleGenerationHdl, shiftTemplateHdl, schedulerConfigHdl)

	app := &App{
		config: cfg,
		db:     db,
		logger: logger,
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
