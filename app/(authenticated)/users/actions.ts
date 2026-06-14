"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Role } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
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
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { user_id, email, role } = parsed.data;

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user_id),
   });

   if (!profile) {
      return { errors: { _form: ["User not found"] } };
   }

   const admin = createAdminClient();
   const { error: authError } = await admin.auth.admin.updateUserById(
      user_id,
      { email, app_metadata: { user_role: role } },
   );

   if (authError) {
      const message = /prod_|price_|stripe/i.test(authError.message)
         ? "Something went wrong. Please try again."
         : authError.message;
      if (authError.message.toLowerCase().includes("email")) {
         return { errors: { email: [message] } };
      }
      return { errors: { _form: [message] } };
   }

   try {

      await db
         .update(profiles)
         .set({ role: role as Role, updatedAt: new Date() })
         .where(eq(profiles.id, user_id));
   } catch {
      return  {
         errors: { _form: ["Failed to update profile. Please try again."] }
      }
   }

   revalidatePath(USERS_PATH);
   return { message: "User updated." };
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
      password: formData.get("password"),
      confirm_password: formData.get("confirm_password"),
      role: formData.get("role"),
      subscription_months: formData.get("subscription_months") ?? "0",
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const {
      first_name,
      last_name,
      email,
      password,
      role,
      subscription_months,
   } = parsed.data;

   const admin = createAdminClient();
   const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
         email,
         password,
         email_confirm: true,
         user_metadata: {
            first_name,
            last_name,
         },
         app_metadata: {
            user_role: role as Role,
         },
      });

   if (authError || !authData.user) {
      const raw = authError?.message ?? "Could not create user";
      const message = /prod_|price_|stripe/i.test(raw)
         ? "Something went wrong. Please try again."
         : raw;
      if (raw.toLowerCase().includes("email")) {
         return { errors: { email: [message] } };
      }
      return { errors: { _form: [message] } };
   }

   const userId = authData.user.id;

   try {
      await db
         .insert(profiles)
         .values({
            id: userId,
            firstName: first_name,
            lastName: last_name,
            role: role as Role,
            lastLoginAt: new Date(),
         })
         .onConflictDoUpdate({
            target: profiles.id,
            set: {
               firstName: first_name,
               lastName: last_name,
               role: role as Role,
               updatedAt: new Date(),
            },
         });
   } catch {
      await admin.auth.admin.deleteUser(userId);
   }

   if (role === ROLES.USER && subscription_months > 0) {
      try {
         await grantComplimentarySubscription(
            userId,
            email,
            subscription_months,
         );
      } catch {
         return {
            errors: {
               _form: [
                  "User was created, but the complimentary subscription could not be added. Please try again or contact support.",
               ],
            },
            data: { user_id: userId },
         };
      }
   }

   revalidatePath(USERS_PATH);
   return { message: "User created.", data: { user_id: userId } };
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
      endingBefore?:string;
   }
): Promise<PaginatedTransactions> {
   await requireAdmin();

   const parsed = getTransactionsSchema.parse(input)

   const params: Stripe.ChargeListParams = {
      customer: parsed.customerId,
      limit: parsed.limit,
      expand: ["data.refunds", "data.payment_intent"]
   };

   if(parsed.startingAfter){
      params.starting_after = parsed.startingAfter;
   } else if (parsed.endingBefore) {
      params.ending_before = parsed.endingBefore;
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
         (charge as any).refunds?.data?.map((r:Stripe.Refund)=> ({
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
   });

   if (!parsed.success) {
      return {errors : parsed.error.flatten().fieldErrors};
   }
   const {chargeId, amountCents: refundAmount, idempotencyKey} = parsed.data;


   try {
      const refundParams: Stripe.RefundCreateParams = {
         charge:chargeId,
      };

      if (refundAmount !== undefined) {
         refundParams.amount = refundAmount;
      }

      const refund = await stripe.refunds.create(refundParams, { idempotencyKey
      })

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
         message: refund.status === "succeeded" ? "Refund issued successfully." : "Refund pending.",
         status: refund.status === "succeeded" ? "succeeded" : "pending",
         refund: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
            created: refund.created,
         },
         updatedTransaction,
      };


   } catch (error: any) {
      return {
         errors: {
            _form: [error.message || "Failed to create refund."],
         },
         status: "failed",
      };
   }
}

