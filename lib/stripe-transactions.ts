import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export type TransactionRefund = {
   id: string;
   amount: number;
   status: string | null;
   created: number;
};

export type UserTransaction = {
   id: string;
   amount: number;
   amountRefunded: number;
   refunded: boolean;
   created: number;
   description: string;
   paymentIntentId: string | null;
   refunds: TransactionRefund[];
   currency: string;
};

export type PaginatedTransactions = {
   data: UserTransaction[];
   hasMore: boolean;
   firstId: string | null;
   lastId: string | null;
};

export async function listCustomerCharges(input: {
   customerId: string;
   limit?: number;
   startingAfter?: string;
}): Promise<PaginatedTransactions> {
   const params: Stripe.ChargeListParams = {
      customer: input.customerId,
      limit: input.limit ?? 10,
      expand: ["data.refunds", "data.payment_intent"],
   };

   if (input.startingAfter) {
      params.starting_after = input.startingAfter;
   }

   const charges = await stripe.charges.list(params);

   const data: UserTransaction[] = charges.data.map((charge) => {
      let description = charge.description || "";
      if (
         !description &&
         charge.payment_intent &&
         typeof charge.payment_intent !== "string"
      ) {
         description =
            charge.payment_intent.description ||
            charge.payment_intent.metadata?.productName ||
            charge.payment_intent.metadata?.description ||
            "";
      }
      if (!description) {
         description =
            charge.metadata?.productName ||
            charge.metadata?.description ||
            "Payment";
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
            typeof charge.payment_intent === "string"
               ? charge.payment_intent
               : charge.payment_intent?.id || null,
         refunds,
         currency: charge.currency,
      };
   });

   return {
      data,
      hasMore: charges.has_more,
      firstId: charges.data[0]?.id || null,
      lastId: charges.data[charges.data.length - 1]?.id || null,
   };
}
