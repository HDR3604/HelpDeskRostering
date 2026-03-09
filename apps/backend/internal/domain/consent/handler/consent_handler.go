package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/HDR3604/HelpDeskApp/internal/domain/consent"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

type ConsentHandler struct {
	logger *zap.Logger
}

func NewConsentHandler(logger *zap.Logger) *ConsentHandler {
	return &ConsentHandler{logger: logger}
}

// RegisterRoutes registers public (unauthenticated) consent routes.
func (h *ConsentHandler) RegisterRoutes(r chi.Router) {
	r.Get("/consent/current", h.GetCurrentConsent)
}

type consentResponse struct {
	Version string `json:"version"`
	Text    string `json:"text"`
}

func (h *ConsentHandler) GetCurrentConsent(w http.ResponseWriter, r *http.Request) {
	text, ok := consent.ConsentTexts[consent.ConsentVersion]
	if !ok {
		h.logger.Error("current consent version not found in registry", zap.String("version", consent.ConsentVersion))
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, consentResponse{
		Version: consent.ConsentVersion,
		Text:    text,
	})
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
