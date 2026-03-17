-- +goose Up

-- Grant UPDATE on time_logs to authenticated role (needed for student clock-out)
GRANT UPDATE ON schedule.time_logs TO authenticated;

-- Replace admin-only policies with student-scoped policies

-- Drop existing admin-only policies
DROP POLICY IF EXISTS time_logs_select ON schedule.time_logs;
DROP POLICY IF EXISTS time_logs_insert ON schedule.time_logs;

-- Students can SELECT their own rows, admins can see all
CREATE POLICY time_logs_select ON schedule.time_logs
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- Students can INSERT their own rows, admins can insert any
CREATE POLICY time_logs_insert ON schedule.time_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- Students can UPDATE their own rows (for clock-out), admins can update any
CREATE POLICY time_logs_update ON schedule.time_logs
    FOR UPDATE TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- +goose Down

DROP POLICY IF EXISTS time_logs_update ON schedule.time_logs;
DROP POLICY IF EXISTS time_logs_insert ON schedule.time_logs;
DROP POLICY IF EXISTS time_logs_select ON schedule.time_logs;

REVOKE UPDATE ON schedule.time_logs FROM authenticated;

-- Restore admin-only policies
CREATE POLICY time_logs_select ON schedule.time_logs
    FOR SELECT TO authenticated
    USING (user_has_role('admin'));

CREATE POLICY time_logs_insert ON schedule.time_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_has_role('admin'));
