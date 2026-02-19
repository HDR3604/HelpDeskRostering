package email_test

import (
	"context"
	"net/http"
	"os"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/templates"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
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

func (s *MailpitIntegrationTestSuite) TestSend_ThankYouTemplate() {
	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_ThankYou,
		Variables: map[string]any{
			"STUDENT_NAME":  "John Doe",
			"CONTACT_EMAIL": "helpdesk@dcit.uwi.edu",
		},
	})
	s.Require().NoError(err)

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "HelpDesk <noreply@helpdesk.dev>",
		To:      []string{"john.doe@example.com"},
		Subject: "Thank You for Your Application",
		HTML:    html,
	})

	s.NoError(err)
	s.NotEmpty(resp.ID)
}

func (s *MailpitIntegrationTestSuite) TestSend_WelcomeTemplate() {
	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_Welcome,
		Variables: map[string]any{
			"STUDENT_NAME":   "Jane Smith",
			"CONTACT_EMAIL":  "helpdesk@dcit.uwi.edu",
			"ONBOARDING_URL": "https://helpdesk.dcit.uwi.edu/onboarding/abc123",
		},
	})
	s.Require().NoError(err)

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "HelpDesk <noreply@helpdesk.dev>",
		To:      []string{"jane.smith@example.com"},
		Subject: "Welcome to the DCIT Help Desk",
		HTML:    html,
	})

	s.NoError(err)
	s.NotEmpty(resp.ID)
}

func (s *MailpitIntegrationTestSuite) TestSend_EmailVerificationTemplate() {
	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_EmailVerification,
		Variables: map[string]any{
			"USER_EMAIL":       "student@my.uwi.edu",
			"VERIFICATION_URL": "https://helpdesk.dcit.uwi.edu/verify-email?token=abc123def456",
		},
	})
	s.Require().NoError(err)

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "HelpDesk <noreply@helpdesk.dev>",
		To:      []string{"student@my.uwi.edu"},
		Subject: "Verify Your Email Address",
		HTML:    html,
	})

	s.NoError(err)
	s.NotEmpty(resp.ID)
}

func (s *MailpitIntegrationTestSuite) TestSend_RosterNotificationTemplate() {
	rows := templates.BuildShiftRows([]templates.ShiftEntry{
		{Day: "Monday", Date: "March 3, 2026", Time: "9:00 AM - 1:00 PM"},
		{Day: "Wednesday", Date: "March 5, 2026", Time: "1:00 PM - 5:00 PM"},
		{Day: "Friday", Date: "March 7, 2026", Time: "9:00 AM - 1:00 PM"},
	})

	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_RosterNotification,
		Variables: map[string]any{
			"STUDENT_NAME":  "Alice Johnson",
			"SCHEDULE_NAME": "Week 5 Schedule",
			"SHIFT_ROWS":    rows,
			"CONTACT_EMAIL": "helpdesk@dcit.uwi.edu",
		},
	})
	s.Require().NoError(err)

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "HelpDesk <noreply@helpdesk.dev>",
		To:      []string{"alice.johnson@example.com"},
		Subject: "Your Shift Schedule - Week 5",
		HTML:    html,
	})

	s.NoError(err)
	s.NotEmpty(resp.ID)
}

func (s *MailpitIntegrationTestSuite) TestSendBatch_RosterNotifications() {
	rows1 := templates.BuildShiftRows([]templates.ShiftEntry{
		{Day: "Tuesday", Date: "March 4, 2026", Time: "1:00 PM - 5:00 PM"},
		{Day: "Thursday", Date: "March 6, 2026", Time: "9:00 AM - 1:00 PM"},
	})

	rows2 := templates.BuildShiftRows([]templates.ShiftEntry{
		{Day: "Monday", Date: "March 3, 2026", Time: "9:00 AM - 1:00 PM"},
		{Day: "Wednesday", Date: "March 5, 2026", Time: "1:00 PM - 5:00 PM"},
		{Day: "Friday", Date: "March 7, 2026", Time: "9:00 AM - 1:00 PM"},
	})

	html1, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_RosterNotification,
		Variables: map[string]any{
			"STUDENT_NAME":  "Bob Martin",
			"SCHEDULE_NAME": "Week 5 Schedule",
			"SHIFT_ROWS":    rows1,
			"CONTACT_EMAIL": "helpdesk@dcit.uwi.edu",
		},
	})
	s.Require().NoError(err)

	html2, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_RosterNotification,
		Variables: map[string]any{
			"STUDENT_NAME":  "Carol White",
			"SCHEDULE_NAME": "Week 5 Schedule",
			"SHIFT_ROWS":    rows2,
			"CONTACT_EMAIL": "helpdesk@dcit.uwi.edu",
		},
	})
	s.Require().NoError(err)

	resp, err := s.service.SendBatch(context.Background(), dtos.SendEmailBulkRequest{
		{
			From:    "HelpDesk <noreply@helpdesk.dev>",
			To:      []string{"bob.martin@example.com"},
			Subject: "Your Shift Schedule - Week 5",
			HTML:    html1,
		},
		{
			From:    "HelpDesk <noreply@helpdesk.dev>",
			To:      []string{"carol.white@example.com"},
			Subject: "Your Shift Schedule - Week 5",
			HTML:    html2,
		},
	})

	s.NoError(err)
	s.Len(resp.Data, 2)
	s.NotEmpty(resp.Data[0].ID)
	s.NotEmpty(resp.Data[1].ID)
}
