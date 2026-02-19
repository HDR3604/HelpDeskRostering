-- Rename email_verifications → auth_tokens and add type column
ALTER TABLE "auth"."email_verifications" RENAME TO "auth_tokens";

-- Add type column (existing rows default to 'email_verification')
ALTER TABLE "auth"."auth_tokens"
    ADD COLUMN "type" varchar(30) NOT NULL DEFAULT 'email_verification';

-- Rename indexes
ALTER INDEX idx_email_verifications_token_hash RENAME TO idx_auth_tokens_token_hash;
ALTER INDEX idx_email_verifications_user_id RENAME TO idx_auth_tokens_user_id;

-- Add index on type
CREATE INDEX idx_auth_tokens_type ON "auth"."auth_tokens" ("type");

-- Update RLS policy
DROP POLICY internal_bypass_email_verifications ON "auth"."auth_tokens";
CREATE POLICY internal_bypass_auth_tokens ON "auth"."auth_tokens"
    TO internal USING (TRUE) WITH CHECK (TRUE);

-- Re-grant permissions
REVOKE ALL ON "auth"."auth_tokens" FROM internal;
GRANT SELECT, INSERT, UPDATE, DELETE ON "auth"."auth_tokens" TO internal;
