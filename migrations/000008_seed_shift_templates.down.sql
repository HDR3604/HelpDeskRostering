-- Remove seeded shift templates
DELETE FROM schedule.shift_templates
WHERE name ~ '^(Mon|Tue|Wed|Thu|Fri) \d{2}:\d{2}-\d{2}:\d{2}$';
