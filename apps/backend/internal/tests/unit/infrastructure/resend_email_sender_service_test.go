package infrastructure_test

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	"github.com/resend/resend-go/v2"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ResendEmailSenderServiceTestSuite struct {
	suite.Suite
	server  *httptest.Server
	mux     *http.ServeMux
	service interfaces.EmailSenderInterface
}

func TestResendEmailSenderServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ResendEmailSenderServiceTestSuite))
}

func (s *ResendEmailSenderServiceTestSuite) SetupTest() {
	s.mux = http.NewServeMux()
	s.server = httptest.NewServer(s.mux)

	serverURL, _ := url.Parse(s.server.URL)
	client := resend.NewClient("test-api-key")
	client.BaseURL = serverURL

	s.service = service.NewResendEmailSenderServiceWithClient(zap.NewNop(), client)
}

func (s *ResendEmailSenderServiceTestSuite) TearDownTest() {
	s.server.Close()
}

func (s *ResendEmailSenderServiceTestSuite) TestSend_Success() {
	s.mux.HandleFunc("/emails", func(w http.ResponseWriter, r *http.Request) {
		s.Equal(http.MethodPost, r.Method)
		s.Equal("application/json", r.Header.Get("Content-Type"))
		s.Equal("Bearer test-api-key", r.Header.Get("Authorization"))

		body, err := io.ReadAll(r.Body)
		s.Require().NoError(err)
		s.Contains(string(body), `"from":"onboarding@resend.dev"`)
		s.Contains(string(body), `"subject":"Test Subject"`)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `{"id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"}`)
	})

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test Subject",
		HTML:    "<p>Hello</p>",
	})

	s.NoError(err)
	s.Equal("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794", resp.ID)
}

func (s *ResendEmailSenderServiceTestSuite) TestSend_WithTags() {
	s.mux.HandleFunc("/emails", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		s.Contains(string(body), `"tags"`)
		s.Contains(string(body), `"category"`)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `{"id": "tag-test-id"}`)
	})

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test",
		HTML:    "<p>Hello</p>",
		Tags:    []types.EmailTag{{Name: "category", Value: "notification"}},
	})

	s.NoError(err)
	s.Equal("tag-test-id", resp.ID)
}

func (s *ResendEmailSenderServiceTestSuite) TestSend_APIError() {
	s.mux.HandleFunc("/emails", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = fmt.Fprint(w, `{"statusCode": 422, "name": "missing_required_field", "message": "Missing 'to' field"}`)
	})

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		Subject: "Test",
	})

	s.Nil(resp)
	s.Error(err)
}

func (s *ResendEmailSenderServiceTestSuite) TestSend_ConnectionFailure() {
	s.server.Close()

	resp, err := s.service.Send(context.Background(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test",
	})

	s.Nil(resp)
	s.Error(err)
}

func (s *ResendEmailSenderServiceTestSuite) TestSendBatch_Success() {
	s.mux.HandleFunc("/emails/batch", func(w http.ResponseWriter, r *http.Request) {
		s.Equal(http.MethodPost, r.Method)
		s.Equal("Bearer test-api-key", r.Header.Get("Authorization"))

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `{"data": [{"id": "id-001"}, {"id": "id-002"}]}`)
	})

	resp, err := s.service.SendBatch(context.Background(), dtos.SendEmailBulkRequest{
		{From: "onboarding@resend.dev", To: []string{"delivered+batch1@resend.dev"}, Subject: "Email 1", HTML: "<p>1</p>"},
		{From: "onboarding@resend.dev", To: []string{"delivered+batch2@resend.dev"}, Subject: "Email 2", HTML: "<p>2</p>"},
	})

	s.NoError(err)
	s.Len(resp.Data, 2)
	s.Equal("id-001", resp.Data[0].ID)
	s.Equal("id-002", resp.Data[1].ID)
}

func (s *ResendEmailSenderServiceTestSuite) TestSendBatch_APIError() {
	s.mux.HandleFunc("/emails/batch", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = fmt.Fprint(w, `{"statusCode": 429, "name": "rate_limit_exceeded", "message": "Too many requests"}`)
	})

	resp, err := s.service.SendBatch(context.Background(), dtos.SendEmailBulkRequest{
		{From: "onboarding@resend.dev", To: []string{"delivered+batch1@resend.dev"}, Subject: "Email 1"},
	})

	s.Nil(resp)
	s.Error(err)
}
