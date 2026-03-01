-- Migration: 000007_users_select_self_policy
-- Description: Allow students to SELECT their own row in auth.users via RLS

CREATE POLICY users_select_self ON auth.users
    FOR SELECT TO authenticated
    USING (user_id::text = current_setting('app.current_user_id', true));
