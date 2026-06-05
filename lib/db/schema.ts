import {
   pgTable,
   foreignKey,
   uuid,
   text,
   date,
   timestamp,
   jsonb,
   integer,
   unique,
   boolean,
   pgEnum,
} from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", [
   "awaiting_payment",
   "pending",
   "confirmed",
   "cancelled",
]);
export const extraQuestionType = pgEnum("extra_question_type", [
   "text",
   "multiple_choices",
   "checkboxes",
   "user_agreement",
]);
export const gender = pgEnum("gender", [
   "male",
   "female",
   "prefer_not_to_say",
]);
export const role = pgEnum("role", ["user", "admin", "coach"]);
export const serviceStatus = pgEnum("service_status", [
   "active",
   "archived",
   "deleted",
   "disabled",
]);
export const serviceType = pgEnum("service_type", [
   "private_lessons",
   "programs",
]);
export const sessionStatus = pgEnum("session_status", [
   "awaiting_payment",
   "pending",
   "confirmed",
   "cancelled",
   "completed",
]);
export const webinarTier = pgEnum("webinar_tier", ["free", "premium"]);

export const children = pgTable(
   "children",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      parentId: uuid("parent_id").notNull(),
      gender: gender().notNull(),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      dob: date().notNull(),
      allergies: text(),
      medicalConditions: text("medical_conditions"),
      medications: text(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
   },
   (table) => [
      foreignKey({
         columns: [table.parentId],
         foreignColumns: [profiles.id],
         name: "children_parent_id_profiles_id_fk",
      }).onDelete("cascade"),
   ],
);

export const extraQuestionAnswers = pgTable(
   "extra_question_answers",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      extraQuestionId: uuid("extra_question_id").notNull(),
      childId: uuid("child_id").notNull(),
      answer: text().array().notNull(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
   },
   (table) => [
      foreignKey({
         columns: [table.childId],
         foreignColumns: [children.id],
         name: "extra_question_answers_child_id_children_id_fk",
      }).onDelete("cascade"),
      foreignKey({
         columns: [table.extraQuestionId],
         foreignColumns: [extraQuestions.id],
         name: "extra_question_answers_extra_question_id_extra_questions_id_fk",
      }).onDelete("cascade"),
   ],
);

export const emergencyContacts = pgTable(
   "emergency_contacts",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      childId: uuid("child_id").notNull(),
      fullName: text("full_name").notNull(),
      emailAddress: text("email_address").notNull(),
      phoneNumber: text("phone_number").notNull(),
      relationship: text().notNull(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
   },
   (table) => [
      foreignKey({
         columns: [table.childId],
         foreignColumns: [children.id],
         name: "emergency_contacts_child_id_children_id_fk",
      }).onDelete("cascade"),
   ],
);

export const extraQuestions = pgTable(
   "extra_questions",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      type: extraQuestionType().notNull(),
      prompt: text().notNull(),
      options: jsonb(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      formId: uuid("form_id").notNull(),
      sortOrder: integer("sort_order").notNull(),
   },
   (table) => [
      foreignKey({
         columns: [table.formId],
         foreignColumns: [forms.id],
         name: "extra_questions_form_id_forms_id_fk",
      }).onDelete("cascade"),
   ],
);

export const coachingSessions = pgTable(
   "coaching_sessions",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      coachId: uuid("coach_id").notNull(),
      userId: uuid("user_id").notNull(),
      scheduledAt: timestamp("scheduled_at", { mode: "string" }),
      status: sessionStatus().default("pending").notNull(),
      meetingUrl: text("meeting_url"),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      serviceId: uuid("service_id").notNull(),
      selectedTimeSlots: jsonb("selected_time_slots").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      stripeOrderId: text("stripe_order_id"),
      coachTimeSlots: jsonb("coach_time_slots"),
      coachToken: text("coach_token"),
      clientToken: text("client_token"),
   },
   (table) => [
      foreignKey({
         columns: [table.coachId],
         foreignColumns: [profiles.id],
         name: "coaching_sessions_coach_id_profiles_id_fk",
      }).onDelete("cascade"),
      foreignKey({
         columns: [table.serviceId],
         foreignColumns: [services.id],
         name: "coaching_sessions_service_id_services_id_fk",
      }).onDelete("cascade"),
      foreignKey({
         columns: [table.userId],
         foreignColumns: [profiles.id],
         name: "coaching_sessions_user_id_profiles_id_fk",
      }).onDelete("cascade"),
      unique("coaching_sessions_stripe_order_id_unique").on(
         table.stripeOrderId,
      ),
      unique("coaching_sessions_coach_token_unique").on(table.coachToken),
      unique("coaching_sessions_client_token_unique").on(table.clientToken),
   ],
);

export const forms = pgTable("forms", {
   id: uuid().defaultRandom().primaryKey().notNull(),
   name: text().notNull(),
   createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
   updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const serviceBookings = pgTable(
   "service_bookings",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      userId: uuid("user_id").notNull(),
      serviceId: uuid("service_id").notNull(),
      status: bookingStatus().default("pending").notNull(),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      isActive: boolean("is_active").default(true).notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      stripeOrderId: text("stripe_order_id"),
   },
   (table) => [
      foreignKey({
         columns: [table.serviceId],
         foreignColumns: [services.id],
         name: "service_bookings_service_id_services_id_fk",
      }).onDelete("cascade"),
      foreignKey({
         columns: [table.userId],
         foreignColumns: [profiles.id],
         name: "service_bookings_user_id_profiles_id_fk",
      }).onDelete("cascade"),
      unique("service_bookings_stripe_order_id_unique").on(
         table.stripeOrderId,
      ),
   ],
);

export const services = pgTable(
   "services",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      type: serviceType().notNull(),
      durationMinutes: integer("duration_minutes").notNull(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      stripeProductId: text("stripe_product_id").notNull(),
      status: serviceStatus().default("active").notNull(),
      startDate: date("start_date"),
      endDate: date("end_date"),
      slots: jsonb(),
      coachId: uuid("coach_id"),
      formId: uuid("form_id"),
   },
   (table) => [
      foreignKey({
         columns: [table.coachId],
         foreignColumns: [profiles.id],
         name: "services_coach_id_profiles_id_fk",
      }).onDelete("set null"),
      foreignKey({
         columns: [table.formId],
         foreignColumns: [forms.id],
         name: "services_form_id_forms_id_fk",
      }).onDelete("set null"),
   ],
);

export const webinars = pgTable("webinars", {
   id: uuid().defaultRandom().primaryKey().notNull(),
   title: text().notNull(),
   description: text(),
   tier: webinarTier().default("free").notNull(),
   durationMinutes: integer("duration_minutes").notNull(),
   youtubeUrl: text("youtube_url"),
   isActive: boolean("is_active").default(true).notNull(),
   createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
   updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const profiles = pgTable(
   "profiles",
   {
      id: uuid().primaryKey().notNull(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      role: role().default("user").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      stripeCustomerId: text("stripe_customer_id"),
      lastLoginAt: timestamp("last_login_at", { mode: "string" })
         .defaultNow()
         .notNull(),
   },
   (table) => [
      unique("profiles_stripe_customer_id_unique").on(table.stripeCustomerId),
   ],
);

export const purchases = pgTable(
   "purchases",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      userId: uuid("user_id").notNull(),
      stripePriceId: text("stripe_price_id").notNull(),
      stripeSessionId: text("stripe_session_id").notNull(),
      productName: text("product_name").notNull(),
      amount: integer().notNull(),
      currency: text().notNull(),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
   },
   (table) => [
      foreignKey({
         columns: [table.userId],
         foreignColumns: [profiles.id],
         name: "purchases_user_id_profiles_id_fk",
      }).onDelete("cascade"),
      unique("purchases_stripe_session_id_unique").on(table.stripeSessionId),
   ],
);

export const subscriptions = pgTable(
   "subscriptions",
   {
      id: uuid().defaultRandom().primaryKey().notNull(),
      userId: uuid("user_id").notNull(),
      stripeSubscriptionId: text("stripe_subscription_id"),
      status: text().default("none").notNull(),
      stripePriceId: text("stripe_price_id"),
      cancelAtPeriodEnd: boolean("cancel_at_period_end")
         .default(false)
         .notNull(),
      paymentMethodBrand: text("payment_method_brand"),
      paymentMethodLast4: text("payment_method_last4"),
      createdAt: timestamp("created_at", { mode: "string" })
         .defaultNow()
         .notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" })
         .defaultNow()
         .notNull(),
   },
   (table) => [
      foreignKey({
         columns: [table.userId],
         foreignColumns: [profiles.id],
         name: "subscriptions_user_id_profiles_id_fk",
      }).onDelete("cascade"),
      unique("subscriptions_user_id_unique").on(table.userId),
      unique("subscriptions_stripe_subscription_id_unique").on(
         table.stripeSubscriptionId,
      ),
   ],
);
