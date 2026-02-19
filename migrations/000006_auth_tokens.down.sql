-- Revert auth_tokens → email_verifications
DROP POLICY internal_bypass_auth_tokens ON "auth"."auth_tokens";

DROP INDEX IF EXISTS "auth".idx_auth_tokens_type;

ALTER TABLE "auth"."auth_tokens" DROP COLUMN "type";

ALTER INDEX "auth".idx_auth_tokens_token_hash RENAME TO idx_email_verifications_token_hash;
ALTER INDEX "auth".idx_auth_tokens_user_id RENAME TO idx_email_verifications_user_id;

ALTER TABLE "auth"."auth_tokens" RENAME TO "email_verifications";

CREATE POLICY internal_bypass_email_verifications ON "auth"."email_verifications"
    TO internal USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON "auth"."email_verifications" FROM internal;
GRANT SELECT, INSERT, UPDATE, DELETE ON "auth"."email_verifications" TO internal;
