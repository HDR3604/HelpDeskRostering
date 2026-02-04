CREATE SCHEMA IF NOT EXISTS "auth";
CREATE SCHEMA IF NOT EXISTS "schedule";

CREATE TYPE "bank_account_type" AS ENUM ('chequeing', 'savings');
CREATE TYPE "roles" AS ENUM ('student', 'admin');

---------------------------------
-- Trigger Functions           --
---------------------------------

-- Automatically set created_at on INSERT
CREATE OR REPLACE FUNCTION set_created_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.created_at := NOW();
    RETURN NEW;
END;
$$;

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
    --   degree_programme: string;
    --   courses: []maps[string]float;
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
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz,
    "deleted_at" timestamptz,
    "accepted_at" timestamptz,
    "rejected_at" timestamptz,
    PRIMARY KEY ("student_id")
);
COMMENT ON COLUMN "auth"."students"."transcript_metadata" IS 'transcript metadata contains the relevant extracted information from their provided transcripts. It should follow the below structure: { overall_gpa: float; degree_gpa: float; degree_programme: string; courses: []maps[string]float; }';
COMMENT ON COLUMN "auth"."students"."availability" IS 'Availability contains a json indicating the availability of a student for each time slot given. The times a represented in 24-hour format. e.g. 8 represents 8 am - 9am { 0: [8...16], . . 4: [8...16] // 24 hr format }';
-- Indexes
CREATE INDEX "students_dx_students_accepted_at" ON "auth"."students" ("accepted_at");

CREATE TABLE "auth"."users" (
    "user_id" uuid NOT NULL,
    "email_address" varchar(255) NOT NULL UNIQUE,
    "password" varchar(255) NOT NULL,
    "role" roles NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz,
    PRIMARY KEY ("user_id")
);

CREATE TABLE "auth"."banking_details" (
    "student_id" int NOT NULL,
    "bank_name" varchar(100) NOT NULL,
    "branch_name" varchar(100) NOT NULL,
    "account_type" bank_account_type NOT NULL,
    "account_number" bytea NOT NULL,  -- Encrypted
    PRIMARY KEY ("student_id")
);

CREATE TABLE "schedule"."time_logs" (
    "id" uuid NOT NULL,
    "student_id" int NOT NULL,
    "entry_at" timestamptz NOT NULL,
    "exit_at" timestamptz,
    "created_at" timestamptz NOT NULL,
    "longitude" numeric(9, 6) NOT NULL,
    "latitude" numeric(9, 6) NOT NULL,
    -- A pre-calculated distance based on the longitude and latitude to be later used to flag suspicious entries.
    "distance_meters" numeric NOT NULL,
    PRIMARY KEY ("id")
);
COMMENT ON COLUMN "schedule"."time_logs"."distance_meters" IS 'A pre-calculated distance based on the longitude and latitude to be later used to flag suspicious entries.';
-- Indexes
CREATE INDEX "time_logs_idx_entry_at" ON "schedule"."time_logs" ("entry_at");
CREATE INDEX "time_logs_idx_student_id" ON "schedule"."time_logs" ("student_id");

CREATE TABLE "schedule"."schedules" (
    "schedule_id" uuid NOT NULL,
    "title" varchar(100) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    -- This is used to store the assignments of students for a given schedule.
    -- {
    --    [student_id:int] { 
    --    [0...4]: []int
    --   }
    -- }
    "assignments" jsonb NOT NULL,
    -- This stores the availabilities that were used to generate the schedule.
    -- {
    --   [student_id:int]: map[int][]int
    -- }
    "availability_metadata" jsonb NOT NULL,
    "created_at" timestamptz NOT NULL,
    "created_by" uuid NOT NULL,
    "updated_at" timestamptz,
    "archived_at" timestamptz,
    "effective_from" date NOT NULL,
    "effective_to" date,
    PRIMARY KEY ("schedule_id")
);
COMMENT ON COLUMN "schedule"."schedules"."assignments" IS 'This is used to store the assignments of students for a given schedule. { [student_id:int] { [0...4]: []int } }';
COMMENT ON COLUMN "schedule"."schedules"."availability_metadata" IS 'This stores the availabilities that were used to generate the schedule. { [student_id:int]: map[int][]int }';

CREATE TABLE "auth"."payments" (
    "payment_id" uuid NOT NULL,
    "student_id" int NOT NULL,
    -- Pay period (fortnightly)
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    -- Hours worked during this pay period (calculated from time_logs)
    "hours_worked" numeric(5, 2) NOT NULL,
    -- Gross amount = hours_worked * $20.00
    "gross_amount" numeric(8, 2) NOT NULL,
    "processed_at" timestamptz,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz,
    PRIMARY KEY ("payment_id"),
    -- Ensure no duplicate payments for same student/period
    CONSTRAINT "uq_payments_student_period" UNIQUE ("student_id", "period_start", "period_end")
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

-- auth.students
CREATE TRIGGER trg_students_created_at
    BEFORE INSERT ON "auth"."students"
    FOR EACH ROW EXECUTE FUNCTION set_created_at();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON "auth"."students"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.users
CREATE TRIGGER trg_users_created_at
    BEFORE INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION set_created_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.payments
CREATE TRIGGER trg_payments_created_at
    BEFORE INSERT ON "auth"."payments"
    FOR EACH ROW EXECUTE FUNCTION set_created_at();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON "auth"."payments"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- schedule.time_logs
CREATE TRIGGER trg_time_logs_created_at
    BEFORE INSERT ON "schedule"."time_logs"
    FOR EACH ROW EXECUTE FUNCTION set_created_at();

-- schedule.schedules
CREATE TRIGGER trg_schedules_created_at
    BEFORE INSERT ON "schedule"."schedules"
    FOR EACH ROW EXECUTE FUNCTION set_created_at();

CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON "schedule"."schedules"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_schedules_created_by
    BEFORE INSERT ON "schedule"."schedules"
    FOR EACH ROW EXECUTE FUNCTION set_created_by();