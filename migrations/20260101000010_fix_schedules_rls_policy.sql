-- +goose Up
-- Fix schedules_select RLS policy for students.
--
-- The original policy used `assignments ? student_id` which only works when
-- assignments is a JSONB object with student IDs as keys. In practice,
-- assignments is a JSONB array of objects with an "assistant_id" field, e.g.:
--   [{"assistant_id": "816034521", "shift_id": "mon-10-11", ...}]
--
-- The `?` operator on an array checks for top-level string elements, so it
-- never matched the nested assistant_id values. Replace with a subquery that
-- checks inside each array element.

DROP POLICY IF EXISTS schedules_select ON schedule.schedules;

CREATE POLICY schedules_select ON schedule.schedules
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin')
        OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(assignments) AS elem
            WHERE elem ->> 'assistant_id' = current_setting('app.current_student_id', true)
        )
    );

-- +goose Down
-- Revert to original (broken) schedules_select policy.
DROP POLICY IF EXISTS schedules_select ON schedule.schedules;

CREATE POLICY schedules_select ON schedule.schedules
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin')
        OR assignments ? current_setting('app.current_student_id', true)
    );
