-- References: https://github.com/firepenguindisopanda/INFO3604-help-desk-rostering
-- Migration: 000003_add_scheduler_tables
-- Description: Add tables for scheduler integration (shift templates, configs, generations)

--------------------------
-- Shift Templates Table --
--------------------------

-- Description: Defines shift slots that need to be staffed. These are inputs to the scheduler.
-- Maps to Python Shift dataclass in scheduler_lp.py

CREATE TABLE "schedule"."shift_templates" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" varchar(100) NOT NULL,                    -- e.g., "Monday 9-10am"
    "day_of_week" int NOT NULL,                      -- 0=Monday, 6=Sunday
    "start_time" time NOT NULL,
    "end_time" time NOT NULL,
    "min_staff" int NOT NULL DEFAULT 2,
    "max_staff" int DEFAULT 3,
    -- Array of course demands: [{course_code, tutors_required, weight}]
    -- Maps to Python CourseDemand dataclass
    "course_demands" jsonb NOT NULL DEFAULT '[]',
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    PRIMARY KEY ("id"),
    CONSTRAINT "chk_shift_templates_day_of_week" CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT "chk_shift_templates_time" CHECK (end_time > start_time),
    CONSTRAINT "chk_shift_templates_staff" CHECK (max_staff IS NULL OR max_staff >= min_staff)
);

COMMENT ON TABLE "schedule"."shift_templates" IS 'Defines shift slots that need to be staffed. These are inputs to the scheduler.';
COMMENT ON COLUMN "schedule"."shift_templates"."course_demands" IS 'Array of {course_code: string, tutors_required: int, weight: float}';

-- Indexes
CREATE INDEX "shift_templates_idx_active" ON "schedule"."shift_templates" ("is_active", "day_of_week");

-----------------------------
-- Scheduler Configs Table --
-----------------------------

-- Description: Named optimizer configurations with penalty weights.
-- Maps directly to Python SchedulerConfig dataclass in scheduler_lp.py

CREATE TABLE "schedule"."scheduler_configs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" varchar(100) NOT NULL,
    -- Penalty weights (match Python SchedulerConfig dataclass)
    "course_shortfall_penalty" float NOT NULL DEFAULT 1.0,
    "min_hours_penalty" float NOT NULL DEFAULT 10.0,
    "max_hours_penalty" float NOT NULL DEFAULT 5.0,
    "understaffed_penalty" float NOT NULL DEFAULT 100.0,
    "extra_hours_penalty" float NOT NULL DEFAULT 5.0,
    "max_extra_penalty" float NOT NULL DEFAULT 20.0,
    "baseline_hours_target" int NOT NULL DEFAULT 6,
    -- Solver settings
    "solver_time_limit" int,                         -- seconds, NULL = no limit
    "solver_gap" float,                              -- optimality gap, NULL = default
    "log_solver_output" boolean NOT NULL DEFAULT false,
    -- Metadata
    "is_default" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    PRIMARY KEY ("id")
);

COMMENT ON TABLE "schedule"."scheduler_configs" IS 'Named optimizer configurations with penalty weights. Maps to Python SchedulerConfig dataclass.';

-- Only one default config allowed
CREATE UNIQUE INDEX "scheduler_configs_idx_default"
    ON "schedule"."scheduler_configs" ("is_default") WHERE is_default = true;

-- Insert default configuration (fixed UUID for deterministic seed data)
INSERT INTO "schedule"."scheduler_configs" (
    "id", "name", "is_default", "created_at"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default',
    true,
    NOW()
);

--------------------------
-- Schedule Generations --
--------------------------

-- Description: Audit log for schedule generation requests.
-- Tracks inputs, outputs, and status of each generation attempt.

CREATE TABLE "schedule"."schedule_generations" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" uuid,                              -- NULL until completed, set after schedule is created
    "config_id" uuid NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, infeasible
    "request_payload" jsonb,                         -- Input sent to solver
    "response_payload" jsonb,                        -- Result from solver
    "error_message" text,                            -- Error details if failed
    "started_at" timestamptz,
    "completed_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" uuid NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "fk_schedule_generations_config"
        FOREIGN KEY ("config_id") REFERENCES "schedule"."scheduler_configs"("id"),
    CONSTRAINT "fk_schedule_generations_created_by"
        FOREIGN KEY ("created_by") REFERENCES "auth"."users"("user_id"),
    CONSTRAINT "chk_schedule_generations_status"
        CHECK (status IN ('pending', 'completed', 'failed', 'infeasible'))
);

COMMENT ON TABLE "schedule"."schedule_generations" IS 'Audit log for schedule generation requests.';

-- Indexes
CREATE INDEX "schedule_generations_idx_status"
    ON "schedule"."schedule_generations" ("status") WHERE status = 'pending';
CREATE INDEX "schedule_generations_idx_created_at"
    ON "schedule"."schedule_generations" ("created_at" DESC);

----------------------------
-- Modify auth.students   --
----------------------------

-- Add scheduling-related columns to students table.
-- These map to Python Assistant dataclass fields.

ALTER TABLE "auth"."students"
    ADD COLUMN "min_weekly_hours" float NOT NULL DEFAULT 0,
    ADD COLUMN "max_weekly_hours" float DEFAULT NULL,
    ADD CONSTRAINT "chk_students_min_weekly_hours" CHECK (min_weekly_hours >= 0),
    ADD CONSTRAINT "chk_students_max_weekly_hours" CHECK (max_weekly_hours IS NULL OR max_weekly_hours >= min_weekly_hours);

COMMENT ON COLUMN "auth"."students"."min_weekly_hours" IS 'Minimum hours per week this student should be scheduled (fairness baseline)';
COMMENT ON COLUMN "auth"."students"."max_weekly_hours" IS 'Maximum hours per week this student can work';

------------------------------
-- Modify schedule.schedules --
------------------------------

-- Link schedules to their generation record and store optimizer metadata.

ALTER TABLE "schedule"."schedules"
    ADD COLUMN "generation_id" uuid,
    ADD COLUMN "scheduler_metadata" jsonb;

-- Add FK constraint separately (schedule_generations must exist first)
ALTER TABLE "schedule"."schedules"
    ADD CONSTRAINT "fk_schedules_generation"
        FOREIGN KEY ("generation_id") REFERENCES "schedule"."schedule_generations"("id");

-- Now add the reverse FK from schedule_generations to schedules
ALTER TABLE "schedule"."schedule_generations"
    ADD CONSTRAINT "fk_schedule_generations_schedule"
        FOREIGN KEY ("schedule_id") REFERENCES "schedule"."schedules"("schedule_id");

COMMENT ON COLUMN "schedule"."schedules"."scheduler_metadata" IS 'Optimizer results: {objective_value, assistant_hours, shortfalls, solver_status}';

---------------------------------
-- Triggers                    --
---------------------------------

-- shift_templates
CREATE TRIGGER trg_shift_templates_updated_at
    BEFORE UPDATE ON "schedule"."shift_templates"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- scheduler_configs
CREATE TRIGGER trg_scheduler_configs_updated_at
    BEFORE UPDATE ON "schedule"."scheduler_configs"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- schedule_generations (created_by from session context)
CREATE TRIGGER trg_schedule_generations_created_by
    BEFORE INSERT ON "schedule"."schedule_generations"
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

---------------------------------
-- Grants                      --
---------------------------------

-- shift_templates: admins can manage, students can view active templates
GRANT SELECT, INSERT, UPDATE, DELETE ON "schedule"."shift_templates" TO authenticated;
GRANT ALL ON "schedule"."shift_templates" TO internal;

-- scheduler_configs: admins can manage, students can view
GRANT SELECT, INSERT, UPDATE, DELETE ON "schedule"."scheduler_configs" TO authenticated;
GRANT ALL ON "schedule"."scheduler_configs" TO internal;

-- schedule_generations: admins only (audit log)
GRANT SELECT ON "schedule"."schedule_generations" TO authenticated;
GRANT ALL ON "schedule"."schedule_generations" TO internal;

---------------------------------
-- Row-Level Security          --
---------------------------------

-- Enable RLS
ALTER TABLE "schedule"."shift_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule"."scheduler_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule"."schedule_generations" ENABLE ROW LEVEL SECURITY;

-- Force RLS for all roles
ALTER TABLE "schedule"."shift_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "schedule"."scheduler_configs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "schedule"."schedule_generations" FORCE ROW LEVEL SECURITY;

-- Internal bypass policies
CREATE POLICY internal_bypass_shift_templates ON "schedule"."shift_templates"
    TO internal USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY internal_bypass_scheduler_configs ON "schedule"."scheduler_configs"
    TO internal USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY internal_bypass_schedule_generations ON "schedule"."schedule_generations"
    TO internal USING (TRUE) WITH CHECK (TRUE);

-- shift_templates: admins can do everything, students can only view active
CREATE POLICY shift_templates_select ON "schedule"."shift_templates"
    FOR SELECT TO authenticated
    USING (user_has_role('admin') OR is_active = true);

CREATE POLICY shift_templates_insert ON "schedule"."shift_templates"
    FOR INSERT TO authenticated
    WITH CHECK (user_has_role('admin'));

CREATE POLICY shift_templates_update ON "schedule"."shift_templates"
    FOR UPDATE TO authenticated
    USING (user_has_role('admin'));

CREATE POLICY shift_templates_delete ON "schedule"."shift_templates"
    FOR DELETE TO authenticated
    USING (user_has_role('admin'));

-- scheduler_configs: admins can manage, students can view
CREATE POLICY scheduler_configs_select ON "schedule"."scheduler_configs"
    FOR SELECT TO authenticated
    USING (TRUE);  -- All authenticated users can view configs

CREATE POLICY scheduler_configs_insert ON "schedule"."scheduler_configs"
    FOR INSERT TO authenticated
    WITH CHECK (user_has_role('admin'));

CREATE POLICY scheduler_configs_update ON "schedule"."scheduler_configs"
    FOR UPDATE TO authenticated
    USING (user_has_role('admin'));

CREATE POLICY scheduler_configs_delete ON "schedule"."scheduler_configs"
    FOR DELETE TO authenticated
    USING (user_has_role('admin'));

-- schedule_generations: read-only for authenticated admins, mutations via internal role only
CREATE POLICY schedule_generations_select ON "schedule"."schedule_generations"
    FOR SELECT TO authenticated
    USING (user_has_role('admin'));
