package infrastructure_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type MailpitEmailSenderServiceTestSuite struct {
	suite.Suite
	server  *httptest.Server
	mux     *http.ServeMux
	service interfaces.EmailSenderInterface
}

func TestMailpitEmailSenderServiceTestSuite(t *testing.T) {
	suite.Run(t, new(MailpitEmailSenderServiceTestSuite))
}

func (s *MailpitEmailSenderServiceTestSuite) SetupTest() {
	s.mux = http.NewServeMux()
	s.server = httptest.NewServer(s.mux)

	s.Require().NoError(os.Setenv("MAILPIT_URL", s.server.URL))
	s.service = service.NewMailpitEmailSenderService(zap.NewNop())
}

func (s *MailpitEmailSenderServiceTestSuite) TearDownTest() {
	s.server.Close()
}

func (s *MailpitEmailSenderServiceTestSuite) TestSend_Success() {
	s.mux.HandleFunc("/api/v1/send", func(w http.ResponseWriter, r *http.Request) {
		s.Equal(http.MethodPost, r.Method)
		s.Equal("application/json", r.Header.Get("Content-Type"))

		body, err := io.ReadAll(r.Body)
		s.Require().NoError(err)

		var req map[string]any
		s.Require().NoError(json.Unmarshal(body, &req))
		s.Equal("Test Subject", req["Subject"])

		from := req["From"].(map[string]any)
		s.Equal("onboarding@resend.dev", from["Address"])

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `{"ID": "msg-001"}`)
	})

	resp, err := s.service.Send(s.T().Context(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test Subject",
		HTML:    "<p>Hello</p>",
	})

	s.NoError(err)
	s.Equal("msg-001", resp.ID)
}

func (s *MailpitEmailSenderServiceTestSuite) TestSend_ParsesFriendlyName() {
	s.mux.HandleFunc("/api/v1/send", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		var req map[string]any
		s.Require().NoError(json.Unmarshal(body, &req))

		from := req["From"].(map[string]any)
		s.Equal("Sender Name", from["Name"])
		s.Equal("onboarding@resend.dev", from["Address"])

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `{"ID": "msg-002"}`)
	})

	resp, err := s.service.Send(s.T().Context(), dtos.SendEmailRequest{
		From:    "Sender Name <onboarding@resend.dev>",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test",
	})

	s.NoError(err)
	s.Equal("msg-002", resp.ID)
}

func (s *MailpitEmailSenderServiceTestSuite) TestSend_ServerError() {
	s.mux.HandleFunc("/api/v1/send", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = fmt.Fprint(w, `internal error`)
	})

	resp, err := s.service.Send(s.T().Context(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test",
	})

	s.Nil(resp)
	s.Error(err)
	s.Contains(err.Error(), "mailpit error")
}

func (s *MailpitEmailSenderServiceTestSuite) TestSend_ConnectionFailure() {
	s.server.Close()

	resp, err := s.service.Send(s.T().Context(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test",
	})

	s.Nil(resp)
	s.Error(err)
	s.Contains(err.Error(), "mailpit unavailable")
}

func (s *MailpitEmailSenderServiceTestSuite) TestSend_MalformedResponse() {
	s.mux.HandleFunc("/api/v1/send", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, `not valid json`)
	})

	resp, err := s.service.Send(s.T().Context(), dtos.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{"delivered@resend.dev"},
		Subject: "Test",
	})

	s.Nil(resp)
	s.Error(err)
	s.Contains(err.Error(), "failed to decode response")
}

func (s *MailpitEmailSenderServiceTestSuite) TestSendBatch_Success() {
	callCount := 0
	s.mux.HandleFunc("/api/v1/send", func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintf(w, `{"ID": "msg-%03d"}`, callCount)
	})

	resp, err := s.service.SendBatch(s.T().Context(), dtos.SendEmailBulkRequest{
		{From: "onboarding@resend.dev", To: []string{"delivered+batch1@resend.dev"}, Subject: "Email 1"},
		{From: "onboarding@resend.dev", To: []string{"delivered+batch2@resend.dev"}, Subject: "Email 2"},
	})

	s.NoError(err)
	s.Len(resp.Data, 2)
	s.Equal("msg-001", resp.Data[0].ID)
	s.Equal("msg-002", resp.Data[1].ID)
}

func (s *MailpitEmailSenderServiceTestSuite) TestSendBatch_FailsOnError() {
	callCount := 0
	s.mux.HandleFunc("/api/v1/send", func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount == 2 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintf(w, `{"ID": "msg-%03d"}`, callCount)
	})

	resp, err := s.service.SendBatch(s.T().Context(), dtos.SendEmailBulkRequest{
		{From: "onboarding@resend.dev", To: []string{"delivered+batch1@resend.dev"}, Subject: "Email 1"},
		{From: "onboarding@resend.dev", To: []string{"delivered+batch2@resend.dev"}, Subject: "Email 2"},
	})

	s.Nil(resp)
	s.Error(err)
	s.Contains(err.Error(), "batch item failed")
}
