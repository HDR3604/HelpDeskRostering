-- +goose Up
-- Migration: 000012_student_banking_consent
-- Description: Create student_banking_consent table for Data Protection Act 2011 compliance

CREATE TABLE auth.student_banking_consent (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      INT NOT NULL REFERENCES auth.students(student_id),
    consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    consent_version TEXT NOT NULL,
    ip_address      INET
);

CREATE INDEX idx_student_banking_consent_student_id ON auth.student_banking_consent(student_id);

-- Grants
GRANT SELECT, INSERT ON auth.student_banking_consent TO authenticated;
GRANT ALL ON auth.student_banking_consent TO internal;

-- RLS
ALTER TABLE auth.student_banking_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.student_banking_consent FORCE ROW LEVEL SECURITY;

-- Internal bypass
CREATE POLICY internal_bypass_student_banking_consent ON auth.student_banking_consent
    TO internal USING (TRUE) WITH CHECK (TRUE);

-- Students can read only their own consent records, admins can read all
CREATE POLICY consent_select ON auth.student_banking_consent
    FOR SELECT TO authenticated
    USING (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- Students can insert their own consent records, admins can insert any
CREATE POLICY consent_insert ON auth.student_banking_consent
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_role('admin') OR student_owns_record(student_id)
    );

-- No UPDATE or DELETE policies — consent records are immutable

-- +goose Down
-- Migration: 000012_student_banking_consent (DOWN)
DROP TABLE IF EXISTS auth.student_banking_consent;
