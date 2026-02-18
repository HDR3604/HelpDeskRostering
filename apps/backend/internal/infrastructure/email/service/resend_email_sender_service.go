package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"strings"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/resend/resend-go/v2"
	"go.uber.org/zap"
)

var _ interfaces.EmailSenderInterface = (*ResendEmailSenderService)(nil)

type ResendEmailSenderService struct {
	logger *zap.Logger
	client *resend.Client
}

func NewResendEmailSenderService(logger *zap.Logger) interfaces.EmailSenderInterface {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		panic("RESEND_API_KEY is not set in the current environment")
	}

	return &ResendEmailSenderService{
		logger: logger,
		client: resend.NewClient(apiKey),
	}
}

func NewResendEmailSenderServiceWithClient(logger *zap.Logger, client *resend.Client) interfaces.EmailSenderInterface {
	return &ResendEmailSenderService{
		logger: logger,
		client: client,
	}
}

func (s *ResendEmailSenderService) Send(ctx context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
	if err := resolveTemplate(&req); err != nil {
		return nil, err
	}

	sdkReq := toResendRequest(req.From, req.To, req.Subject, req.Cc, req.Bcc, req.ReplyTo, req.HTML, req.Text, req.ScheduledAt, req.Tags, req.Attachments)

	resp, err := s.client.Emails.SendWithContext(ctx, sdkReq)
	if err != nil {
		s.logger.Error("resend send failed", zap.Error(err))
		return nil, fmt.Errorf("resend send failed: %w", err)
	}

	return &dtos.SendEmailResponse{ID: resp.Id}, nil
}

func (s *ResendEmailSenderService) SendBatch(ctx context.Context, req dtos.SendEmailBulkRequest) (*dtos.SendEmailBulkResponse, error) {
	sdkReqs := make([]*resend.SendEmailRequest, len(req))
	for i, item := range req {
		sdkReqs[i] = toResendRequest(item.From, item.To, item.Subject, item.Cc, item.Bcc, item.ReplyTo, item.HTML, item.Text, "", item.Tags, nil)
	}

	resp, err := s.client.Batch.SendWithContext(ctx, sdkReqs)
	if err != nil {
		s.logger.Error("resend batch send failed", zap.Error(err))
		return nil, fmt.Errorf("resend batch send failed: %w", err)
	}

	data := make([]dtos.SendEmailResponse, len(resp.Data))
	for i, item := range resp.Data {
		data[i] = dtos.SendEmailResponse{ID: item.Id}
	}

	return &dtos.SendEmailBulkResponse{Data: data}, nil
}

func toResendRequest(
	from string, to []string, subject string,
	cc, bcc, replyTo []string,
	html, text, scheduledAt string,
	tags []types.EmailTag, attachments []types.EmailAttachment,
) *resend.SendEmailRequest {
	req := &resend.SendEmailRequest{
		From:    from,
		To:      to,
		Subject: subject,
		Html:    html,
		Text:    text,
		Cc:      cc,
		Bcc:     bcc,
	}

	if len(replyTo) > 0 {
		req.ReplyTo = strings.Join(replyTo, ", ")
	}

	if scheduledAt != "" {
		req.ScheduledAt = scheduledAt
	}

	if len(tags) > 0 {
		req.Tags = make([]resend.Tag, len(tags))
		for i, t := range tags {
			req.Tags[i] = resend.Tag{Name: t.Name, Value: t.Value}
		}
	}

	if len(attachments) > 0 {
		req.Attachments = make([]*resend.Attachment, len(attachments))
		for i, a := range attachments {
			var content []byte
			if a.Content != "" {
				content, _ = base64.StdEncoding.DecodeString(a.Content)
			}
			req.Attachments[i] = &resend.Attachment{
				Content:     content,
				Filename:    a.Filename,
				Path:        a.Path,
				ContentType: a.ContentType,
				ContentId:   a.ContentID,
			}
		}
	}

	return req
}
