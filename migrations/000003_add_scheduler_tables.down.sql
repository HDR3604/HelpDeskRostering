-- Migration: 000003_add_scheduler_tables (DOWN)
-- Reverse all changes from the up migration

---------------------------------
-- Drop RLS Policies           --
---------------------------------

DROP POLICY IF EXISTS schedule_generations_select ON "schedule"."schedule_generations";

DROP POLICY IF EXISTS scheduler_configs_delete ON "schedule"."scheduler_configs";
DROP POLICY IF EXISTS scheduler_configs_update ON "schedule"."scheduler_configs";
DROP POLICY IF EXISTS scheduler_configs_insert ON "schedule"."scheduler_configs";
DROP POLICY IF EXISTS scheduler_configs_select ON "schedule"."scheduler_configs";

DROP POLICY IF EXISTS shift_templates_delete ON "schedule"."shift_templates";
DROP POLICY IF EXISTS shift_templates_update ON "schedule"."shift_templates";
DROP POLICY IF EXISTS shift_templates_insert ON "schedule"."shift_templates";
DROP POLICY IF EXISTS shift_templates_select ON "schedule"."shift_templates";

DROP POLICY IF EXISTS internal_bypass_schedule_generations ON "schedule"."schedule_generations";
DROP POLICY IF EXISTS internal_bypass_scheduler_configs ON "schedule"."scheduler_configs";
DROP POLICY IF EXISTS internal_bypass_shift_templates ON "schedule"."shift_templates";

-- Revoke grants
REVOKE ALL ON "schedule"."schedule_generations" FROM authenticated, internal;
REVOKE ALL ON "schedule"."scheduler_configs" FROM authenticated, internal;
REVOKE ALL ON "schedule"."shift_templates" FROM authenticated, internal;

---------------------------------
-- Drop Triggers               --
---------------------------------

DROP TRIGGER IF EXISTS trg_schedule_generations_created_by ON "schedule"."schedule_generations";
DROP TRIGGER IF EXISTS trg_scheduler_configs_updated_at ON "schedule"."scheduler_configs";
DROP TRIGGER IF EXISTS trg_shift_templates_updated_at ON "schedule"."shift_templates";

---------------------------------
-- Remove FK constraints       --
---------------------------------

-- Remove FK from schedule_generations to schedules
ALTER TABLE "schedule"."schedule_generations"
    DROP CONSTRAINT IF EXISTS "fk_schedule_generations_schedule";

-- Remove FK from schedules to schedule_generations
ALTER TABLE "schedule"."schedules"
    DROP CONSTRAINT IF EXISTS "fk_schedules_generation";

---------------------------------
-- Revert schedule.schedules   --
---------------------------------

ALTER TABLE "schedule"."schedules"
    DROP COLUMN IF EXISTS "scheduler_metadata",
    DROP COLUMN IF EXISTS "generation_id";

---------------------------------
-- Revert auth.students        --
---------------------------------

ALTER TABLE "auth"."students"
    DROP CONSTRAINT IF EXISTS "chk_students_max_weekly_hours",
    DROP CONSTRAINT IF EXISTS "chk_students_min_weekly_hours",
    DROP COLUMN IF EXISTS "max_weekly_hours",
    DROP COLUMN IF EXISTS "min_weekly_hours";

---------------------------------
-- Drop Tables                 --
---------------------------------

DROP TABLE IF EXISTS "schedule"."schedule_generations";
DROP TABLE IF EXISTS "schedule"."scheduler_configs";
DROP TABLE IF EXISTS "schedule"."shift_templates";
