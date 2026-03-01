DROP POLICY IF EXISTS internal_bypass_auth_tokens ON "auth"."auth_tokens";
REVOKE ALL ON "auth"."auth_tokens" FROM internal;
DROP TABLE IF EXISTS "auth"."auth_tokens";
ALTER TABLE "auth"."users" DROP COLUMN IF EXISTS "email_verified_at";
