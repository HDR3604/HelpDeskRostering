-- Drop triggers (only updated_at and created_by - created_at uses DEFAULT)
DROP TRIGGER IF EXISTS trg_schedules_created_by ON "schedule"."schedules";
DROP TRIGGER IF EXISTS trg_schedules_updated_at ON "schedule"."schedules";
DROP TRIGGER IF EXISTS trg_payments_updated_at ON "auth"."payments";
DROP TRIGGER IF EXISTS trg_banking_details_updated_at ON "auth"."banking_details";
DROP TRIGGER IF EXISTS trg_users_updated_at ON "auth"."users";
DROP TRIGGER IF EXISTS trg_students_updated_at ON "auth"."students";

-- Drop foreign key constraints
ALTER TABLE "schedule"."schedules" DROP CONSTRAINT IF EXISTS "fk_schedules_created_by_users_user_id";
ALTER TABLE "schedule"."time_logs" DROP CONSTRAINT IF EXISTS "fk_time_logs_student_id_students_student_id";
ALTER TABLE "auth"."payments" DROP CONSTRAINT IF EXISTS "fk_payments_student_id_students_student_id";
ALTER TABLE "auth"."banking_details" DROP CONSTRAINT IF EXISTS "fk_banking_details_student_id_students_student_id";

-- Drop indexes
DROP INDEX IF EXISTS "auth"."payments_idx_period";
DROP INDEX IF EXISTS "auth"."payments_idx_student_id";
DROP INDEX IF EXISTS "schedule"."time_logs_idx_student_id";
DROP INDEX IF EXISTS "schedule"."time_logs_idx_entry_at";
DROP INDEX IF EXISTS "auth"."students_idx_accepted_at";

-- Drop tables (reverse order of creation, respecting dependencies)
DROP TABLE IF EXISTS "auth"."payments";
DROP TABLE IF EXISTS "schedule"."schedules";
DROP TABLE IF EXISTS "schedule"."time_logs";
DROP TABLE IF EXISTS "auth"."banking_details";
DROP TABLE IF EXISTS "auth"."users";
DROP TABLE IF EXISTS "auth"."students";

-- Drop trigger functions
DROP FUNCTION IF EXISTS set_created_by();
DROP FUNCTION IF EXISTS set_updated_at();

-- Drop types
DROP TYPE IF EXISTS "auth"."roles";
DROP TYPE IF EXISTS "auth"."bank_account_type";

-- Drop schemas (only if empty - be careful in production)
DROP SCHEMA IF EXISTS "schedule";
DROP SCHEMA IF EXISTS "auth";
