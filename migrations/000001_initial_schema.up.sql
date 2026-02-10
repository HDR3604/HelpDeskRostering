-- Migration: 000001_initial_schema
-- Description: Create initial database schema with auth and schedule tables, trigger functions, and foreign keys

CREATE SCHEMA IF NOT EXISTS "auth";
CREATE SCHEMA IF NOT EXISTS "schedule";

CREATE TYPE "auth"."bank_account_type" AS ENUM ('chequeing', 'savings');
CREATE TYPE "auth"."roles" AS ENUM ('student', 'admin');

---------------------------------
--     Trigger Functions       --
---------------------------------

-- Automatically set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- Automatically set created_by from session context on INSERT
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_id TEXT;
BEGIN
    user_id := current_setting('app.current_user_id', true);
    IF user_id IS NOT NULL AND user_id != '' THEN
        NEW.created_by := user_id::uuid;
    END IF;

    IF NEW.created_by IS NULL THEN
        RAISE EXCEPTION 'created_by is required: set app.current_user_id session variable or provide created_by in the INSERT';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TABLE "auth"."students" (
    "student_id" int NOT NULL,
    "email_address" varchar(255) NOT NULL UNIQUE,
    "first_name" varchar(50) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    -- transcript metadata contains the relevant extracted information from their provided transcripts. 
    -- It should follow the below structure:
    -- {
    --    overall_gpa: float;
    --    degree_gpa: float;
    --    degree_programme: string;
    --    courses: []maps[string]float;
    --    current_level: string;
    -- }
    "transcript_metadata" jsonb NOT NULL,
    -- Availability contains a json indicating the availability of a student for each time slot given. The times a represented in 24-hour format. 
    -- e.g. 8 represents 8 am - 9am
    -- {
    --   0: [8...16],
    --   .
    --   .
    --   4: [8...16] // 24 hr format
    -- }
    "availability" jsonb NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    "updated_at" timestamptz,
    "deleted_at" timestamptz,
    "accepted_at" timestamptz,
    "rejected_at" timestamptz,
    PRIMARY KEY ("student_id")
);
COMMENT ON COLUMN "auth"."students"."transcript_metadata" IS 'transcript metadata contains the relevant extracted information from their provided transcripts. It should follow the below structure: { overall_gpa: float; degree_gpa: float; degree_programme: string; courses: []maps[string]float; current_level: string; }';
COMMENT ON COLUMN "auth"."students"."availability" IS 'Availability contains a json indicating the availability of a student for each time slot given. The times a represented in 24-hour format. e.g. 8 represents 8 am - 9am { 0: [8...16], . . 4: [8...16] // 24 hr format }';
-- Indexes
CREATE INDEX "students_idx_accepted_at" ON "auth"."students" ("accepted_at");

CREATE TABLE "auth"."users" (
    "user_id" uuid NOT NULL,
    "email_address" varchar(255) NOT NULL UNIQUE,
    "password" varchar(255) NOT NULL,
    "role" "auth"."roles" NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    PRIMARY KEY ("user_id")
);

CREATE TABLE "auth"."banking_details" (
    "student_id" int NOT NULL,
    "bank_name" varchar(100) NOT NULL,
    "branch_name" varchar(100) NOT NULL,
    "account_type" "auth"."bank_account_type" NOT NULL,
    "account_number" bytea NOT NULL,  -- Encrypted
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    PRIMARY KEY ("student_id")
);

CREATE TABLE "schedule"."time_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "student_id" int NOT NULL,
    "entry_at" timestamptz NOT NULL,
    "exit_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "longitude" numeric(9, 6) NOT NULL,
    "latitude" numeric(9, 6) NOT NULL,
    -- A pre-calculated distance based on the longitude and latitude to be later used to flag suspicious entries.
    "distance_meters" numeric NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "chk_time_logs_exit_after_entry" CHECK (exit_at IS NULL OR exit_at > entry_at)
);
COMMENT ON COLUMN "schedule"."time_logs"."distance_meters" IS 'A pre-calculated distance based on the longitude and latitude to be later used to flag suspicious entries.';
-- Indexes
CREATE INDEX "time_logs_idx_entry_at" ON "schedule"."time_logs" ("entry_at");
CREATE INDEX "time_logs_idx_student_id" ON "schedule"."time_logs" ("student_id");

CREATE TABLE "schedule"."schedules" (
    "schedule_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "title" varchar(100) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT false,
    -- Assignments from the scheduler output.
    -- [{assistant_id: string, shift_id: string, day_of_week: int, start: "HH:MM:SS", end: "HH:MM:SS"}]
    "assignments" jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Snapshot of assistant availabilities used as input to generate this schedule.
    -- [{id: string, courses: []string, availability: [{day_of_week: int, start: "HH:MM:SS", end: "HH:MM:SS"}], min_hours: float, max_hours: float}]
    "availability_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" uuid NOT NULL,
    "updated_at" timestamptz,
    "archived_at" timestamptz,
    "effective_from" date NOT NULL,
    "effective_to" date,
    PRIMARY KEY ("schedule_id"),
    CONSTRAINT "chk_schedules_effective_period" CHECK (effective_to IS NULL OR effective_to > effective_from)
);
COMMENT ON COLUMN "schedule"."schedules"."assignments" IS 'Scheduler output: [{assistant_id, shift_id, day_of_week, start, end}]';
COMMENT ON COLUMN "schedule"."schedules"."availability_metadata" IS 'Snapshot of assistant availabilities used as scheduler input: [{id, courses, availability, min_hours, max_hours}]';

CREATE TABLE "auth"."payments" (
    "payment_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "student_id" int NOT NULL,
    -- Pay period (fortnightly)
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    -- Hours worked during this pay period (calculated from time_logs)
    "hours_worked" numeric(5, 2) NOT NULL,
    -- Gross amount = hours_worked * $20.00
    "gross_amount" numeric(8, 2) NOT NULL,
    "processed_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    PRIMARY KEY ("payment_id"),
    -- Ensure no duplicate payments for same student/period
    CONSTRAINT "uq_payments_student_period" UNIQUE ("student_id", "period_start", "period_end"),
    CONSTRAINT "chk_payments_period" CHECK (period_end > period_start),
    CONSTRAINT "chk_payments_hours_worked" CHECK (hours_worked >= 0),
    CONSTRAINT "chk_payments_gross_amount" CHECK (gross_amount >= 0)
);
-- Indexes
CREATE INDEX "payments_idx_student_id" ON "auth"."payments" ("student_id");
CREATE INDEX "payments_idx_period" ON "auth"."payments" ("period_start", "period_end");

-- Foreign key constraints
-- Schema: auth
ALTER TABLE "auth"."banking_details" ADD CONSTRAINT "fk_banking_details_student_id_students_student_id" FOREIGN KEY("student_id") REFERENCES "auth"."students"("student_id");
ALTER TABLE "auth"."payments" ADD CONSTRAINT "fk_payments_student_id_students_student_id" FOREIGN KEY("student_id") REFERENCES "auth"."students"("student_id");

-- Schema: schedule
ALTER TABLE "schedule"."time_logs" ADD CONSTRAINT "fk_time_logs_student_id_students_student_id" FOREIGN KEY("student_id") REFERENCES "auth"."students"("student_id");
ALTER TABLE "schedule"."schedules" ADD CONSTRAINT "fk_schedules_created_by_users_user_id" FOREIGN KEY("created_by") REFERENCES "auth"."users"("user_id");

---------------------------------
-- Triggers                    --
---------------------------------
-- Note: created_at uses DEFAULT CURRENT_TIMESTAMP, no trigger needed

-- auth.students
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON "auth"."students"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.users
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.banking_details
CREATE TRIGGER trg_banking_details_updated_at
    BEFORE UPDATE ON "auth"."banking_details"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.payments
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON "auth"."payments"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- schedule.schedules
CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON "schedule"."schedules"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_schedules_created_by
    BEFORE INSERT ON "schedule"."schedules"
    FOR EACH ROW EXECUTE FUNCTION set_created_by();