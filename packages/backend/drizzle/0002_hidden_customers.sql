CREATE TABLE IF NOT EXISTS "hidden_customers" (
  "phone" text PRIMARY KEY NOT NULL,
  "hidden_at" timestamp with time zone DEFAULT now() NOT NULL
);
