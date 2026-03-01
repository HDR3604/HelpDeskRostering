-- Migration: 000007_add_user_names
-- Description: Add first_name and last_name columns to auth.users

ALTER TABLE "auth"."users"
    ADD COLUMN "first_name" varchar(50) NOT NULL DEFAULT '',
    ADD COLUMN "last_name" varchar(100) NOT NULL DEFAULT '';
