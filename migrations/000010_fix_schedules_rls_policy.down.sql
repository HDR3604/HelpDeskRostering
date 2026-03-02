-- Revert to original (broken) schedules_select policy.
DROP POLICY IF EXISTS schedules_select ON schedule.schedules;

CREATE POLICY schedules_select ON schedule.schedules
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin')
        OR assignments ? current_setting('app.current_student_id', true)
    );
