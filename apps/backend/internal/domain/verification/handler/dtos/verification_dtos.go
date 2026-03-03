package dtos

type SendCodeRequest struct {
	Email string `json:"email"`
}

type VerifyCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type VerifyCodeResponse struct {
	Verified bool `json:"verified"`
}
