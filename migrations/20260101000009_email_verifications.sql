-- +goose Up
CREATE TABLE public.email_verifications (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    email       text        NOT NULL,
    code_hash   varchar(64) NOT NULL,
    expires_at  timestamptz NOT NULL,
    verified_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX idx_email_verifications_email ON public.email_verifications (email);

-- RLS: internal only (system operations via InSystemTx)
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_verifications TO internal;

CREATE POLICY internal_bypass_email_verifications ON public.email_verifications
    TO internal USING (TRUE) WITH CHECK (TRUE);

-- +goose Down
DROP TABLE IF EXISTS public.email_verifications;
