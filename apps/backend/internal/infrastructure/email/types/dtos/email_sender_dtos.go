package dtos

import (
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
)

type SendEmailRequest struct {
	From        string            `json:"from"`
	To          []string          `json:"to"`
	Subject     string            `json:"subject"`
	Bcc         []string          `json:"bcc,omitempty"`
	Cc          []string          `json:"cc,omitempty"`
	ReplyTo     []string          `json:"reply_to,omitempty"`
	HTML        string            `json:"html,omitempty"`
	Text        string            `json:"text,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	TopicID     string            `json:"topic_id,omitempty"`
	ScheduledAt string            `json:"scheduled_at,omitempty"`
	Attachments []types.EmailAttachment `json:"attachments,omitempty"`
	Tags        []types.EmailTag        `json:"tags,omitempty"`
	Template    *types.EmailTemplate    `json:"template,omitempty"`
}

type BatchEmailItem struct {
	From     string            `json:"from"`
	To       []string          `json:"to"`
	Subject  string            `json:"subject"`
	Bcc      []string          `json:"bcc,omitempty"`
	Cc       []string          `json:"cc,omitempty"`
	ReplyTo  []string          `json:"reply_to,omitempty"`
	HTML     string            `json:"html,omitempty"`
	Text     string            `json:"text,omitempty"`
	Headers  map[string]string `json:"headers,omitempty"`
	TopicID  string            `json:"topic_id,omitempty"`
	Tags     []types.EmailTag        `json:"tags,omitempty"`
	Template *types.EmailTemplate    `json:"template,omitempty"`
}

// SendEmailBulkRequest is a slice of BatchEmailItem. Max 100 items.
type SendEmailBulkRequest = []BatchEmailItem

type SendEmailResponse struct {
	ID string `json:"id"`
}

type SendEmailBulkResponse struct {
	Data []SendEmailResponse `json:"data"`
}
