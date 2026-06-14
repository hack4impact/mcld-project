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
   uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type ProgramSlot = { dayOfWeek: number; time: string };

export type FormQuestionOption = {
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
   "awaiting_payment",
   "pending",
   "confirmed",
   "cancelled",
]);
export const webinarTierEnum = pgEnum("webinar_tier", ["free", "premium"]);
export const sessionStatusEnum = pgEnum("session_status", [
   "awaiting_payment",
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
export const formQuestionTypeEnum = pgEnum("form_question_type", [
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
   lastLoginAt: timestamp('last_login_at').defaultNow().notNull()
});

export const forms = pgTable("forms", {
   id: uuid("id").primaryKey().defaultRandom(),
   name: text("name").notNull(),
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
   coachId: uuid("coach_id").references(() => profiles.id, {
      onDelete: "set null",
   }),
   formId: uuid("form_id").references(() => forms.id, { onDelete: "set null" }),
   isForChildren: boolean("is_for_children").notNull().default(false),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceBookings = pgTable(
   "service_bookings",
   {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: uuid("user_id")
         .references(() => profiles.id, { onDelete: "cascade" })
         .notNull(),
      serviceId: uuid("service_id")
         .references(() => services.id, { onDelete: "cascade" })
         .notNull(),
      childId: uuid("child_id").references(() => children.id, {
         onDelete: "cascade",
      }),
      status: bookingStatusEnum("status").notNull().default("pending"),
      notes: text("notes"),
      isActive: boolean("is_active").notNull().default(true),
      stripeOrderId: text("stripe_order_id").unique(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
   },
   (t) => [
      uniqueIndex("service_bookings_service_id_child_id_idx")
         .on(t.serviceId, t.childId)
         .where(sql`${t.childId} is not null`),
   ],
);

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
   childId: uuid("child_id").references(() => children.id, {
      onDelete: "cascade",
   }),
   scheduledAt: timestamp("scheduled_at"),
   status: sessionStatusEnum("status").notNull().default("pending"),
   meetingUrl: text("meeting_url"),
   notes: text("notes"),
   selectedTimeSlots: jsonb("selected_time_slots").notNull(),
   coachTimeSlots: jsonb("coach_time_slots"),
   coachToken: text("coach_token").unique(),
   clientToken: text("client_token").unique(),
   stripeOrderId: text("stripe_order_id").unique(),
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

export const formQuestions = pgTable("form_questions", {
   id: uuid("id").primaryKey().defaultRandom(),
   formId: uuid("form_id")
      .references(() => forms.id, { onDelete: "cascade" })
      .notNull(),
   type: formQuestionTypeEnum("type").notNull(),
   prompt: text("prompt").notNull(),
   options: jsonb("options").$type<FormQuestionOption[]>(),
   sortOrder: integer("sort_order").notNull().default(0),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formQuestionAnswers = pgTable("form_question_answers", {
   id: uuid("id").primaryKey().defaultRandom(),
   formQuestionId: uuid("form_question_id")
      .references(() => formQuestions.id, { onDelete: "cascade" })
      .notNull(),
   childId: uuid("child_id")
      .references(() => children.id, { onDelete: "cascade" })
      .notNull(),
   answer: text("answer").array().notNull(),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
