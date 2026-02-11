package interfaces

import (
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types/dtos"
)

type TranscriptsServiceInterface interface {
	ExtractTranscript(filename string, pdfBytes []byte) (*dtos.ExtractTranscriptResponse, error)
}
