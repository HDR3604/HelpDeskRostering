package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	studentAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentService "github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
	emailInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/templates"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	schedulerTypes "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ScheduleHandler struct {
	logger      *zap.Logger
	service     service.ScheduleServiceInterface
	studentSvc  studentService.StudentServiceInterface
	shiftTplSvc service.ShiftTemplateServiceInterface
	emailSender emailInterfaces.EmailSenderInterface
	fromEmail   string
}

func NewScheduleHandler(
	logger *zap.Logger,
	service service.ScheduleServiceInterface,
	studentSvc studentService.StudentServiceInterface,
	shiftTplSvc service.ShiftTemplateServiceInterface,
	emailSender emailInterfaces.EmailSenderInterface,
	fromEmail string,
) *ScheduleHandler {
	return &ScheduleHandler{
		logger:      logger,
		service:     service,
		studentSvc:  studentSvc,
		shiftTplSvc: shiftTplSvc,
		emailSender: emailSender,
		fromEmail:   fromEmail,
	}
}

func (h *ScheduleHandler) RegisterRoutes(r chi.Router) {
	r.Get("/schedules/active", h.GetActive)
	r.Get("/schedules/{id}", h.GetByID)
}

func (h *ScheduleHandler) RegisterAdminRoutes(r chi.Router) {
	r.Post("/schedules", h.Create)
	r.Post("/schedules/generate", h.GenerateSchedule)
	r.Get("/schedules", h.List)
	r.Get("/schedules/archived", h.ListArchived)
	r.Put("/schedules/{id}", h.Update)
	r.Patch("/schedules/{id}/archive", h.Archive)
	r.Patch("/schedules/{id}/unarchive", h.Unarchive)
	r.Patch("/schedules/{id}/activate", h.Activate)
	r.Patch("/schedules/{id}/deactivate", h.Deactivate)
	r.Post("/schedules/{id}/notify", h.NotifyStudents)
}

func (h *ScheduleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dtos.CreateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	effectiveFrom, err := time.Parse("2006-01-02", req.EffectiveFrom)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid effective_from date format, expected YYYY-MM-DD")
		return
	}

	var effectiveTo *time.Time
	if req.EffectiveTo != nil {
		parsed, err := time.Parse("2006-01-02", *req.EffectiveTo)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid effective_to date format, expected YYYY-MM-DD")
			return
		}
		effectiveTo = &parsed
	}

	schedule, err := aggregate.NewSchedule(req.Title, effectiveFrom, effectiveTo)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	created, err := h.service.Create(r.Context(), schedule)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ScheduleToResponse(created))
}

func (h *ScheduleHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	var req dtos.UpdateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.service.UpdateSchedule(r.Context(), id, req.Title, req.Assignments)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ScheduleToResponse(updated))
}

func (h *ScheduleHandler) GenerateSchedule(w http.ResponseWriter, r *http.Request) {
	var req dtos.GenerateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.StudentIDs) == 0 {
		writeError(w, http.StatusBadRequest, "at least one student_id is required")
		return
	}

	configID, err := uuid.Parse(req.ConfigID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid config_id")
		return
	}

	effectiveFrom, err := time.Parse("2006-01-02", req.EffectiveFrom)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid effective_from date format, expected YYYY-MM-DD")
		return
	}

	var effectiveTo *time.Time
	if req.EffectiveTo != nil {
		parsed, err := time.Parse("2006-01-02", *req.EffectiveTo)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid effective_to date format, expected YYYY-MM-DD")
			return
		}
		effectiveTo = &parsed
	}

	// Fetch students by ID and convert to scheduler assistants
	assistants := make([]schedulerTypes.Assistant, 0, len(req.StudentIDs))
	for _, sid := range req.StudentIDs {
		studentID, err := strconv.ParseInt(sid, 10, 32)
		if err != nil {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid student_id: %s", sid))
			return
		}

		student, err := h.studentSvc.GetByID(r.Context(), int32(studentID))
		if err != nil {
			h.logger.Warn("failed to fetch student", zap.String("student_id", sid), zap.Error(err))
			writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("student not found: %s", sid))
			return
		}

		assistants = append(assistants, studentToAssistant(student))
	}

	params := service.GenerateScheduleParams{
		ConfigID:      configID,
		Title:         req.Title,
		EffectiveFrom: effectiveFrom,
		EffectiveTo:   effectiveTo,
		Assistants:    assistants,
	}

	schedule, err := h.service.GenerateSchedule(r.Context(), params)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ScheduleToResponse(schedule))
}

// studentToAssistant converts a Student aggregate into a scheduler Assistant.
func studentToAssistant(s *studentAggregate.Student) schedulerTypes.Assistant {
	// Collect course codes from transcript
	courses := make([]string, len(s.TranscriptMetadata.Courses))
	for i, c := range s.TranscriptMetadata.Courses {
		courses[i] = c.Code
	}

	// Convert availability: map[string][]int → []AvailabilityWindow
	// Each key is a day index ("0"–"4"), values are available hours (e.g. [9,10,11,14,15]).
	// Contiguous hours are grouped into windows: [9,10,11] → {start: "09:00:00", end: "12:00:00"}.
	var windows []schedulerTypes.AvailabilityWindow
	for dayStr, hours := range s.Availability {
		day, err := strconv.Atoi(dayStr)
		if err != nil {
			continue
		}
		if len(hours) == 0 {
			continue
		}
		sorted := make([]int, len(hours))
		copy(sorted, hours)
		sort.Ints(sorted)

		start := sorted[0]
		end := sorted[0] + 1
		for i := 1; i < len(sorted); i++ {
			if sorted[i] == end {
				end = sorted[i] + 1
			} else {
				windows = append(windows, schedulerTypes.AvailabilityWindow{
					DayOfWeek: day,
					Start:     fmt.Sprintf("%02d:00:00", start),
					End:       fmt.Sprintf("%02d:00:00", end),
				})
				start = sorted[i]
				end = sorted[i] + 1
			}
		}
		windows = append(windows, schedulerTypes.AvailabilityWindow{
			DayOfWeek: day,
			Start:     fmt.Sprintf("%02d:00:00", start),
			End:       fmt.Sprintf("%02d:00:00", end),
		})
	}

	maxHours := float32(40)
	if s.MaxWeeklyHours != nil {
		maxHours = float32(*s.MaxWeeklyHours)
	}

	return schedulerTypes.Assistant{
		ID:           strconv.Itoa(int(s.StudentID)),
		Courses:      courses,
		Availability: windows,
		MinHours:     float32(s.MinWeeklyHours),
		MaxHours:     maxHours,
		CostPerHour:  0,
	}
}

func (h *ScheduleHandler) GetActive(w http.ResponseWriter, r *http.Request) {
	schedule, err := h.service.GetActive(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ScheduleToResponse(schedule))
}

func (h *ScheduleHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	schedule, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ScheduleToResponse(schedule))
}

func (h *ScheduleHandler) List(w http.ResponseWriter, r *http.Request) {
	schedules, err := h.service.List(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulesToResponse(schedules))
}

func (h *ScheduleHandler) ListArchived(w http.ResponseWriter, r *http.Request) {
	schedules, err := h.service.ListArchived(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulesToResponse(schedules))
}

func (h *ScheduleHandler) Archive(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Archive(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) Unarchive(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Unarchive(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) Activate(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Activate(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Deactivate(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

var dayNames = [7]string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}

func (h *ScheduleHandler) NotifyStudents(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	// Get the schedule
	schedule, err := h.service.GetByID(ctx, id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	// Parse assignments from the schedule's JSON
	// The scheduler stores assistant_id and shift_id as strings.
	type assignmentEntry struct {
		AssistantID string `json:"assistant_id"`
		ShiftID     string `json:"shift_id"`
	}
	var assignments []assignmentEntry
	if err := json.Unmarshal(schedule.Assignments, &assignments); err != nil {
		h.logger.Error("failed to parse assignments", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to parse schedule assignments")
		return
	}

	if len(assignments) == 0 {
		writeJSON(w, http.StatusOK, map[string]int{"notified_count": 0})
		return
	}

	// Collect unique assistant IDs and their shift IDs
	type studentShifts struct {
		shiftIDs []string
	}
	studentShiftMap := make(map[string]*studentShifts)
	for _, a := range assignments {
		ss, ok := studentShiftMap[a.AssistantID]
		if !ok {
			ss = &studentShifts{}
			studentShiftMap[a.AssistantID] = ss
		}
		ss.shiftIDs = append(ss.shiftIDs, a.ShiftID)
	}

	// Get all students
	students, err := h.studentSvc.List(ctx, "")
	if err != nil {
		h.logger.Error("failed to list students", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to fetch students")
		return
	}

	// Build studentID -> student map (keyed by string to match assignment format)
	studentMap := make(map[string]*studentAggregate.Student, len(students))
	for _, s := range students {
		studentMap[fmt.Sprintf("%d", s.StudentID)] = s
	}

	// Get all shift templates
	shiftTemplates, err := h.shiftTplSvc.ListAll(ctx)
	if err != nil {
		h.logger.Error("failed to list shift templates", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to fetch shift templates")
		return
	}

	// Build shiftID -> template map (keyed by string UUID to match assignment format)
	shiftMap := make(map[string]*aggregate.ShiftTemplate, len(shiftTemplates))
	for _, t := range shiftTemplates {
		shiftMap[t.ID.String()] = t
	}

	// Build email batch
	var batchEmails emailDtos.SendEmailBulkRequest
	notifiedCount := 0

	for studentID, ss := range studentShiftMap {
		student, ok := studentMap[studentID]
		if !ok {
			h.logger.Warn("student not found for assignment", zap.String("student_id", studentID))
			continue
		}

		// Collect shift entries for this student
		var entries []templates.ShiftEntry
		for _, shiftID := range ss.shiftIDs {
			tpl, ok := shiftMap[shiftID]
			if !ok {
				h.logger.Warn("shift template not found", zap.String("shift_id", shiftID))
				continue
			}

			dayName := dayNames[tpl.DayOfWeek]
			shiftDate := schedule.EffectiveFrom.AddDate(0, 0, int(tpl.DayOfWeek))
			timeRange := fmt.Sprintf("%s - %s", tpl.StartTime.Format("15:04"), tpl.EndTime.Format("15:04"))

			entries = append(entries, templates.ShiftEntry{
				Day:  dayName,
				Date: shiftDate.Format("2006-01-02"),
				Time: timeRange,
			})
		}

		if len(entries) == 0 {
			continue
		}

		shiftRows := templates.BuildShiftRows(entries)

		tmpl := types.EmailTemplate{
			ID: templates.TemplateID_RosterNotification,
			Variables: map[string]any{
				"STUDENT_NAME":  fmt.Sprintf("%s %s", student.FirstName, student.LastName),
				"SCHEDULE_NAME": schedule.Title,
				"SHIFT_ROWS":    shiftRows,
				"CONTACT_EMAIL": h.fromEmail,
			},
		}

		html, err := templates.Render(tmpl)
		if err != nil {
			h.logger.Error("failed to render email template",
				zap.String("student_id", studentID),
				zap.Error(err),
			)
			continue
		}

		batchEmails = append(batchEmails, emailDtos.BatchEmailItem{
			From:    h.fromEmail,
			To:      []string{student.EmailAddress},
			Subject: fmt.Sprintf("Your Help Desk Schedule: %s", schedule.Title),
			HTML:    html,
			Tags: []types.EmailTag{
				{Name: "type", Value: "roster_notification"},
			},
		})
		notifiedCount++
	}

	// Send in batches of 100
	for i := 0; i < len(batchEmails); i += 100 {
		end := i + 100
		if end > len(batchEmails) {
			end = len(batchEmails)
		}
		batch := batchEmails[i:end]
		if _, err := h.emailSender.SendBatch(ctx, batch); err != nil {
			h.logger.Error("failed to send email batch",
				zap.Int("batch_start", i),
				zap.Error(err),
			)
			writeError(w, http.StatusInternalServerError, "failed to send notification emails")
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]int{"notified_count": notifiedCount})
}

func (h *ScheduleHandler) parseID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, "id"))
}

func (h *ScheduleHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, scheduleErrors.ErrNotFound):
		writeError(w, http.StatusNotFound, "schedule not found")
	case errors.Is(err, scheduleErrors.ErrInvalidTitle):
		writeError(w, http.StatusBadRequest, "invalid title provided")
	case errors.Is(err, scheduleErrors.ErrInvalidEffectivePeriod):
		writeError(w, http.StatusBadRequest, "effective from must be before effective to and not equal")
	case errors.Is(err, scheduleErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "unauthorized")
	case errors.Is(err, scheduleErrors.ErrAlreadyActive),
		errors.Is(err, scheduleErrors.ErrAlreadyDraft),
		errors.Is(err, scheduleErrors.ErrAlreadyArchived),
		errors.Is(err, scheduleErrors.ErrInvalidTransition):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, schedulerErrors.ErrSchedulerUnavailable),
		errors.Is(err, schedulerErrors.ErrSchedulerInternal):
		writeError(w, http.StatusBadGateway, "scheduler service unavailable")
	case errors.Is(err, schedulerErrors.ErrInvalidRequest):
		writeError(w, http.StatusUnprocessableEntity, "invalid schedule request")
	case errors.Is(err, schedulerErrors.ErrInfeasible):
		writeError(w, http.StatusUnprocessableEntity, "no feasible schedule found")
	case errors.Is(err, scheduleErrors.ErrNoActiveShiftTemplates):
		writeError(w, http.StatusUnprocessableEntity, "no active shift templates configured")
	case errors.Is(err, scheduleErrors.ErrSchedulerConfigNotFound):
		writeError(w, http.StatusNotFound, "scheduler config not found")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
