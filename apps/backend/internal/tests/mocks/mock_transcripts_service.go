package mocks

import (
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types/dtos"
)

var _ interfaces.TranscriptsServiceInterface = (*MockTranscriptsService)(nil)

type MockTranscriptsService struct {
	ExtractTranscriptFn func(filename string, pdfBytes []byte) (*dtos.ExtractTranscriptResponse, error)
}

func (m *MockTranscriptsService) ExtractTranscript(filename string, pdfBytes []byte) (*dtos.ExtractTranscriptResponse, error) {
	return m.ExtractTranscriptFn(filename, pdfBytes)
}
