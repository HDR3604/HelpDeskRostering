package errors

import "fmt"

type EmailSenderErrorType string

const (
	EmailSenderErrorType_InvalidIdempotencyKey    EmailSenderErrorType = "invalid_idempotency_key"
	EmailSenderErrorType_ValidationError          EmailSenderErrorType = "validation_error"
	EmailSenderErrorType_MissingAPIKey            EmailSenderErrorType = "missing_api_key"
	EmailSenderErrorType_RestrictedAPIKey         EmailSenderErrorType = "restricted_api_key"
	EmailSenderErrorType_InvalidAPIKey            EmailSenderErrorType = "invalid_api_key"
	EmailSenderErrorType_NotFound                 EmailSenderErrorType = "not_found"
	EmailSenderErrorType_MethodNotAllowed         EmailSenderErrorType = "method_not_allowed"
	EmailSenderErrorType_InvalidIdempotentRequest EmailSenderErrorType = "invalid_idempotent_request"
	EmailSenderErrorType_ConcurrentIdempotent     EmailSenderErrorType = "concurrent_idempotent_requests"
	EmailSenderErrorType_InvalidAttachment        EmailSenderErrorType = "invalid_attachment"
	EmailSenderErrorType_InvalidFromAddress       EmailSenderErrorType = "invalid_from_address"
	EmailSenderErrorType_InvalidAccess            EmailSenderErrorType = "invalid_access"
	EmailSenderErrorType_InvalidParameter         EmailSenderErrorType = "invalid_parameter"
	EmailSenderErrorType_InvalidRegion            EmailSenderErrorType = "invalid_region"
	EmailSenderErrorType_MissingRequiredField     EmailSenderErrorType = "missing_required_field"
	EmailSenderErrorType_MonthlyQuotaExceeded     EmailSenderErrorType = "monthly_quota_exceeded"
	EmailSenderErrorType_DailyQuotaExceeded       EmailSenderErrorType = "daily_quota_exceeded"
	EmailSenderErrorType_RateLimitExceeded        EmailSenderErrorType = "rate_limit_exceeded"
	EmailSenderErrorType_SecurityError            EmailSenderErrorType = "security_error"
	EmailSenderErrorType_ApplicationError         EmailSenderErrorType = "application_error"
	EmailSenderErrorType_InternalServerError      EmailSenderErrorType = "internal_server_error"
)

type EmailSenderError struct {
	StatusCode int                  `json:"statusCode"`
	Type       EmailSenderErrorType `json:"name"`
	Message    string               `json:"message"`
}

func (e *EmailSenderError) Error() string {
	return fmt.Sprintf("resend error [%d] %s: %s", e.StatusCode, e.Type, e.Message)
}
