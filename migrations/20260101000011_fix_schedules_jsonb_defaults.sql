-- +goose Up
-- Convert existing {} values to [] and change column defaults to empty arrays.

UPDATE schedule.schedules
SET assignments = '[]'::jsonb
WHERE assignments = '{}'::jsonb;

UPDATE schedule.schedules
SET availability_metadata = '[]'::jsonb
WHERE availability_metadata = '{}'::jsonb;

ALTER TABLE schedule.schedules
    ALTER COLUMN "assignments" SET DEFAULT '[]'::jsonb,
    ALTER COLUMN "availability_metadata" SET DEFAULT '[]'::jsonb;

-- +goose Down
-- Revert column defaults back to empty objects.

ALTER TABLE schedule.schedules
    ALTER COLUMN "assignments" SET DEFAULT '{}'::jsonb,
    ALTER COLUMN "availability_metadata" SET DEFAULT '{}'::jsonb;

UPDATE schedule.schedules
SET assignments = '{}'::jsonb
WHERE assignments = '[]'::jsonb;

UPDATE schedule.schedules
SET availability_metadata = '{}'::jsonb
WHERE availability_metadata = '[]'::jsonb;
