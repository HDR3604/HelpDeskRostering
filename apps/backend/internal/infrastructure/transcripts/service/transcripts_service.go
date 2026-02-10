package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types/dtos"
	"go.uber.org/zap"
)

var _ interfaces.TranscriptsServiceInterface = (*TranscriptsService)(nil)

type TranscriptsService struct {
	logger  *zap.Logger
	baseurl string
}

func NewTranscriptsService(logger *zap.Logger) interfaces.TranscriptsServiceInterface {
	url := os.Getenv("TRANSCRIPTS_SERVICE_URL")

	if url == "" {
		panic("TRANSCRIPTS_SERVICE_URL is not set in the current environment")
	}

	return &TranscriptsService{
		logger:  logger,
		baseurl: url,
	}
}

func (s *TranscriptsService) ExtractTranscript(filename string, pdfBytes []byte) (*dtos.ExtractTranscriptResponse, error) {
	// Ensure that the transcripts service is available
	healthResponse, err := http.Get(s.baseurl + "/api/v1/healthy")
	if err != nil {
		s.logger.Error("transcripts health check failed", zap.String("url", s.baseurl), zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrTranscriptsUnavailable, err)
	}
	defer func() { _ = healthResponse.Body.Close() }()

	// Build multipart/form-data request body
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		s.logger.Error("failed to create form file", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrTranscriptsInternal, err)
	}

	if _, err := part.Write(pdfBytes); err != nil {
		s.logger.Error("failed to write pdf bytes", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrTranscriptsInternal, err)
	}

	if err := writer.Close(); err != nil {
		s.logger.Error("failed to close multipart writer", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrTranscriptsInternal, err)
	}

	// Make request to extract transcript
	resp, err := http.Post(s.baseurl+"/api/v1/transcripts/extract", writer.FormDataContentType(), &body)
	if err != nil {
		s.logger.Error("failed to send extract request", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrTranscriptsUnavailable, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		s.logger.Error("transcripts service rejected request",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response_body", string(respBody)),
		)

		switch {
		case resp.StatusCode == http.StatusUnprocessableEntity:
			return nil, fmt.Errorf("%w: %s", errors.ErrTranscriptInvalid, string(respBody))
		case resp.StatusCode >= 500:
			return nil, fmt.Errorf("%w: status %d", errors.ErrTranscriptsInternal, resp.StatusCode)
		default:
			return nil, fmt.Errorf("%w: unexpected status %d: %s", errors.ErrTranscriptsInternal, resp.StatusCode, string(respBody))
		}
	}

	var result dtos.ExtractTranscriptResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		s.logger.Error("failed to decode response", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrUnmarshalResponse, err)
	}

	return &result, nil
}
