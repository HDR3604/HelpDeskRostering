-- +goose Up

-- Prevent concurrent clock-in race conditions: only one open time log per student
CREATE UNIQUE INDEX time_logs_unique_open_per_student
    ON schedule.time_logs (student_id)
    WHERE exit_at IS NULL;

-- +goose Down

DROP INDEX IF EXISTS schedule.time_logs_unique_open_per_student;
