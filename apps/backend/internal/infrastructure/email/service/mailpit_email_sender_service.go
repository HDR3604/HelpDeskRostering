package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"os"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"go.uber.org/zap"
)

var _ interfaces.EmailSenderInterface = (*MailpitEmailSenderService)(nil)

type MailpitEmailSenderService struct {
	logger  *zap.Logger
	baseurl string
}

func NewMailpitEmailSenderService(logger *zap.Logger) interfaces.EmailSenderInterface {
	url := os.Getenv("MAILPIT_URL")
	if url == "" {
		panic("MAILPIT_URL is not set in the current environment")
	}

	return &MailpitEmailSenderService{
		logger:  logger,
		baseurl: url,
	}
}

// Mailpit-specific request types for its /api/v1/send endpoint.
type mailpitAddress struct {
	Name  string `json:"Name"`
	Email string `json:"Email"`
}

type mailpitSendRequest struct {
	From    mailpitAddress    `json:"From"`
	To      []mailpitAddress  `json:"To"`
	Cc      []mailpitAddress  `json:"Cc,omitempty"`
	Bcc     []mailpitAddress  `json:"Bcc,omitempty"`
	ReplyTo []mailpitAddress  `json:"ReplyTo,omitempty"`
	Subject string            `json:"Subject"`
	Text    string            `json:"Text,omitempty"`
	HTML    string            `json:"HTML,omitempty"`
	Headers map[string]string `json:"Headers,omitempty"`
}

type mailpitSendResponse struct {
	ID string `json:"ID"`
}

func parseAddress(raw string) mailpitAddress {
	addr, err := mail.ParseAddress(raw)
	if err != nil {
		return mailpitAddress{Email: raw}
	}
	return mailpitAddress{Name: addr.Name, Email: addr.Address}
}

func parseAddresses(raw []string) []mailpitAddress {
	if len(raw) == 0 {
		return nil
	}
	addrs := make([]mailpitAddress, len(raw))
	for i, r := range raw {
		addrs[i] = parseAddress(r)
	}
	return addrs
}

func (s *MailpitEmailSenderService) Send(ctx context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
	if err := resolveTemplate(&req); err != nil {
		return nil, err
	}

	mailpitReq := mailpitSendRequest{
		From:    parseAddress(req.From),
		To:      parseAddresses(req.To),
		Cc:      parseAddresses(req.Cc),
		Bcc:     parseAddresses(req.Bcc),
		ReplyTo: parseAddresses(req.ReplyTo),
		Subject: req.Subject,
		Text:    req.Text,
		HTML:    req.HTML,
		Headers: req.Headers,
	}

	body, err := json.Marshal(mailpitReq)
	if err != nil {
		s.logger.Error("failed to marshal mailpit request", zap.Error(err))
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseurl+"/api/v1/send", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		s.logger.Error("failed to send mailpit request", zap.Error(err))
		return nil, fmt.Errorf("mailpit unavailable: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		s.logger.Error("mailpit rejected request",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response_body", string(respBody)),
		)
		return nil, fmt.Errorf("mailpit error: status %d: %s", resp.StatusCode, string(respBody))
	}

	var result mailpitSendResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		s.logger.Error("failed to decode mailpit response", zap.Error(err))
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &dtos.SendEmailResponse{ID: result.ID}, nil
}

func (s *MailpitEmailSenderService) SendBatch(ctx context.Context, req dtos.SendEmailBulkRequest) (*dtos.SendEmailBulkResponse, error) {
	responses := make([]dtos.SendEmailResponse, 0, len(req))

	for _, item := range req {
		resp, err := s.Send(ctx, dtos.SendEmailRequest{
			From:    item.From,
			To:      item.To,
			Subject: item.Subject,
			Bcc:     item.Bcc,
			Cc:      item.Cc,
			ReplyTo: item.ReplyTo,
			HTML:    item.HTML,
			Text:    item.Text,
			Headers: item.Headers,
		})
		if err != nil {
			return nil, fmt.Errorf("batch item failed: %w", err)
		}
		responses = append(responses, *resp)
	}

	return &dtos.SendEmailBulkResponse{Data: responses}, nil
}
