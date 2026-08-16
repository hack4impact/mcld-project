"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webinars } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
   createWebinarSchema,
   deleteWebinarSchema,
   parseBooleanField,
   updateWebinarSchema,
} from "./schema";

export type WebinarActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

const WEBINARS_TAG = "webinars";

function field(formData: FormData, name: string): string | undefined {
   const value = formData.get(name);
   return value === null ? undefined : value.toString();
}

function invalidateWebinars() {
   updateTag(WEBINARS_TAG);
}

function unauthorized(): WebinarActionState {
   return { errors: { _form: ["Unauthorized"] } };
}

export async function createWebinar(
   _prev: WebinarActionState,
   formData: FormData,
): Promise<WebinarActionState> {
   try {
      await requireAdmin();
   } catch {
      return unauthorized();
   }

   const parsed = createWebinarSchema.safeParse({
      title: field(formData, "title"),
      description: field(formData, "description"),
      tier: field(formData, "tier"),
      duration_minutes: field(formData, "duration_minutes"),
      youtube_url: field(formData, "youtube_url") || undefined,
      is_active: field(formData, "is_active"),
         ? parseBooleanField(formData.get("is_active"))
         : true,
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   try {
      await db.insert(webinars).values({
         title: parsed.data.title,
         description: parsed.data.description || null,
         tier: parsed.data.tier,
         durationMinutes: parsed.data.duration_minutes,
         youtubeUrl: parsed.data.youtube_url || null,
         isActive: parsed.data.is_active !== "false",
      });
   } catch (error) {
      console.error(error);
      return { errors: { _form: ["Could not create webinar"] } };
   }

   invalidateWebinars();
   return { message: "Webinar created." };
}

export async function updateWebinar(
   _prev: WebinarActionState,
   formData: FormData,
): Promise<WebinarActionState> {
   try {
      await requireAdmin();
   } catch {
      return unauthorized();
   }

   const parsed = updateWebinarSchema.safeParse({
      webinar_id: field(formData, "webinar_id"),
      title: formData.has("title") ? field(formData, "title") : undefined,
      description: formData.has("description")
         ? (field(formData, "description") ?? "")
         : undefined,
      tier: formData.has("tier") ? field(formData, "tier") : undefined,
      duration_minutes: formData.has("duration_minutes")
         ? field(formData, "duration_minutes")
         : undefined,
      youtube_url: formData.has("youtube_url")
         ? (field(formData, "youtube_url") ?? "")
         : undefined,
      is_active: formData.has("is_active")
         ? parseBooleanField(formData.get("is_active"))
         : undefined,
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const [existing] = await db
      .select({ id: webinars.id })
      .from(webinars)
      .where(eq(webinars.id, parsed.data.webinar_id))
      .limit(1);

   if (!existing) {
      return { errors: { _form: ["Webinar not found"] } };
   }

   const patch: Partial<typeof webinars.$inferInsert> = {
      updatedAt: new Date(),
   };
   if (parsed.data.title !== undefined) patch.title = parsed.data.title;
   if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description || null;
   }
   if (parsed.data.tier !== undefined) patch.tier = parsed.data.tier;
   if (parsed.data.duration_minutes !== undefined) {
      patch.durationMinutes = parsed.data.duration_minutes;
   }
   if (parsed.data.youtube_url !== undefined) {
      patch.youtubeUrl = parsed.data.youtube_url || null;
   }
   if (parsed.data.is_active !== undefined) {
      patch.isActive = parsed.data.is_active;
   }

   try {
      await db
         .update(webinars)
         .set(patch)
         .where(eq(webinars.id, parsed.data.webinar_id));
   } catch (error) {
      console.error(error);
      return { errors: { _form: ["Could not update webinar"] } };
   }

   invalidateWebinars();
   return { message: "Webinar updated." };
}

export async function deleteWebinar(
   _prev: WebinarActionState,
   formData: FormData,
): Promise<WebinarActionState> {
   try {
      await requireAdmin();
   } catch {
      return unauthorized();
   }

   const parsed = deleteWebinarSchema.safeParse({
      webinar_id: field(formData, "webinar_id"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const deleted = await db
      .delete(webinars)
      .where(eq(webinars.id, parsed.data.webinar_id))
      .returning({ id: webinars.id });

   if (!deleted.length) {
      return { errors: { _form: ["Webinar not found"] } };
   }

   invalidateWebinars();
   return { message: "Webinar deleted." };
}
