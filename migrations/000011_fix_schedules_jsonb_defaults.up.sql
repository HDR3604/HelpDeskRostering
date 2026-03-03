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
