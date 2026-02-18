package service

import (
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/templates"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
)

func resolveTemplate(req *dtos.SendEmailRequest) error {
	if req.Template == nil || req.HTML != "" {
		return nil
	}

	html, err := templates.Render(*req.Template)
	if err != nil {
		return fmt.Errorf("template render failed: %w", err)
	}

	req.HTML = html
	return nil
}
