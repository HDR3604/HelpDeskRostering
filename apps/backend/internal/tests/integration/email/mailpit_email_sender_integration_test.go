package email_test

import (
	"context"
	"net/http"
	"os"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type MailpitIntegrationTestSuite struct {
	suite.Suite
	service interfaces.EmailSenderInterface
}

func TestMailpitIntegrationTestSuite(t *testing.T) {
	_ = godotenv.Load("../../../../../../.env.local")

	mailpitURL := os.Getenv("MAILPIT_URL")
	if mailpitURL == "" {
		mailpitURL = "http://localhost:8025"
		os.Setenv("MAILPIT_URL", mailpitURL)
	}

	resp, err := http.Get(mailpitURL + "/api/v1/info")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Skip("Mailpit not available, skipping integration tests")
	}
	resp.Body.Close()

	suite.Run(t, new(MailpitIntegrationTestSuite))
}

func (s *MailpitIntegrationTestSuite) SetupSuite() {
	s.service = service.NewMailpitEmailSenderService(zap.NewNop())
}

func (s *MailpitIntegrationTestSuite) TestSend() {
	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "HelpDesk <noreply@helpdesk.dev>",
		To:      []string{"delivered@resend.dev"},
		Subject: "Mailpit Integration Test",
		HTML:    "<h1>Hello</h1><p>This is a test email from Mailpit.</p>",
	})

	s.NoError(err)
	s.NotEmpty(resp.ID)
}

func (s *MailpitIntegrationTestSuite) TestSendBatch() {
	resp, err := s.service.SendBatch(context.Background(), dtos.SendEmailBulkRequest{
		{
			From:    "HelpDesk <noreply@helpdesk.dev>",
			To:      []string{"delivered+batch1@resend.dev"},
			Subject: "Mailpit Batch Test 1",
			HTML:    "<p>Batch email 1</p>",
		},
		{
			From:    "HelpDesk <noreply@helpdesk.dev>",
			To:      []string{"delivered+batch2@resend.dev"},
			Subject: "Mailpit Batch Test 2",
			HTML:    "<p>Batch email 2</p>",
		},
	})

	s.NoError(err)
	s.Len(resp.Data, 2)
	s.NotEmpty(resp.Data[0].ID)
	s.NotEmpty(resp.Data[1].ID)
}
