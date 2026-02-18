package templates

import (
	"embed"
	"fmt"
	"strings"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
)

//go:embed *.html
var templateFS embed.FS

type TemplateID = string

const (
	TemplateID_ThankYou             TemplateID = "thankyou"
	TemplateID_Welcome              TemplateID = "welcome"
	TemplateID_RosterNotification   TemplateID = "roster_notification"
	TemplateID_EmailVerification    TemplateID = "email_verification"
)

var templateFiles = map[TemplateID]string{
	TemplateID_ThankYou:            "thankyou.html",
	TemplateID_Welcome:             "welcome.html",
	TemplateID_RosterNotification:  "roster_notification.html",
	TemplateID_EmailVerification:   "email_verification.html",
}

type ShiftEntry struct {
	Day  string
	Date string
	Time string
}

func BuildShiftRows(shifts []ShiftEntry) string {
	var sb strings.Builder
	for _, s := range shifts {
		sb.WriteString(`<tr>`)
		sb.WriteString(`<td style="padding:10px 16px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb">`)
		sb.WriteString(s.Day)
		sb.WriteString(`</td>`)
		sb.WriteString(`<td style="padding:10px 16px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb">`)
		sb.WriteString(s.Date)
		sb.WriteString(`</td>`)
		sb.WriteString(`<td style="padding:10px 16px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb">`)
		sb.WriteString(s.Time)
		sb.WriteString(`</td>`)
		sb.WriteString(`</tr>`)
	}
	return sb.String()
}

func Render(tmpl types.EmailTemplate) (string, error) {
	filename, ok := templateFiles[tmpl.ID]
	if !ok {
		return "", fmt.Errorf("unknown template ID: %s", tmpl.ID)
	}

	content, err := templateFS.ReadFile(filename)
	if err != nil {
		return "", fmt.Errorf("failed to read template %s: %w", tmpl.ID, err)
	}

	html := string(content)
	for key, val := range tmpl.Variables {
		placeholder := "{{{" + key + "}}}"
		html = strings.ReplaceAll(html, placeholder, fmt.Sprintf("%v", val))
	}

	return html, nil
}
