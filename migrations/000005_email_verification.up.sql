-- Add verified timestamp to users (NULL = unverified)
ALTER TABLE "auth"."users"
    ADD COLUMN "email_verified_at" timestamptz;

-- Verification tokens table
CREATE TABLE "auth"."email_verifications" (
    "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    uuid NOT NULL,
    "token_hash" varchar(64) NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "used_at"    timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("user_id") ON DELETE CASCADE
);

CREATE INDEX idx_email_verifications_token_hash ON "auth"."email_verifications" ("token_hash");
CREATE INDEX idx_email_verifications_user_id ON "auth"."email_verifications" ("user_id");

-- RLS: internal only (system operations via InSystemTx)
ALTER TABLE "auth"."email_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."email_verifications" FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "auth"."email_verifications" TO internal;

CREATE POLICY internal_bypass_email_verifications ON "auth"."email_verifications"
    TO internal USING (TRUE) WITH CHECK (TRUE);
