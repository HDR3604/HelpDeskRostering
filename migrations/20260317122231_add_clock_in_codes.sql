-- +goose Up

-- QR clock-in codes (rotating, short-lived)
CREATE TABLE "schedule"."clock_in_codes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "code" varchar(8) NOT NULL UNIQUE,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" uuid NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "fk_clock_in_codes_created_by" FOREIGN KEY ("created_by")
        REFERENCES "auth"."users" ("user_id")
);
CREATE INDEX "clock_in_codes_idx_expires_at" ON "schedule"."clock_in_codes" ("expires_at");

-- Add flagging columns to time_logs
ALTER TABLE "schedule"."time_logs"
    ADD COLUMN "is_flagged" boolean NOT NULL DEFAULT false,
    ADD COLUMN "flag_reason" varchar(500);

-- RLS for clock_in_codes
ALTER TABLE "schedule"."clock_in_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule"."clock_in_codes" FORCE ROW LEVEL SECURITY;
GRANT SELECT ON "schedule"."clock_in_codes" TO "authenticated";
GRANT ALL ON "schedule"."clock_in_codes" TO "internal";

CREATE POLICY "clock_in_codes_select" ON "schedule"."clock_in_codes"
    FOR SELECT TO "authenticated"
    USING (true);

CREATE POLICY "internal_bypass_clock_in_codes" ON "schedule"."clock_in_codes"
    FOR ALL TO "internal"
    USING (true) WITH CHECK (true);

-- +goose Down
DROP POLICY IF EXISTS "internal_bypass_clock_in_codes" ON "schedule"."clock_in_codes";
DROP POLICY IF EXISTS "clock_in_codes_select" ON "schedule"."clock_in_codes";
REVOKE ALL ON "schedule"."clock_in_codes" FROM "internal";
REVOKE SELECT ON "schedule"."clock_in_codes" FROM "authenticated";
ALTER TABLE "schedule"."time_logs" DROP COLUMN IF EXISTS "flag_reason";
ALTER TABLE "schedule"."time_logs" DROP COLUMN IF EXISTS "is_flagged";
DROP INDEX IF EXISTS "schedule"."clock_in_codes_idx_expires_at";
ALTER TABLE "schedule"."clock_in_codes" NO FORCE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS "schedule"."clock_in_codes";
