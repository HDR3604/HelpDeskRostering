DROP POLICY IF EXISTS internal_bypass_refresh_tokens ON "auth"."refresh_tokens";
REVOKE SELECT, INSERT, UPDATE, DELETE ON "auth"."refresh_tokens" FROM internal;
DROP TABLE IF EXISTS "auth"."refresh_tokens";
