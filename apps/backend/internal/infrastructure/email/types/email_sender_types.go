package types

type EmailAttachment struct {
	Content     string `json:"content,omitempty"`
	Filename    string `json:"filename,omitempty"`
	Path        string `json:"path,omitempty"`
	ContentType string `json:"content_type,omitempty"`
	ContentID   string `json:"content_id,omitempty"`
}

type EmailTag struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type EmailTemplate struct {
	ID        string         `json:"id"`
	Variables map[string]any `json:"variables,omitempty"`
}
