-- Seed default shift templates: 1-hour slots from 08:00 to 16:00, Monday–Friday
INSERT INTO schedule.shift_templates (name, day_of_week, start_time, end_time, min_staff, max_staff, course_demands)
SELECT
  d.day_name || ' ' || to_char(h.hr, 'FM00') || ':00-' || to_char(h.hr + 1, 'FM00') || ':00',
  d.dow,
  make_time(h.hr, 0, 0),
  make_time(h.hr + 1, 0, 0),
  2,
  3,
  '[]'::jsonb
FROM
  (VALUES (0,'Mon'),(1,'Tue'),(2,'Wed'),(3,'Thu'),(4,'Fri')) AS d(dow, day_name),
  generate_series(8, 15) AS h(hr)
ORDER BY d.dow, h.hr;
