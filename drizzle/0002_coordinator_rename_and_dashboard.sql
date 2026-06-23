ALTER TYPE "public"."role" RENAME VALUE 'coach' TO 'coordinator';--> statement-breakpoint
ALTER TABLE "coaching_sessions" RENAME TO "private_lesson_sessions";--> statement-breakpoint
ALTER TABLE "services" RENAME COLUMN "coach_id" TO "coordinator_id";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" RENAME COLUMN "coach_id" TO "coordinator_id";--> statement-breakpoint
ALTER TABLE "services" RENAME CONSTRAINT "services_coach_id_profiles_id_fk" TO "services_coordinator_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "services" RENAME CONSTRAINT "services_private_lessons_require_coach" TO "services_private_lessons_require_coordinator";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" RENAME CONSTRAINT "coaching_sessions_service_id_services_id_fk" TO "private_lesson_sessions_service_id_services_id_fk";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" RENAME CONSTRAINT "coaching_sessions_coach_id_profiles_id_fk" TO "private_lesson_sessions_coordinator_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" RENAME CONSTRAINT "coaching_sessions_user_id_profiles_id_fk" TO "private_lesson_sessions_user_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" RENAME CONSTRAINT "coaching_sessions_child_id_children_id_fk" TO "private_lesson_sessions_child_id_children_id_fk";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" RENAME CONSTRAINT "coaching_sessions_stripe_order_id_unique" TO "private_lesson_sessions_stripe_order_id_unique";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" DROP COLUMN "coach_time_slots";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" DROP COLUMN "coach_token";--> statement-breakpoint
ALTER TABLE "private_lesson_sessions" DROP COLUMN "client_token";--> statement-breakpoint
CREATE TABLE "program_coordinators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"coordinator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_coordinators" ADD CONSTRAINT "program_coordinators_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_coordinators" ADD CONSTRAINT "program_coordinators_coordinator_id_profiles_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "program_coordinators_service_id_coordinator_id_idx" ON "program_coordinators" USING btree ("service_id","coordinator_id");
