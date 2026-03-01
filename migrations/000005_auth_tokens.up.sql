-- Add verified timestamp to users (NULL = unverified)
ALTER TABLE "auth"."users"
    ADD COLUMN "email_verified_at" timestamptz;

-- Auth tokens table (supports email verification, password reset, etc.)
CREATE TABLE "auth"."auth_tokens" (
    "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    uuid NOT NULL,
    "token_hash" varchar(64) NOT NULL,
    "type"       varchar(30) NOT NULL DEFAULT 'email_verification',
    "expires_at" timestamptz NOT NULL,
    "used_at"    timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("user_id") ON DELETE CASCADE
);

CREATE INDEX idx_auth_tokens_token_hash ON "auth"."auth_tokens" ("token_hash");
CREATE INDEX idx_auth_tokens_user_id ON "auth"."auth_tokens" ("user_id");
CREATE INDEX idx_auth_tokens_type ON "auth"."auth_tokens" ("type");

-- RLS: internal only (system operations via InSystemTx)
ALTER TABLE "auth"."auth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."auth_tokens" FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "auth"."auth_tokens" TO internal;

CREATE POLICY internal_bypass_auth_tokens ON "auth"."auth_tokens"
    TO internal USING (TRUE) WITH CHECK (TRUE);
