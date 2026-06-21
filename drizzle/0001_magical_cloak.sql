ALTER TABLE "services" DROP CONSTRAINT "services_coach_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_coach_id_profiles_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_private_lessons_require_coach" CHECK ("services"."type" <> 'private_lessons' OR "services"."coach_id" IS NOT NULL);