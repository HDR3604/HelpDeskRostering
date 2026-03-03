package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	transcriptErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/interfaces"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

type TranscriptHandler struct {
	logger  *zap.Logger
	service interfaces.TranscriptsServiceInterface
}

func NewTranscriptHandler(logger *zap.Logger, service interfaces.TranscriptsServiceInterface) *TranscriptHandler {
	return &TranscriptHandler{
		logger:  logger,
		service: service,
	}
}

const maxUploadSize = 10 << 20 // 10 MB

func (h *TranscriptHandler) RegisterRoutes(r chi.Router) {
	r.Post("/transcripts/extract", h.ExtractTranscript)
}

func (h *TranscriptHandler) ExtractTranscript(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid form data")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	pdfBytes, err := io.ReadAll(file)
	if err != nil {
		h.logger.Error("failed to read uploaded file", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	// Validate by checking the PDF magic bytes (%PDF-) rather than the
	// Content-Type header, which browsers may set to application/octet-stream.
	if len(pdfBytes) < 5 || string(pdfBytes[:5]) != "%PDF-" {
		writeError(w, http.StatusBadRequest, "only PDF files are accepted")
		return
	}

	result, err := h.service.ExtractTranscript(header.Filename, pdfBytes)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *TranscriptHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, transcriptErrors.ErrTranscriptInvalid):
		writeError(w, http.StatusUnprocessableEntity, "could not extract data from the uploaded transcript")
	case errors.Is(err, transcriptErrors.ErrTranscriptsUnavailable):
		writeError(w, http.StatusServiceUnavailable, "transcript service is temporarily unavailable")
	case errors.Is(err, transcriptErrors.ErrTranscriptsInternal),
		errors.Is(err, transcriptErrors.ErrUnmarshalResponse):
		writeError(w, http.StatusBadGateway, "transcript processing failed")
	default:
		h.logger.Error("unhandled transcript error", zap.Error(err))
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
