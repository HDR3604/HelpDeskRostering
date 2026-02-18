# Email Infrastructure

Sends transactional emails with two provider implementations and an embedded HTML template system.

## Architecture

```
email/
├── interfaces/          # EmailSenderInterface
├── service/             # Resend (production) & Mailpit (local dev) implementations
├── templates/           # Embedded HTML templates + renderer
├── types/               # Shared types (EmailAttachment, EmailTag, EmailTemplate)
│   └── dtos/            # Request/response DTOs
└── errors/              # Typed error constants
```

## Quick Start

The service is wired automatically in `application/app.go` — Resend in production, Mailpit otherwise.

### Sending with a template (recommended)

Set the `Template` field and the service renders it automatically:

```go
resp, err := emailSvc.Send(ctx, dtos.SendEmailRequest{
    From:    "HelpDesk <noreply@helpdesk.dev>",
    To:      []string{"student@example.com"},
    Subject: "Welcome to the DCIT Help Desk",
    Template: &types.EmailTemplate{
        ID: templates.TemplateID_Welcome,
        Variables: map[string]any{
            "STUDENT_NAME":   "Jane Smith",
            "ONBOARDING_URL": "https://helpdesk.dcit.uwi.edu/onboarding/abc123",
            "CONTACT_EMAIL":  "helpdesk@dcit.uwi.edu",
        },
    },
})
```

### Sending with raw HTML

```go
resp, err := emailSvc.Send(ctx, dtos.SendEmailRequest{
    From:    "HelpDesk <noreply@helpdesk.dev>",
    To:      []string{"student@example.com"},
    Subject: "Custom Email",
    HTML:    "<p>Hello world</p>",
})
```

> If both `HTML` and `Template` are set, `HTML` takes precedence.

### Roster notification with shift table

Use `BuildShiftRows` to generate the table rows, then pass them as a variable:

```go
rows := templates.BuildShiftRows([]templates.ShiftEntry{
    {Day: "Monday",    Date: "March 3, 2026", Time: "9:00 AM - 1:00 PM"},
    {Day: "Wednesday", Date: "March 5, 2026", Time: "1:00 PM - 5:00 PM"},
})

resp, err := emailSvc.Send(ctx, dtos.SendEmailRequest{
    From:    "HelpDesk <noreply@helpdesk.dev>",
    To:      []string{"student@example.com"},
    Subject: "Your Shift Schedule - Week 5",
    Template: &types.EmailTemplate{
        ID: templates.TemplateID_RosterNotification,
        Variables: map[string]any{
            "STUDENT_NAME":  "Alice Johnson",
            "SCHEDULE_NAME": "Week 5 Schedule",
            "SHIFT_ROWS":    rows,
            "CONTACT_EMAIL": "helpdesk@dcit.uwi.edu",
        },
    },
})
```

### Batch sending

```go
resp, err := emailSvc.SendBatch(ctx, dtos.SendEmailBulkRequest{
    {From: "...", To: []string{"..."}, Subject: "...", HTML: "..."},
    {From: "...", To: []string{"..."}, Subject: "...", HTML: "..."},
})
// resp.Data[0].ID, resp.Data[1].ID
```

## Templates

All templates are embedded at compile time via `go:embed`. Variables use `{{{VAR_NAME}}}` triple-brace syntax.

| Template ID                       | File                       | Variables                                                        |
|-----------------------------------|----------------------------|------------------------------------------------------------------|
| `TemplateID_ThankYou`             | `thankyou.html`            | `STUDENT_NAME`, `CONTACT_EMAIL`                                  |
| `TemplateID_Welcome`              | `welcome.html`             | `STUDENT_NAME`, `CONTACT_EMAIL`, `ONBOARDING_URL`                |
| `TemplateID_RosterNotification`   | `roster_notification.html` | `STUDENT_NAME`, `SCHEDULE_NAME`, `SHIFT_ROWS`, `CONTACT_EMAIL`   |

### Adding a new template

1. Create `templates/my_template.html` using `{{{VAR}}}` placeholders
2. Add a `TemplateID_MyTemplate` constant in `templates/renderer.go`
3. Add the mapping in `templateFiles`

## Environment Variables

| Variable         | Required   | Description                       |
|------------------|------------|-----------------------------------|
| `RESEND_API_KEY` | Production | Resend API key                    |
| `MAILPIT_URL`    | Local dev  | Mailpit base URL (default: n/a)   |

## Testing

```bash
# Unit tests (template renderer + both service mocks)
go test ./internal/tests/unit/infrastructure/ -v

# Integration tests (requires Mailpit running / RESEND_API_KEY set)
go test ./internal/tests/integration/email/ -v
```
