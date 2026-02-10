package application

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	scheduleService "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	scheduleRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/schedule"
	schedulerService "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/service"
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
	scheduleRepository := scheduleRepo.NewScheduleRepository(logger)
	scheduleGenerationRepository := scheduleRepo.NewScheduleGenerationRepository(logger)
	shiftTemplateRepo := scheduleRepo.NewShiftTemplateRepository(logger)
	schedulerConfigRepo := scheduleRepo.NewSchedulerConfigRepository(logger)

	// Services
	scheduleGenerationSvc := scheduleService.NewScheduleGenerationService(logger, scheduleGenerationRepository, txManager)
	schedulerSvc := schedulerService.NewSchedulerService(logger)
	shiftTemplateSvc := scheduleService.NewShiftTemplateService(logger, shiftTemplateRepo, txManager)
	schedulerConfigSvc := scheduleService.NewSchedulerConfigService(logger, schedulerConfigRepo, txManager)
	scheduleSvc := scheduleService.NewScheduleService(logger, scheduleRepository, txManager, scheduleGenerationSvc, schedulerSvc, shiftTemplateSvc, schedulerConfigSvc)

	// Handlers
	scheduleHdl := scheduleHandler.NewScheduleHandler(logger, scheduleSvc)
	scheduleGenerationHdl := scheduleHandler.NewScheduleGenerationHandler(logger, scheduleGenerationSvc)
	shiftTemplateHdl := scheduleHandler.NewShiftTemplateHandler(logger, shiftTemplateSvc)
	schedulerConfigHdl := scheduleHandler.NewSchedulerConfigHandler(logger, schedulerConfigSvc)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	registerRoutes(r, scheduleHdl, scheduleGenerationHdl, shiftTemplateHdl, schedulerConfigHdl)

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

func (a *App) Shutdown() {
	if a.db != nil {
		if err := a.db.Close(); err != nil {
			a.logger.Error("failed to close database", zap.Error(err))
		}
	}
	_ = a.logger.Sync()
}
