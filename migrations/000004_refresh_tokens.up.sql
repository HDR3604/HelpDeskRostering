CREATE TABLE
    "auth"."refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid (),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL, -- SHA-256 hex of opaque token
        "expires_at" timestampz NOT NULL,
        "revoked_at" timestampz NOT NULL,
        "created_at" timestampz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "replaced_by" uuid, -- points to successor token (rotation chain)
        PRIMARY KEY ("id"),
        FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("user_id") ON DELETE CASCADE,
        FOREIGN KEY ("replaced_by") REFERENCES "auth"."refresh_tokens" ("id")
    );

CREATE INDEX idx_refresh_tokens_token_hash ON "auth"."refresh_tokens" ("token_hash");
CREATE INDEX idx_refresh_tokens_user_id ON "auth"."refresh_tokens" ("user_id");

-- RLS: only internal role accesses this table (all ops go through InSystemTx)
ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth"."refresh_tokens" FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "auth"."refresh_tokens" TO internal;

CREATE POLICY internal_bypass_refresh_tokens ON "auth"."refresh_tokens" TO internal 
USING (TRUE)
WITH CHECK (TRUE);