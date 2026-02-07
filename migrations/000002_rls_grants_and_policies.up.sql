-- Migration: 000002_rls_grants_and_policies
-- Description: Set up database roles, row-level security, grants, and access policies

-- Database roles (use DO block for idempotent role creation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'internal') THEN
        CREATE ROLE internal;
    END IF;
END
$$;

-- Helper Functions 
CREATE OR REPLACE FUNCTION user_has_role(check_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN current_setting('app.current_role', true) = check_role;
END;
$$;

CREATE OR REPLACE FUNCTION student_owns_record(record_student_id INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    current_id TEXT;
BEGIN
    current_id := current_setting('app.current_student_id', true);
    IF current_id IS NULL OR current_id = '' THEN
        RETURN FALSE;
    END IF;
    RETURN record_student_id = current_id::int;
END;
$$;

-- Schema usage
GRANT USAGE ON SCHEMA auth TO authenticated, internal;
GRANT USAGE ON SCHEMA schedule TO authenticated, internal;

-- auth.students (no INSERT/DELETE - registration/deletion handled via internal role)
GRANT SELECT, UPDATE ON auth.students TO authenticated;
GRANT ALL ON auth.students TO internal;

-- auth.users
GRANT SELECT, UPDATE ON auth.users TO authenticated;
GRANT ALL on auth.users TO internal;

-- auth.banking_details
GRANT SELECT, INSERT, UPDATE on auth.banking_details TO authenticated;
GRANT ALL on auth.banking_details TO internal;

-- auth.payments (students can view their own, admins manage all)
GRANT SELECT ON auth.payments TO authenticated;
GRANT ALL ON auth.payments TO internal;

-- schedule.time_logs
GRANT SELECT, INSERT ON schedule.time_logs TO authenticated;
GRANT ALL ON schedule.time_logs TO internal;

-- schedule.schedules
GRANT SELECT ON schedule.schedules TO authenticated;
GRANT ALL ON schedule.schedules TO internal;

---------------------------------
-- Row-level security policies --
---------------------------------

-- Enable RLS on all tables
ALTER TABLE auth.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.banking_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule.schedules ENABLE ROW LEVEL SECURITY;

-- Force RLS for all roles (including table owner)
ALTER TABLE auth.students FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.banking_details FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule.time_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule.schedules FORCE ROW LEVEL SECURITY;

-- Grant internal role bypass
CREATE POLICY internal_bypass_students ON auth.students TO internal USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY internal_bypass_users ON auth.users TO internal USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY internal_bypass_banking ON auth.banking_details TO internal USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY internal_bypass_payments ON auth.payments TO internal USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY internal_bypass_time_logs ON schedule.time_logs TO internal USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY internal_bypass_schedules ON schedule.schedules TO internal USING (TRUE) WITH CHECK (TRUE);

-- auth.students: students see only their own row, admins see all
CREATE POLICY students_select ON auth.students
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

CREATE POLICY students_update ON auth.students
    FOR UPDATE TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- auth.users: admins only
CREATE POLICY users_select ON auth.users
    FOR SELECT TO authenticated
    USING (user_has_role('admin'));

CREATE POLICY users_update ON auth.users
    FOR UPDATE TO authenticated
    USING (user_has_role('admin'));

-- auth.banking_details: students see only their own, admins see all
CREATE POLICY banking_select ON auth.banking_details
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

CREATE POLICY banking_update ON auth.banking_details
    FOR UPDATE TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

CREATE POLICY banking_insert ON auth.banking_details
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- auth.payments: students see only their own, admins see all
CREATE POLICY payments_select ON auth.payments
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- schedule.time_logs: admins only
CREATE POLICY time_logs_select ON schedule.time_logs
    FOR SELECT TO authenticated
    USING (user_has_role('admin'));

CREATE POLICY time_logs_insert ON schedule.time_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_has_role('admin'));

-- schedule.schedules: students see if their ID is in assignments, admins see all
CREATE POLICY schedules_select ON schedule.schedules
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin')
        OR assignments ? current_setting('app.current_student_id', true)
    );

-----------------------------------------
-- Application user role membership    --
-----------------------------------------

-- The helpdesk user is the PostgreSQL user that the Go backend connects as.
-- These grants allow the application to switch roles via SET ROLE within transactions:
--   - SET ROLE authenticated  (for user-authenticated requests)
--   - SET ROLE internal       (for system/background operations)
GRANT authenticated TO helpdesk;
GRANT internal TO helpdesk;