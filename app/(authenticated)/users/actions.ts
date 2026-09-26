"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-users";
import { profiles, services } from "@/lib/db/schema";
import {
   sendAccountDeletedNotice,
   sendEmailChangeRequest,
   sendInviteEmail,
   sendNotice,
   sendRoleChangedNotice,
} from "@/lib/auth/account-emails";
import { requireAdmin } from "@/lib/auth/require-admin";
import { emailConfirmationRequired } from "@/lib/auth/supabase-settings";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Role } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { profileRoleLabel } from "./profile-role-label";
import { createUserAdminSchema, updateUserAdminSchema } from "./schema";
import { grantComplimentarySubscription , stripe} from "@/lib/stripe";
import type Stripe from "stripe";
import { getTransactionsSchema, createRefundSchema} from "./schema";

export type UserAdminActionState = {
   errors?: Record<string, string[]>;
   message?: string;
   data?: Record<string, string>;
} | null;

export type RefundActionState = {
   errors?: Record<string, string[]>;
   message?: string;
   status?: "succeeded" | "pending" | "failed";
   refund?: TransactionRefund;
   updatedTransaction? : UserTransaction;
} | null

const USERS_PATH = "/users";

type AdminClient = ReturnType<typeof createAdminClient>;

const EMAIL_CHANGE_LINK_LIFETIME_MS = 60 * 60 * 1000;

function tokenHashFromLink(actionLink: string): string | null {
   try {
      return new URL(actionLink).searchParams.get("token");
   } catch {
      return null;
   }
}

function emailChangeErrorMessage(error: { code?: string; message: string }) {
   if (error.code === "email_exists") {
      return "Another account already uses this email.";
   }
   if (/secure email change/i.test(error.message)) {
      return "Secure email change is turned off in Supabase Auth. Turn it on so the current address has to approve changes.";
   }
   return "Could not start the email change. Please try again.";
}

async function requestEmailChange(
   admin: AdminClient,
   params: { firstName: string; currentEmail: string; newEmail: string },
): Promise<string | null> {
   const current = await admin.auth.admin.generateLink({
      type: "email_change_current",
      email: params.currentEmail,
      newEmail: params.newEmail,
   });
   if (current.error) return emailChangeErrorMessage(current.error);

   const next = await admin.auth.admin.generateLink({
      type: "email_change_new",
      email: params.currentEmail,
      newEmail: params.newEmail,
   });
   if (next.error) return emailChangeErrorMessage(next.error);

   const currentTokenHash = tokenHashFromLink(current.data.properties.action_link);
   const newTokenHash = tokenHashFromLink(next.data.properties.action_link);
   if (!currentTokenHash || !newTokenHash) {
      return "Could not start the email change. Please try again.";
   }

   try {
      await sendEmailChangeRequest({
         firstName: params.firstName,
         currentEmail: params.currentEmail,
         newEmail: params.newEmail,
         currentTokenHash,
         newTokenHash,
      });
   } catch (error) {
      console.error("[updateUserAdmin] email change emails failed", error);
      return "Could not send the confirmation emails, so the email wasn't changed. Please try again.";
   }
   return null;
}

async function rollBackNewInvite(
   admin: AdminClient,
   userId: string,
   invitedAt: string | undefined,
): Promise<void> {
   const { data } = await admin.auth.admin.getUserById(userId);
   const user = data?.user;
   if (!user || user.email_confirmed_at || user.invited_at !== invitedAt) {
      return;
   }
   await admin.auth.admin.deleteUser(userId);
   await db
      .delete(profiles)
      .where(eq(profiles.id, userId))
      .catch(() => undefined);
}

export async function updateUserAdmin(
   _prev: UserAdminActionState,
   formData: FormData,
): Promise<UserAdminActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = updateUserAdminSchema.safeParse({
      user_id: formData.get("user_id"),
      email: formData.get("email"),
      role: formData.get("role"),
      address: formData.get("address"),
      gender: formData.get("gender"),
      dob: formData.get("dob"),
      phone: formData.get("phone"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { user_id, email, role, address, gender, dob, phone } = parsed.data;

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user_id),
   });

   if (!profile) {
      return { errors: { _form: ["User not found"] } };
   }

   const admin = createAdminClient();
   const { data: authData, error: getUserError } =
      await admin.auth.admin.getUserById(user_id);
   const authUser = authData?.user;
   if (getUserError || !authUser) {
      return { errors: { _form: ["User not found"] } };
   }

   const currentEmail = authUser.email ?? "";
   const confirmed = Boolean(authUser.email_confirmed_at);
   const emailChanged = email.toLowerCase() !== currentEmail.toLowerCase();
   const changeSentAt = Date.parse(authUser.email_change_sent_at ?? "");
   const emailChangePending =
      emailChanged &&
      authUser.new_email?.toLowerCase() === email.toLowerCase() &&
      Date.now() - changeSentAt < EMAIL_CHANGE_LINK_LIFETIME_MS;

   if (emailChanged) {
      if (!confirmed) {
         return {
            errors: {
               email: [
                  "This user hasn't accepted their invitation yet, so their email can't be changed. Delete the account and invite the right address instead.",
               ],
            },
         };
      }
      let confirmationRequired: boolean;
      try {
         confirmationRequired = await emailConfirmationRequired();
      } catch (error) {
         console.error("[updateUserAdmin] auth settings check failed", error);
         return {
            errors: {
               email: [
                  "Could not check Supabase's email settings, so nothing was changed. Please try again.",
               ],
            },
         };
      }
      if (!confirmationRequired) {
         return {
            errors: {
               email: [
                  "Email changes need Supabase's “Confirm email” setting turned on, so both addresses have to approve. Turn it on under Authentication → Sign In / Providers → Email, then try again.",
               ],
            },
         };
      }
   }

   const { error: authError } = await admin.auth.admin.updateUserById(user_id, {
      app_metadata: { user_role: role },
   });

   if (authError) {
      const message = /prod_|price_|stripe/i.test(authError.message)
         ? "Something went wrong. Please try again."
         : authError.message;
      return { errors: { _form: [message] } };
   }

   try {
      await db
         .update(profiles)
         .set({
            role: role as Role,
            address,
            gender,
            dob,
            phone,
            updatedAt: new Date(),
         })
         .where(eq(profiles.id, user_id));
   } catch {
      return {
         errors: { _form: ["Failed to update profile. Please try again."] },
      };
   }

   const messages = ["User updated."];
   if (profile.role !== role && confirmed && currentEmail) {
      const sent = await sendNotice("role changed", () =>
         sendRoleChangedNotice({
            to: currentEmail,
            firstName: profile.firstName,
            oldRole: profileRoleLabel(profile.role),
            newRole: profileRoleLabel(role),
         }),
      );
      if (!sent) messages.push("The role-change email couldn't be sent.");
   }

   if (emailChanged) {
      if (emailChangePending) {
         messages.push(
            `A change to ${email} is already waiting for both addresses to confirm.`,
         );
      } else {
         const emailError = await requestEmailChange(admin, {
            firstName: profile.firstName,
            currentEmail,
            newEmail: email,
         });
         if (emailError) {
            revalidatePath(USERS_PATH);
            return {
               errors: {
                  email: [
                     `Your other changes were saved, but the email wasn't changed: ${emailError}`,
                  ],
               },
            };
         }
         messages.push(
            `Confirmation links were sent to ${currentEmail} and ${email}; the email changes once both are confirmed.`,
         );
      }
   }

   revalidatePath(USERS_PATH);
   return { message: messages.join(" ") };
}

export async function createUserAdmin(
   _prev: UserAdminActionState,
   formData: FormData,
): Promise<UserAdminActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = createUserAdminSchema.safeParse({
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      role: formData.get("role"),
      subscription_months: formData.get("subscription_months") ?? "0",
      address: formData.get("address"),
      gender: formData.get("gender"),
      dob: formData.get("dob"),
      phone: formData.get("phone"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const {
      first_name,
      last_name,
      email,
      role,
      subscription_months,
      address,
      gender,
      dob,
      phone,
   } = parsed.data;

   const [existing] = await db
      .select({
         id: authUsers.id,
         emailConfirmedAt: authUsers.emailConfirmedAt,
         invitedAt: authUsers.invitedAt,
      })
      .from(authUsers)
      .where(sql`lower(${authUsers.email}) = lower(${email})`)
      .limit(1);

   if (existing?.emailConfirmedAt) {
      return { errors: { email: ["A user with this email already exists."] } };
   }
   if (existing && !existing.invitedAt) {
      return {
         errors: {
            email: [
               "Someone started signing up with this email but never confirmed it. Delete that account from the Users list, then send the invitation.",
            ],
         },
      };
   }

   const admin = createAdminClient();
   const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { first_name, last_name } },
   });

   if (linkError || !link.user) {
      if (linkError?.code === "email_exists") {
         return { errors: { email: ["A user with this email already exists."] } };
      }
      console.error("[createUserAdmin] invite link failed", linkError);
      return {
         errors: { _form: ["Could not create the account. Please try again."] },
      };
   }

   const userId = link.user.id;
   const inviteTokenHash = tokenHashFromLink(link.properties.action_link);

   try {
      if (!inviteTokenHash) throw new Error("Invite link has no token");

      await db
         .insert(profiles)
         .values({
            id: userId,
            firstName: first_name,
            lastName: last_name,
            role: role as Role,
            address,
            gender,
            dob,
            phone,
            lastLoginAt: new Date(),
         })
         .onConflictDoUpdate({
            target: profiles.id,
            set: {
               firstName: first_name,
               lastName: last_name,
               role: role as Role,
               address,
               gender,
               dob,
               phone,
               updatedAt: new Date(),
            },
         });

      const { error: metadataError } = await admin.auth.admin.updateUserById(
         userId,
         { app_metadata: { user_role: role } },
      );
      if (metadataError) throw metadataError;
   } catch (error) {
      console.error("[createUserAdmin] account setup failed", error);
      if (!existing) {
         await rollBackNewInvite(admin, userId, link.user.invited_at);
      }
      return {
         errors: {
            _form: [
               "Could not set up the account, so no invitation was sent. Please try again.",
            ],
         },
      };
   }

   if (role === ROLES.USER && subscription_months > 0) {
      try {
         await grantComplimentarySubscription(
            userId,
            email,
            subscription_months,
         );
      } catch (error) {
         console.error("[createUserAdmin] complimentary subscription failed", error);
         revalidatePath(USERS_PATH);
         return {
            errors: {
               _form: [
                  "The account was created, but the complimentary subscription could not be added, so no invitation was sent. Submit the form again to retry.",
               ],
            },
            data: { user_id: userId },
         };
      }
   }

   try {
      await sendInviteEmail({
         to: email,
         firstName: first_name,
         tokenHash: inviteTokenHash,
      });
   } catch (error) {
      console.error("[createUserAdmin] invitation email failed", error);
      revalidatePath(USERS_PATH);
      return {
         errors: {
            _form: [
               "The account is set up, but the invitation email could not be sent. Use “Resend invitation” on the user's row to try again.",
            ],
         },
         data: { user_id: userId },
      };
   }

   revalidatePath(USERS_PATH);
   return {
      message: `Invitation sent to ${email}.`,
      data: { user_id: userId },
   };
}

const userIdSchema = z.object({
   user_id: z.string().uuid(),
});

const INVITE_RESEND_COOLDOWN_MS = 60_000;

export async function resendInviteAdmin(
   _prev: UserAdminActionState,
   formData: FormData,
): Promise<UserAdminActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = userIdSchema.safeParse({ user_id: formData.get("user_id") });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const admin = createAdminClient();
   const { data, error } = await admin.auth.admin.getUserById(
      parsed.data.user_id,
   );
   const user = data?.user;
   if (error || !user?.email) {
      return { errors: { _form: ["User not found."] } };
   }
   if (user.email_confirmed_at) {
      return {
         errors: {
            _form: [
               "This user already accepted their invitation. If they never set a password, they can use “Forgot password?” on the login page.",
            ],
         },
      };
   }
   if (!user.invited_at) {
      return {
         errors: {
            _form: [
               "This user signed up themselves. They can get a new confirmation email from the login page.",
            ],
         },
      };
   }
   if (Date.now() - Date.parse(user.invited_at) < INVITE_RESEND_COOLDOWN_MS) {
      return {
         errors: {
            _form: [
               "An invitation was sent less than a minute ago. Wait a moment before resending.",
            ],
         },
      };
   }

   const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: user.email,
   });
   const tokenHash = link?.properties
      ? tokenHashFromLink(link.properties.action_link)
      : null;
   if (linkError || !tokenHash) {
      console.error("[resendInviteAdmin] invite link failed", linkError);
      return {
         errors: { _form: ["Could not create a new invitation. Please try again."] },
      };
   }

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: { firstName: true },
   });

   try {
      await sendInviteEmail({
         to: user.email,
         firstName: profile?.firstName ?? null,
         tokenHash,
      });
   } catch (error) {
      console.error("[resendInviteAdmin] invitation email failed", error);
      return {
         errors: {
            _form: ["The invitation email could not be sent. Please try again."],
         },
      };
   }

   revalidatePath(USERS_PATH);
   return { message: `Invitation re-sent to ${user.email}.` };
}

export async function deleteUserAdmin(
   _prev: UserAdminActionState,
   formData: FormData,
): Promise<UserAdminActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = userIdSchema.safeParse({
      user_id: formData.get("user_id"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { user_id } = parsed.data;
   const assigned = await db
      .select({ id: services.id })
      .from(services)
      .where(
         and(
            eq(services.coordinatorId, user_id),
            eq(services.type, "private_lessons"),
         ),
      )
      .limit(1);

   if (assigned.length > 0) {
      return {
         errors: {
            _form: [
               "This coordinator is assigned to one or more private lessons. Reassign those lessons to another coordinator before deleting the account.",
            ],
         },
      };
   }

   const admin = createAdminClient();

   const { data: target } = await admin.auth.admin.getUserById(user_id);
   const recipient = target?.user?.email_confirmed_at
      ? (target.user.email ?? null)
      : null;
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user_id),
      columns: { firstName: true },
   });

   const { error: authError } = await admin.auth.admin.deleteUser(user_id);

   if (authError) {
      return { errors: { _form: [authError.message] } };
   }

   let message = "User deleted.";
   if (recipient) {
      const sent = await sendNotice("account deleted", () =>
         sendAccountDeletedNotice({
            to: recipient,
            firstName: profile?.firstName ?? null,
         }),
      );
      if (!sent) {
         message = "User deleted, but the notification email couldn't be sent.";
      }
   }

   revalidatePath(USERS_PATH);
   return { message };
}

export type TransactionRefund = {
   id:string;
   amount: number;
   status:string | null;
   created:number;
}

export type UserTransaction = {
   id: string;
   amount: number;
   amountRefunded: number;
   refunded: boolean;
   created: number;
   description: string;
   paymentIntentId: string| null;
   refunds: TransactionRefund[];
   currency: string;
}

export type PaginatedTransactions = {
   data: UserTransaction[];
   hasMore: boolean;
   firstId: string | null;
   lastId: string | null;
};

export async function getUserTransactions(
   input: {
      customerId: string;
      limit?:number;
      startingAfter?: string;
   }
): Promise<PaginatedTransactions> {
   await requireAdmin();

   const parsed = getTransactionsSchema.parse(input)

   const params: Stripe.ChargeListParams = {
      customer: parsed.customerId,
      limit: parsed.limit,
      expand: ["data.refunds", "data.payment_intent"]
   };

   if (parsed.startingAfter) {
      params.starting_after = parsed.startingAfter;
   }

   const charges = await stripe.charges.list(params)

   const data: UserTransaction[] = charges.data.map((charge)=> {
      let description = charge.description || "";
      if (!description && charge.payment_intent && typeof charge.payment_intent !== "string") {
         description = 
            charge.payment_intent.description ||
            charge.payment_intent.metadata?.productName ||
            charge.payment_intent.metadata?.description ||
            ""
         
      }
      if(!description) {
         description = charge.metadata?.productName || charge.metadata?.description || "Payment";
      }

      const refunds =
         charge.refunds?.data?.map((r) => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            created: r.created,
         })) || [];

      return {
         id: charge.id,
         amount: charge.amount,
         amountRefunded: charge.amount_refunded,
         refunded: charge.refunded,
         created: charge.created,
         description,
         paymentIntentId:
            typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null,
         refunds,
         currency: charge.currency
      }

   })

   return {
      data, 
      hasMore: charges.has_more,
      firstId: charges.data[0]?.id || null,
      lastId: charges.data[charges.data.length -1]?.id || null
   }
}

export async function createTransactionRefund(
  _prev: RefundActionState,
  formData: FormData
): Promise<RefundActionState> {
   try {
      await requireAdmin();
   } catch {
      return {errors : { _form : ["Unauthorized"]}};
   }

   const amountRaw = formData.get("amountCents");
   const amountCents = amountRaw? Number(amountRaw): undefined;

   const parsed = createRefundSchema.safeParse({
      chargeId: formData.get("chargeId"),
      amountCents,
      idempotencyKey: formData.get("idempotencyKey"),
      customerId: formData.get("customerId")
   });

   if (!parsed.success) {
      return {errors : parsed.error.flatten().fieldErrors};
   }
   const {chargeId, amountCents: refundAmount, idempotencyKey, customerId} = parsed.data;


   try {
      const charge = await stripe.charges.retrieve(chargeId);
      const chargeCustomerId =
         typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id ?? null;

      if (chargeCustomerId !== customerId){
         return {
            errors: { _form: ["Charge does not belong to this customer."] },
            status: "failed",
         };
      }

      const remainingRefundable  = charge.amount - charge.amount_refunded;

      if (remainingRefundable <= 0) {
         return {
            errors: { _form: ["This charge is already fully refunded."] },
            status: "failed",
         };
      }

      if (refundAmount !== undefined && refundAmount > remainingRefundable) {
         return {
            errors: {
               _form: ["Refund amount exceeds the remaining refundable balance."],
            },
            status: "failed",
         };
      }


      const refundParams: Stripe.RefundCreateParams = {
         charge:chargeId,
      };

      if (refundAmount !== undefined) {
         refundParams.amount = refundAmount;
      }

      const refund = await stripe.refunds.create(refundParams, { idempotencyKey
      })

      if (refund.status === "failed" || refund.status === "canceled") {
         const reason = 
            refund.failure_reason ??
            refund.status;
         return {
            errors : { _form : [`Refund ${reason}.`]},
            status: "failed",
         }
      }

      const updatedCharge = await stripe.charges.retrieve(chargeId, {
         expand: [ "refunds", "payment_intent"],
      })

      let description = updatedCharge.description || "";
      if (!description && updatedCharge.payment_intent && typeof updatedCharge.payment_intent !== "string") {
         description =
            updatedCharge.payment_intent.description ||
            updatedCharge.payment_intent.metadata?.productName ||
            updatedCharge.payment_intent.metadata?.description ||
            "";
      }
      if (!description) {
         description = updatedCharge.metadata?.productName || updatedCharge.metadata?.description || "Payment";
      }

      const refunds =
         updatedCharge.refunds?.data?.map((r: Stripe.Refund) => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            created: r.created,
         })) || [];
      
      const updatedTransaction: UserTransaction = {
         id: updatedCharge.id,
         amount: updatedCharge.amount,
         amountRefunded: updatedCharge.amount_refunded,
         refunded: updatedCharge.refunded,
         created: updatedCharge.created,
         description,
         paymentIntentId:
            typeof updatedCharge.payment_intent === "string"
               ? updatedCharge.payment_intent
               : updatedCharge.payment_intent?.id || null,
         refunds,
         currency: updatedCharge.currency,

      }

      return {
         message:
            refund.status === "succeeded"
               ? "Refund issued successfully."
               : "Refund pending.",
         status: refund.status === "succeeded" ? "succeeded" : "pending",
         refund: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
            created: refund.created,
         },
         updatedTransaction,
      };


   } catch (error) {
      return {
         errors: {
            _form: [error instanceof Error ? error.message : "Failed to create refund."],
         },
        status: "failed",
      };
   }
}
