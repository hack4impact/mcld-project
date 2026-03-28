import { pgTable, text, timestamp, uuid, pgEnum, integer,boolean,time} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "coach"]);
export const serviceTypeEnum = pgEnum('service_type', ["preset", "user_scheduling"]);
export const bookingStatusEnum = pgEnum('booking_status', ["pending", "confirmed", "cancelled"]);
export const webinarTierEnum = pgEnum('webinar_tier', ["free", "premium"]);
export const sessionStatusEnum = pgEnum("session_status", ["pending", "confirmed", "cancelled", "completed"]);


export const profiles = pgTable("profiles", {
   id: uuid("id").primaryKey(),
   firstName: text("first_name").notNull(),
   lastName: text("last_name").notNull(),
   avatarUrl: text("avatar_url"),
   role: roleEnum("role").notNull().default("user"),
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const services = pgTable("services", {
   id: uuid("id").primaryKey().defaultRandom(),
   title: text("title").notNull(),
   description: text("description"),
   type: serviceTypeEnum("type").notNull(),
   scheduledAt: timestamp("scheduled_at"),
   durationMinutes: integer("duration_minutes").notNull(),
   price: integer("price").notNull().default(0),
   isActive: boolean("is_active").notNull().default(true),
   createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const serviceBookings = pgTable("service_bookings", {

   id: uuid("id").primaryKey().defaultRandom(),
   userId: uuid("user_id").references(() => profiles.id,{onDelete: "cascade"}).notNull(),
   serviceId: uuid("service_id").references(() => services.id,{onDelete: "cascade"}).notNull(),
   scheduledAt: timestamp("scheduled_at"),
   status: bookingStatusEnum("status").notNull().default("pending"),
   notes: text("notes"),
   createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webinars = pgTable("webinars", {
   id: uuid("id").primaryKey().defaultRandom(),
   title: text("title").notNull(),
   description: text("description"),
   tier: webinarTierEnum("tier").notNull().default("free"),
   scheduledAt: timestamp("scheduled_at").notNull(),
   durationMinutes: integer("duration_minutes").notNull(),
   meetingUrl: text("meeting_url"),
   maxSeats: integer("max_seats"),
   price: integer("price").notNull().default(0),
   isActive: boolean("is_active").notNull().default(true),
   createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const webinarRegistrations = pgTable("webinar_registrations", {
   id: uuid("id").primaryKey().defaultRandom(),
   userId: uuid("user_id").references(() => profiles.id,{onDelete: "cascade"}).notNull(),
   webinarId: uuid("webinar_id").references(() => webinars.id,{onDelete: "cascade"}).notNull(),
   registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const coachingSessions = pgTable("coaching_sessions", {
   id: uuid("id").primaryKey().defaultRandom(),
   coachId: uuid("coach_id").references(() => profiles.id,{onDelete: "cascade"}).notNull(),
   userId: uuid("user_id").references(() => profiles.id,{onDelete: "cascade"}).notNull(),
   scheduledAt: timestamp("scheduled_at").notNull(),
   durationMinutes: integer("duration_minutes").notNull().default(60),
   status: sessionStatusEnum("status").notNull().default("pending"),
   meetingUrl: text("meeting_url"),
   notes: text("notes"),
   createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coachAvailability = pgTable("coach_availability", {
   id: uuid("id").primaryKey().defaultRandom(),
   coachId: uuid("coach_id").references(() => profiles.id,{onDelete: "cascade"}).notNull(),
   dayOfWeek: integer("day_of_week").notNull(),
   startTime: time("start_time").notNull(),
   endTime: time("end_time").notNull(),
   isActive: boolean("is_active").notNull().default(true),
   createdAt: timestamp("created_at").defaultNow().notNull(),
});