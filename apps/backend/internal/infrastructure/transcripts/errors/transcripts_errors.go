package errors

import "errors"

var (
	ErrTranscriptNotFound     = errors.New("transcript not found")
	ErrTranscriptInvalid      = errors.New("invalid transcript format")
	ErrTranscriptsUnavailable = errors.New("transcripts service is not available")
	ErrTranscriptsInternal    = errors.New("transcripts service internal error")
	ErrUnmarshalResponse      = errors.New("failed to decode transcripts response")
)
