DROP POLICY IF EXISTS internal_bypass_email_verifications ON "auth"."email_verifications";
REVOKE ALL ON "auth"."email_verifications" FROM internal;
DROP TABLE IF EXISTS "auth"."email_verifications";
ALTER TABLE "auth"."users" DROP COLUMN IF EXISTS "email_verified_at";
