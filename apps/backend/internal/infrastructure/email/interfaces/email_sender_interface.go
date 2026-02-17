package interfaces

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
)

type EmailSenderInterface interface {
	Send(ctx context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error)
	SendBatch(ctx context.Context, req dtos.SendEmailBulkRequest) (*dtos.SendEmailBulkResponse, error)
}
