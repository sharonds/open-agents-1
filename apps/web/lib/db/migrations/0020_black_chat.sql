ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "hide_tool_details" boolean;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "hide_tool_details" SET DEFAULT false;--> statement-breakpoint
UPDATE "sessions" SET "hide_tool_details" = false WHERE "hide_tool_details" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "hide_tool_details" SET NOT NULL;