import {
   pgTable,
   text,
   timestamp,
   uuid,
   pgEnum,
   integer,
   boolean,
   jsonb,
   date,
} from "drizzle-orm/pg-core";

export type ProgramSlot = { dayOfWeek: number; time: string };

export type ExtraQuestionOption = {
   id: string;
   title: string;
   description?: string;
};

export const roleEnum = pgEnum("role", ["user", "admin", "coach"]);
export const serviceTypeEnum = pgEnum("service_type", [
   "private_lessons",
   "programs",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
   "pending",
   "confirmed",
   "cancelled",
]);
export const webinarTierEnum = pgEnum("webinar_tier", ["free", "premium"]);
export const sessionStatusEnum = pgEnum("session_status", [
   "pending",
   "confirmed",
   "cancelled",
   "completed",
]);
export const serviceStatusEnum = pgEnum("service_status", [
   "active",
   "archived",
   "deleted",
   "disabled",
]);
export const genderEnum = pgEnum("gender", ["male", "female", "prefer_not_to_say"]);
export const extraQuestionTypeEnum = pgEnum("extra_question_type", [
   "text",
   "multiple_choices",
   "checkboxes",
   "user_agreement",
]);

export const profiles = pgTable("profiles", {
   id: uuid("id").primaryKey(),
   firstName: text("first_name").notNull(),
   lastName: text("last_name").notNull(),
   role: roleEnum("role").notNull().default("user"),
   stripeCustomerId: text("stripe_customer_id").unique(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
   id: uuid("id").primaryKey().defaultRandom(),
   type: serviceTypeEnum("type").notNull(),
   startDate: date("start_date", { mode: "string" }),
   endDate: date("end_date", { mode: "string" }),
   slots: jsonb("slots").$type<ProgramSlot[]>(),
   durationMinutes: integer("duration_minutes").notNull(),
   stripeProductId: text("stripe_product_id").notNull(),
   status: serviceStatusEnum("status").notNull().default("active"),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceBookings = pgTable("service_bookings", {
   id: uuid("id").primaryKey().defaultRandom(),
   userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
   serviceId: uuid("service_id")
      .references(() => services.id, { onDelete: "cascade" })
      .notNull(),
   status: bookingStatusEnum("status").notNull().default("pending"),
   notes: text("notes"),
   isActive: boolean("is_active").notNull().default(true),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webinars = pgTable("webinars", {
   id: uuid("id").primaryKey().defaultRandom(),
   title: text("title").notNull(),
   description: text("description"),
   tier: webinarTierEnum("tier").notNull().default("free"),
   durationMinutes: integer("duration_minutes").notNull(),
   youtubeUrl: text("youtube_url"),
   isActive: boolean("is_active").notNull().default(true),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coachingSessions = pgTable("coaching_sessions", {
   id: uuid("id").primaryKey().defaultRandom(),
   serviceId: uuid("service_id")
      .references(() => services.id, { onDelete: "cascade" })
      .notNull(),
   coachId: uuid("coach_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
   userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
   scheduledAt: timestamp("scheduled_at"),
   durationMinutes: integer("duration_minutes").notNull().default(60),
   status: sessionStatusEnum("status").notNull().default("pending"),
   meetingUrl: text("meeting_url"),
   notes: text("notes"),
   selectedTimeSlots: jsonb("selected_time_slots").notNull(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
   id: uuid("id").primaryKey().defaultRandom(),
   userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
   stripeSubscriptionId: text("stripe_subscription_id").unique(),
   status: text("status").notNull().default("none"),
   stripePriceId: text("stripe_price_id"),
   cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
   paymentMethodBrand: text("payment_method_brand"),
   paymentMethodLast4: text("payment_method_last4"),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
   id: uuid("id").primaryKey().defaultRandom(),
   userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
   stripePriceId: text("stripe_price_id").notNull(),
   stripeSessionId: text("stripe_session_id").notNull().unique(),
   productName: text("product_name").notNull(),
   amount: integer("amount").notNull(),
   currency: text("currency").notNull(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const children = pgTable("children", {
   id: uuid("id").primaryKey().defaultRandom(),
   parentId: uuid("parent_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
   gender: genderEnum("gender").notNull(),
   firstName: text("first_name").notNull(),
   lastName: text("last_name").notNull(),
   dob: date("dob", { mode: "string" }).notNull(),
   allergies: text("allergies"),
   medicalConditions: text("medical_conditions"),
   medications: text("medications"),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
   id: uuid("id").primaryKey().defaultRandom(),
   childId: uuid("child_id")
      .references(() => children.id, { onDelete: "cascade" })
      .notNull(),
   fullName: text("full_name").notNull(),
   emailAddress: text("email_address").notNull(),
   phoneNumber: text("phone_number").notNull(),
   relationship: text("relationship").notNull(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const extraQuestions = pgTable("extra_questions", {
   id: uuid("id").primaryKey().defaultRandom(),
   serviceId: uuid("service_id")
      .references(() => services.id, { onDelete: "cascade" })
      .notNull(),
   type: extraQuestionTypeEnum("type").notNull(),
   prompt: text("prompt").notNull(),
   options: jsonb("options").$type<ExtraQuestionOption[]>(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const extraQuestionAnswers = pgTable("extra_question_answers", {
   id: uuid("id").primaryKey().defaultRandom(),
   extraQuestionId: uuid("extra_question_id")
      .references(() => extraQuestions.id, { onDelete: "cascade" })
      .notNull(),
   childId: uuid("child_id")
      .references(() => children.id, { onDelete: "cascade" })
      .notNull(),
   answer: text("answer").array().notNull(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
