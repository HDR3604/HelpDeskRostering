package email_test

import (
	"context"
	"os"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/joho/godotenv"
	"github.com/resend/resend-go/v2"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ResendIntegrationTestSuite struct {
	suite.Suite
	service interfaces.EmailSenderInterface
}

func TestResendIntegrationTestSuite(t *testing.T) {
	_ = godotenv.Load("../../../../../../.env.local")

	if os.Getenv("RESEND_API_KEY") == "" {
		t.Skip("RESEND_API_KEY not set, skipping integration tests")
	}
	suite.Run(t, new(ResendIntegrationTestSuite))
}

func (s *ResendIntegrationTestSuite) SetupSuite() {
	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	s.service = service.NewResendEmailSenderServiceWithClient(zap.NewNop(), client)
}

func (s *ResendIntegrationTestSuite) TestSend_Delivered() {
	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Integration Test - Delivered",
		HTML:    "<p>This is an integration test email.</p>",
	})

	s.NoError(err)
	s.NotEmpty(resp.ID)
}

func (s *ResendIntegrationTestSuite) TestSendBatch_Delivered() {
	resp, err := s.service.SendBatch(context.Background(), dtos.SendEmailBulkRequest{
		{
			From:    "onboarding@resend.dev",
			To:      []string{"delivered+batch1@resend.dev"},
			Subject: "Integration Test - Batch 1",
			HTML:    "<p>Batch email 1</p>",
		},
		{
			From:    "onboarding@resend.dev",
			To:      []string{"delivered+batch2@resend.dev"},
			Subject: "Integration Test - Batch 2",
			HTML:    "<p>Batch email 2</p>",
		},
	})

	s.NoError(err)
	s.Len(resp.Data, 2)
	s.NotEmpty(resp.Data[0].ID)
	s.NotEmpty(resp.Data[1].ID)
}
