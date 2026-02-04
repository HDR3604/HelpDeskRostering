import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://helpdesk:helpdesk_local@localhost:5432/helpdesk",
  },
});
