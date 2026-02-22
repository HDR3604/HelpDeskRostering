package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
)

type MockEmailSender struct {
	SendFn      func(ctx context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error)
	SendBatchFn func(ctx context.Context, req dtos.SendEmailBulkRequest) (*dtos.SendEmailBulkResponse, error)
}

var _ interfaces.EmailSenderInterface = (*MockEmailSender)(nil)

func (m *MockEmailSender) Send(ctx context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
	return m.SendFn(ctx, req)
}

func (m *MockEmailSender) SendBatch(ctx context.Context, req dtos.SendEmailBulkRequest) (*dtos.SendEmailBulkResponse, error) {
	return m.SendBatchFn(ctx, req)
}
