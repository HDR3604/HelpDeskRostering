-- Rollback: 000007_add_user_names

ALTER TABLE "auth"."users"
    DROP COLUMN "first_name",
    DROP COLUMN "last_name";
