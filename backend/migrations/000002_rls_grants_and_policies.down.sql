-- Revoke application user role membership
REVOKE authenticated FROM helpdesk;
REVOKE internal FROM helpdesk;

-- Drop policies
DROP POLICY IF EXISTS schedules_select ON schedule.schedules;
DROP POLICY IF EXISTS time_logs_insert ON schedule.time_logs;
DROP POLICY IF EXISTS time_logs_select ON schedule.time_logs;
DROP POLICY IF EXISTS payments_select ON auth.payments;
DROP POLICY IF EXISTS banking_insert ON auth.banking_details;
DROP POLICY IF EXISTS banking_update ON auth.banking_details;
DROP POLICY IF EXISTS banking_select ON auth.banking_details;
DROP POLICY IF EXISTS users_update ON auth.users;
DROP POLICY IF EXISTS users_select ON auth.users;
DROP POLICY IF EXISTS students_update ON auth.students;
DROP POLICY IF EXISTS students_select ON auth.students;

-- Drop internal bypass policies
DROP POLICY IF EXISTS internal_bypass_schedules ON schedule.schedules;
DROP POLICY IF EXISTS internal_bypass_time_logs ON schedule.time_logs;
DROP POLICY IF EXISTS internal_bypass_payments ON auth.payments;
DROP POLICY IF EXISTS internal_bypass_banking ON auth.banking_details;
DROP POLICY IF EXISTS internal_bypass_users ON auth.users;
DROP POLICY IF EXISTS internal_bypass_students ON auth.students;

-- Disable forced RLS
ALTER TABLE schedule.schedules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule.time_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.payments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.banking_details NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.students NO FORCE ROW LEVEL SECURITY;

-- Disable RLS
ALTER TABLE schedule.schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule.time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.banking_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.students DISABLE ROW LEVEL SECURITY;

-- Revoke table permissions
REVOKE ALL ON schedule.schedules FROM authenticated, internal;
REVOKE ALL ON schedule.time_logs FROM authenticated, internal;
REVOKE ALL ON auth.payments FROM authenticated, internal;
REVOKE ALL ON auth.banking_details FROM authenticated, internal;
REVOKE ALL ON auth.users FROM authenticated, internal;
REVOKE ALL ON auth.students FROM authenticated, internal;

-- Revoke schema usage
REVOKE USAGE ON SCHEMA schedule FROM authenticated, internal;
REVOKE USAGE ON SCHEMA auth FROM authenticated, internal;

-- Drop helper functions
DROP FUNCTION IF EXISTS student_owns_record(INT);
DROP FUNCTION IF EXISTS user_has_role(VARCHAR);

-- Drop roles
DROP ROLE IF EXISTS internal;
DROP ROLE IF EXISTS authenticated;
