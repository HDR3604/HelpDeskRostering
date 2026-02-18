package infrastructure_test

import (
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/templates"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
	"github.com/stretchr/testify/suite"
)

type EmailTemplateRendererTestSuite struct {
	suite.Suite
}

func TestEmailTemplateRendererTestSuite(t *testing.T) {
	suite.Run(t, new(EmailTemplateRendererTestSuite))
}

func (s *EmailTemplateRendererTestSuite) TestRender_ThankYou() {
	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_ThankYou,
		Variables: map[string]any{
			"STUDENT_NAME":  "John Doe",
			"CONTACT_EMAIL": "helpdesk@dcit.uwi.edu",
		},
	})

	s.NoError(err)
	s.Contains(html, "John Doe")
	s.Contains(html, "helpdesk@dcit.uwi.edu")
	s.NotContains(html, "{{{STUDENT_NAME}}}")
	s.NotContains(html, "{{{CONTACT_EMAIL}}}")
}

func (s *EmailTemplateRendererTestSuite) TestRender_Welcome() {
	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_Welcome,
		Variables: map[string]any{
			"STUDENT_NAME":   "Jane Smith",
			"CONTACT_EMAIL":  "helpdesk@dcit.uwi.edu",
			"ONBOARDING_URL": "https://helpdesk.dcit.uwi.edu/onboarding/abc123",
		},
	})

	s.NoError(err)
	s.Contains(html, "Jane Smith")
	s.Contains(html, "helpdesk@dcit.uwi.edu")
	s.Contains(html, "Welcome to the DCIT Help Desk")
	s.Contains(html, "https://helpdesk.dcit.uwi.edu/onboarding/abc123")
	s.Contains(html, "Complete Onboarding")
	s.NotContains(html, "{{{STUDENT_NAME}}}")
	s.NotContains(html, "{{{CONTACT_EMAIL}}}")
	s.NotContains(html, "{{{ONBOARDING_URL}}}")
}

func (s *EmailTemplateRendererTestSuite) TestRender_RosterNotification() {
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

	s.NoError(err)
	s.Contains(html, "Alice Johnson")
	s.Contains(html, "Week 5 Schedule")
	s.Contains(html, "Monday")
	s.Contains(html, "March 3, 2026")
	s.Contains(html, "9:00 AM - 1:00 PM")
	s.Contains(html, "Wednesday")
	s.Contains(html, "March 5, 2026")
	s.Contains(html, "Friday")
	s.Contains(html, "helpdesk@dcit.uwi.edu")
	s.NotContains(html, "{{{STUDENT_NAME}}}")
	s.NotContains(html, "{{{SCHEDULE_NAME}}}")
	s.NotContains(html, "{{{SHIFT_ROWS}}}")
	s.NotContains(html, "{{{CONTACT_EMAIL}}}")
}

func (s *EmailTemplateRendererTestSuite) TestBuildShiftRows() {
	rows := templates.BuildShiftRows([]templates.ShiftEntry{
		{Day: "Monday", Date: "March 3", Time: "9:00 AM"},
		{Day: "Tuesday", Date: "March 4", Time: "1:00 PM"},
	})

	s.Contains(rows, "Monday")
	s.Contains(rows, "March 3")
	s.Contains(rows, "9:00 AM")
	s.Contains(rows, "Tuesday")
	s.Contains(rows, "March 4")
	s.Contains(rows, "1:00 PM")
	s.Contains(rows, "<tr>")
	s.Contains(rows, "<td")
}

func (s *EmailTemplateRendererTestSuite) TestRender_UnknownTemplate() {
	_, err := templates.Render(types.EmailTemplate{
		ID: "nonexistent",
	})

	s.Error(err)
	s.Contains(err.Error(), "unknown template ID")
}

func (s *EmailTemplateRendererTestSuite) TestRender_MissingVariable_LeavesPlaceholder() {
	html, err := templates.Render(types.EmailTemplate{
		ID: templates.TemplateID_ThankYou,
		Variables: map[string]any{
			"STUDENT_NAME": "John Doe",
		},
	})

	s.NoError(err)
	s.Contains(html, "John Doe")
	s.Contains(html, "{{{CONTACT_EMAIL}}}")
}
