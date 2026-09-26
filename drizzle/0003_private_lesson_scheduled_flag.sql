ALTER TABLE "services" ADD COLUMN "is_scheduled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" ALTER COLUMN "selected_time_slots" DROP NOT NULL;
