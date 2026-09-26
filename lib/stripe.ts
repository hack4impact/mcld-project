import { createHash } from "node:crypto";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cacheLife } from "next/cache";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
   apiVersion: "2026-03-25.dahlia",
   // Retries 429s and network errors with backoff; POSTs get automatic
   // idempotency keys, so a retry never duplicates a write.
   maxNetworkRetries: 2,
});

export async function getOrCreateStripeCustomer(userId: string, email: string) {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
   });
   if (!profile) throw new Error("Client profile not found");
   if (profile.stripeCustomerId) return profile.stripeCustomerId;

   const customer = await stripe.customers.create(
      { email, metadata: { userId } },
      { idempotencyKey: `mcld-customer:${userId}` },
   );

   // A concurrent request may already have selected the canonical customer.
   // Never replace that mapping with the customer returned by this request.
   const [linked] = await db
      .update(profiles)
      .set({ stripeCustomerId: customer.id })
      .where(and(eq(profiles.id, userId), isNull(profiles.stripeCustomerId)))
      .returning({ stripeCustomerId: profiles.stripeCustomerId });
   if (linked?.stripeCustomerId) return linked.stripeCustomerId;

   const winner = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { stripeCustomerId: true },
   });
   if (!winner?.stripeCustomerId) {
      throw new Error(
         "Could not link the Stripe customer to the profile. Please try again.",
      );
   }
   return winner.stripeCustomerId;
}

export async function syncStripeData(stripeCustomerId: string) {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.stripeCustomerId, stripeCustomerId),
   });

   if (!profile) {
      console.error("No profile found for Stripe customer:", stripeCustomerId);
      return null;
   }

   const stripeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
   });

   if (stripeSubscriptions.data.length === 0) {
      await db
         .insert(subscriptions)
         .values({
            userId: profile.id,
            status: "none",
         })
         .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
               status: "none",
               stripeSubscriptionId: null,
               stripePriceId: null,
               cancelAtPeriodEnd: false,
               paymentMethodBrand: null,
               paymentMethodLast4: null,
               updatedAt: new Date(),
            },
         });
      return { status: "none" as const };
   }

   const sub = stripeSubscriptions.data[0];
   const paymentMethod =
      sub.default_payment_method as Stripe.PaymentMethod | null;

   const subData = {
      stripeSubscriptionId: sub.id,
      status: sub.status,
      stripePriceId: sub.items.data[0].price.id,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      paymentMethodBrand: paymentMethod?.card?.brand ?? null,
      paymentMethodLast4: paymentMethod?.card?.last4 ?? null,
      updatedAt: new Date(),
   };

   await db
      .insert(subscriptions)
      .values({
         userId: profile.id,
         ...subData,
      })
      .onConflictDoUpdate({
         target: subscriptions.userId,
         set: subData,
      });

   return subData;
}

export type SubscriptionDetails = {
   status: string;
   planName: string;
   priceAmount: number;
   priceInterval: string;
   cancelAtPeriodEnd: boolean;
   paymentMethodBrand: string | null;
   paymentMethodLast4: string | null;
} | null;

export async function userHasActiveSubscription(
   userId: string,
): Promise<boolean> {
   const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
   });
   return (
      subscription?.status === "active" || subscription?.status === "trialing"
   );
}

export async function getSubscriptionDetails(
   userId: string,
): Promise<SubscriptionDetails> {
   const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
   });

   if (!subscription || subscription.status !== "active") {
      return null;
   }

   if (!subscription.stripePriceId) {
      return null;
   }

   const price = await stripe.prices.retrieve(subscription.stripePriceId, {
      expand: ["product"],
   });

   const product = price.product as Stripe.Product;

   return {
      status: subscription.status,
      planName: product.name,
      priceAmount: price.unit_amount ?? 0,
      priceInterval: price.recurring?.interval ?? "month",
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      paymentMethodBrand: subscription.paymentMethodBrand,
      paymentMethodLast4: subscription.paymentMethodLast4,
   };
}

export async function createProduct(params: {
   name: string;
   description: string;
}): Promise<{ productId: string }> {
   const product = await stripe.products.create({
      name: params.name,
      description: params.description,
   });
   return { productId: product.id };
}

export async function updateProduct(
   productId: string,
   params: { name?: string; description?: string; active?: boolean },
): Promise<void> {
   const patch: Stripe.ProductUpdateParams = {};
   if (params.name !== undefined) patch.name = params.name;
   if (params.description !== undefined) patch.description = params.description;
   if (params.active !== undefined) patch.active = params.active;
   if (Object.keys(patch).length === 0) return;
   await stripe.products.update(productId, patch);
}

export async function createPrice(
   productId: string,
   amountCents: number,
): Promise<{ priceId: string }> {
   const price = await stripe.prices.create({
      product: productId,
      unit_amount: amountCents,
      currency: "cad",
   });

   return { priceId: price.id };
}

export async function replaceProductPrice(
   productId: string,
   amountCents: number,
): Promise<{ priceId: string }> {
   // get the current default price for the product
   const product = await stripe.products.retrieve(productId, {
      expand: ["default_price"],
   });

   const currentDefaultPrice =
      typeof product.default_price === "string"
         ? product.default_price
         : product.default_price?.id;

   // create the new price FIRST (rlly important)
   const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: amountCents,
      currency: "cad",
   });

   // set the new price as the product default
   await stripe.products.update(productId, {
      default_price: newPrice.id,
   });

   // archive old active prices but NEVER archive the new default price
   const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
   });

   for (const p of prices.data) {
      if (p.id !== newPrice.id && p.id !== currentDefaultPrice) {
         await stripe.prices.update(p.id, { active: false });
      }
   }

   // archive the old default price after default_price has been swapped
   if (currentDefaultPrice && currentDefaultPrice !== newPrice.id) {
      await stripe.prices.update(currentDefaultPrice, { active: false });
   }

   return { priceId: newPrice.id };
}

export type StripeServiceData = {
   title: string;
   description: string;
   priceCents: number | null;
   priceCurrency: string | null;
};

type ManagedProductDiscount = {
   couponId: string;
};

export async function getStripeServiceData(
   productId: string,
): Promise<StripeServiceData | null> {
   const [product, prices] = await Promise.all([
      stripe.products.retrieve(productId),
      stripe.prices.list({ product: productId, active: true, limit: 100 }),
   ]);

   const latestPrice = prices.data.sort((a, b) => b.created - a.created)[0];

   return {
      title: product.name,
      description: product.description ?? "",
      priceCents: latestPrice?.unit_amount ?? null,
      priceCurrency: latestPrice?.currency ?? null,
   };
}

export async function listStripeServices(
   includeArchived = false,
): Promise<
   { id: string; name: string; priceCents: number | null; active: boolean }[]
> {
   "use cache";
   cacheLife("hours");
   const activeFilter = includeArchived ? {} : { active: true };
   const [products, prices] = await Promise.all([
      stripe.products.list({ ...activeFilter, limit: 100 }),
      stripe.prices.list({ active: true, limit: 100 }),
   ]);

   const sortedPrices = [...prices.data].sort((a, b) => b.created - a.created);
   const priceMap = new Map<string, number | null>();
   for (const price of sortedPrices) {
      const productId =
         typeof price.product === "string" ? price.product : price.product.id;
      if (!priceMap.has(productId)) {
         priceMap.set(productId, price.unit_amount);
      }
   }

   return products.data.map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: priceMap.get(p.id) ?? null,
      active: p.active,
   }));
}

export type CustomerDiscount = {
   couponId: string;
   productId: string;
   percentOff: number | null;
   amountOffCents: number | null;
   currency: string | null;
   timesRedeemed: number;
   maxRedemptions: number | null;
};

export async function listActiveDiscountsForCustomer(
   customerId: string,
): Promise<CustomerDiscount[]> {
   const coupons = await stripe.coupons.list({ limit: 100 });
   return coupons.data
      .filter((c) => c.metadata?.customerId === customerId && c.valid)
      .map((c) => ({
         couponId: c.id,
         productId: c.metadata!.productId,
         percentOff: c.percent_off ?? null,
         amountOffCents: c.amount_off ?? null,
         currency: c.currency ?? null,
         timesRedeemed: c.times_redeemed,
         maxRedemptions: c.max_redemptions ?? null,
      }));
}

export async function deleteCoupon(couponId: string): Promise<void> {
   await stripe.coupons.del(couponId);
}

async function getManagedDiscountForCustomerProduct(
   customerId: string,
   productId: string,
): Promise<ManagedProductDiscount | null> {
   const coupons = await stripe.coupons.list({
      limit: 100,
   });

   for (const coupon of coupons.data) {
      const metadata = coupon.metadata ?? {};
      if (metadata.customerId !== customerId) continue;
      if (!coupon.valid) continue;

      if (metadata.productId !== productId) continue;

      return {
         couponId: coupon.id,
      };
   }

   return null;
}

export type ProductDiscountConfig =
   | {
        percentOff: number;
        amountOffCents?: never;
        currency?: string;
     }
   | {
        percentOff?: never;
        amountOffCents: number;
        currency: string;
     };

export async function applyProductDiscountToCustomer(input: {
   productId: string;
   customerId: string;
   usageLimit: number;
   discount: ProductDiscountConfig;
}): Promise<{
   couponId: string;
}> {
   const existing = await getManagedDiscountForCustomerProduct(
      input.customerId,
      input.productId,
   );
   if (existing) {
      throw new Error(
         "A discount is already active for this customer and product. Remove it before applying a new one.",
      );
   }

   const couponParams: Stripe.CouponCreateParams = {
      duration: "forever",
      applies_to: { products: [input.productId] },
      max_redemptions: input.usageLimit,
      metadata: {
         productId: input.productId,
         customerId: input.customerId,
      },
   };

   if (input.discount.percentOff !== undefined) {
      couponParams.percent_off = input.discount.percentOff;
   } else {
      couponParams.amount_off = input.discount.amountOffCents;
      couponParams.currency = input.discount.currency;
   }

   const coupon = await stripe.coupons.create(couponParams);

   return {
      couponId: coupon.id,
   };
}

export async function getActiveCouponForCustomerProduct(input: {
   customerId: string;
   productId: string;
}): Promise<string | null> {
   const managed = await getManagedDiscountForCustomerProduct(
      input.customerId,
      input.productId,
   );
   return managed?.couponId ?? null;
}

export type ProductDiscountForUser = {
   percentOff: number | null;
   amountOffCents: number | null;
   currency: string | null;
};

export async function getProductDiscountForUser(input: {
   userId: string;
   productId: string;
}): Promise<ProductDiscountForUser | null> {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, input.userId),
   });
   if (!profile?.stripeCustomerId) return null;

   const coupons = await stripe.coupons.list({ limit: 100 });
   for (const coupon of coupons.data) {
      const metadata = coupon.metadata ?? {};
      if (metadata.customerId !== profile.stripeCustomerId) continue;
      if (!coupon.valid) continue;

      if (metadata.productId !== input.productId) continue;

      return {
         percentOff: coupon.percent_off ?? null,
         amountOffCents: coupon.amount_off ?? null,
         currency: coupon.currency ?? null,
      };
   }

   return null;
}

export async function removeProductDiscountFromCustomer(input: {
   productId: string;
   customerId: string;
}): Promise<{ removed: number }> {
   const managed = await getManagedDiscountForCustomerProduct(
      input.customerId,
      input.productId,
   );
   if (!managed) {
      return { removed: 0 };
   }

   await stripe.coupons.del(managed.couponId);
   return { removed: 1 };
}

export async function deleteCouponIfExhausted(couponId: string): Promise<void> {
   try {
      const coupon = await stripe.coupons.retrieve(couponId);
      if (!coupon.valid) {
         await stripe.coupons.del(couponId);
      }
   } catch (err) {
      console.error(`[STRIPE] Coupon cleanup failed for ${couponId}:`, err);
   }
}

export async function grantComplimentarySubscription(
   userId: string,
   email: string,
   months: number,
): Promise<void> {
   if (months <= 0) return;

   const priceId = process.env.STRIPE_PRICE_ID;
   if (!priceId) {
      throw new Error("Subscription price ID is not set");
   }

   const customerId = await getOrCreateStripeCustomer(userId, email);

   const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
   });

   const trialEndDate = new Date();
   trialEndDate.setMonth(trialEndDate.getMonth() + months);

   const trialEndTimestamp = Math.floor(trialEndDate.getTime() / 1000);

   await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_end: trialEndTimestamp,
      trial_settings: {
         end_behavior: { missing_payment_method: "cancel" },
      },
   });
   await syncStripeData(customerId);
}

/** Safe to show to staff; the existing Stripe record needs review, not a new payment. */
export class CashInvoiceReviewError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "CashInvoiceReviewError";
   }
}

/** Resume one immutable cash receipt using Stripe's own invoice and line-item state. */
export async function recordOutOfBandInvoice(input: {
   customerId: string;
   productId: string;
   amountCents: number;
   currency: string;
   description: string;
   metadata: Record<string, string>;
   idempotencyKey: string;
   submittedAt?: number;
}): Promise<string> {
   const key = input.idempotencyKey;
   const submissionId =
      input.metadata.submissionId || input.metadata.privateLessonSessionId;
   if (!submissionId || input.metadata.type !== "cash_private_lesson") {
      throw new CashInvoiceReviewError(
         "This cash submission is missing its reference. Please contact an administrator.",
      );
   }
   if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new CashInvoiceReviewError(
         "The cash amount must be a positive number of cents.",
      );
   }
   const currency = input.currency.toLowerCase();
   const fingerprint = createHash("sha256")
      .update(
         JSON.stringify({
            customerId: input.customerId,
            productId: input.productId,
            amountCents: input.amountCents,
            currency,
            description: input.description,
            metadata: Object.fromEntries(
               Object.entries(input.metadata).sort(([a], [b]) =>
                  a.localeCompare(b),
               ),
            ),
         }),
      )
      .digest("hex");
   const metadata = {
      ...input.metadata,
      cashPayloadHash: fingerprint,
      cashAmountCents: String(input.amountCents),
      cashProductId: input.productId,
   };

   async function write<T>(operation: () => Promise<T>): Promise<T> {
      try {
         return await operation();
      } catch (error) {
         if (
            error instanceof Error &&
            "type" in error &&
            error.type === "StripeIdempotencyError" &&
            (!("code" in error) || error.code !== "idempotency_key_in_use")
         ) {
            throw new CashInvoiceReviewError(
               "This submission was already used with different details. An administrator must review it before you record another payment.",
            );
         }
         throw error;
      }
   }

   function verify(invoice: Stripe.Invoice): void {
      const customerId =
         typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
      if (
         customerId !== input.customerId ||
         invoice.metadata?.cashPayloadHash !== fingerprint ||
         invoice.metadata.cashAmountCents !== String(input.amountCents) ||
         invoice.metadata.cashProductId !== input.productId ||
         Object.entries(input.metadata).some(
            ([name, value]) => (invoice.metadata?.[name] ?? "") !== value,
         ) ||
         invoice.currency !== currency ||
         invoice.description !== input.description
      ) {
         throw new CashInvoiceReviewError(
            "The existing Stripe receipt does not match this submission. An administrator must review it before you record another payment.",
         );
      }
      if (invoice.status === "void" || invoice.status === "uncollectible") {
         throw new CashInvoiceReviewError(
            "This receipt was voided or marked uncollectible in Stripe. Please ask an administrator to review it.",
         );
      }
   }

   function paidInvoiceId(invoice: Stripe.Invoice): string | null {
      verify(invoice);
      if (invoice.status !== "paid") return null;
      if (
         invoice.total !== input.amountCents ||
         invoice.amount_paid !== input.amountCents ||
         invoice.amount_remaining !== 0 ||
         invoice.starting_balance !== 0 ||
         (invoice.ending_balance !== null && invoice.ending_balance !== 0)
      ) {
         throw new CashInvoiceReviewError(
            "Stripe applied a balance or a different total to this receipt. An administrator must reconcile it with the cash collected.",
         );
      }
      return invoice.id!;
   }

   async function matchingLines(invoiceId: string): Promise<boolean> {
      const lines: Stripe.InvoiceLineItem[] = [];
      let startingAfter: string | undefined;
      do {
         const page = await stripe.invoices.listLineItems(invoiceId, {
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
         });
         lines.push(...page.data);
         startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
      } while (startingAfter);
      if (!lines.length) return false;
      if (
         lines.length !== 1 ||
         lines[0].metadata.cashPayloadHash !== fingerprint ||
         lines[0].amount !== input.amountCents ||
         lines[0].currency !== currency ||
         lines[0].pricing?.price_details?.product !== input.productId
      ) {
         throw new CashInvoiceReviewError(
            "The Stripe receipt contains different or duplicate items. Please ask an administrator to review it.",
         );
      }
      return true;
   }

   // Read invoice pages directly rather than using delayed metadata search.
   const candidates: Stripe.Invoice[] = [];
   let startingAfter: string | undefined;
   do {
      const page = await stripe.invoices.list({
         customer: input.customerId,
         limit: 100,
         ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      candidates.push(
         ...page.data.filter(
            (invoice) =>
               invoice.metadata?.type === "cash_private_lesson" &&
               (invoice.metadata.submissionId ||
                  invoice.metadata.privateLessonSessionId) === submissionId,
         ),
      );
      startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
   } while (startingAfter);
   if (candidates.length > 1) {
      throw new CashInvoiceReviewError(
         "More than one Stripe receipt exists for this submission. Please ask an administrator to reconcile them.",
      );
   }

   let invoice: Stripe.Invoice;
   if (candidates[0]) {
      invoice = await stripe.invoices.retrieve(candidates[0].id!);
   } else {
      // Stripe may prune keys after 24h. Never recreate an ambiguous old request.
      if (
         input.submittedAt !== undefined &&
         (!Number.isFinite(input.submittedAt) ||
            input.submittedAt > Date.now() + 5 * 60_000 ||
            Date.now() - input.submittedAt >= 23 * 60 * 60_000)
      ) {
         throw new CashInvoiceReviewError(
            "No matching receipt was found for this older submission. An administrator must check Stripe before it can be recorded again.",
         );
      }
      const created = await write(() =>
         stripe.invoices.create(
            {
               customer: input.customerId,
               currency,
               collection_method: "charge_automatically",
               auto_advance: false,
               pending_invoice_items_behavior: "exclude",
               discounts: "",
               automatic_tax: { enabled: false },
               description: input.description,
               metadata,
            },
            { idempotencyKey: `${key}:invoice` },
         ),
      );
      // An idempotent create can return its original draft even after a peer paid it.
      invoice = await stripe.invoices.retrieve(created.id!);
   }
   const alreadyPaid = paidInvoiceId(invoice);
   if (alreadyPaid) return alreadyPaid;

   if (!(await matchingLines(invoice.id!))) {
      if (invoice.status !== "draft") {
         throw new CashInvoiceReviewError(
            "The finalized Stripe receipt has no matching session item. Please ask an administrator to review it.",
         );
      }
      try {
         await write(() =>
            stripe.invoiceItems.create(
               {
                  customer: input.customerId,
                  invoice: invoice.id,
                  description: input.description,
                  discountable: false,
                  price_data: {
                     currency,
                     product: input.productId,
                     unit_amount: input.amountCents,
                  },
                  metadata,
               },
               { idempotencyKey: `${key}:item` },
            ),
         );
      } catch (error) {
         // A peer may have finished this same item while this call was in flight.
         if (!(await matchingLines(invoice.id!))) throw error;
      }
   }

   invoice = await stripe.invoices.retrieve(invoice.id!);
   verify(invoice);
   if (invoice.status === "draft") {
      // Check the preview before finalization can consume a customer's credit.
      if (
         invoice.starting_balance !== 0 ||
         invoice.total !== input.amountCents ||
         invoice.amount_due !== input.amountCents
      ) {
         throw new CashInvoiceReviewError(
            "Stripe would apply a balance or a different total to this receipt. An administrator must review it before finalization.",
         );
      }
      try {
         invoice = await write(() =>
            stripe.invoices.finalizeInvoice(
               invoice.id!,
               { auto_advance: false },
               { idempotencyKey: `${key}:finalize` },
            ),
         );
      } catch (error) {
         invoice = await stripe.invoices.retrieve(invoice.id!);
         if (invoice.status === "draft") throw error;
      }
   }
   const finalizedPaid = paidInvoiceId(invoice);
   if (finalizedPaid) return finalizedPaid;
   if (
      invoice.status !== "open" ||
      invoice.total !== input.amountCents ||
      invoice.amount_due !== input.amountCents ||
      invoice.amount_paid !== 0 ||
      invoice.starting_balance !== 0 ||
      (invoice.ending_balance !== null && invoice.ending_balance !== 0)
   ) {
      throw new CashInvoiceReviewError(
         "Stripe applied a balance or a different total to this receipt. An administrator must reconcile it with the cash collected.",
      );
   }
   try {
      invoice = await write(() =>
         stripe.invoices.pay(
            invoice.id!,
            { paid_out_of_band: true },
            { idempotencyKey: `${key}:pay` },
         ),
      );
   } catch (error) {
      invoice = await stripe.invoices.retrieve(invoice.id!);
      if (!paidInvoiceId(invoice)) throw error;
   }
   const paidId = paidInvoiceId(invoice);
   if (!paidId)
      throw new Error("The Stripe receipt has not been marked paid yet.");
   return paidId;
}
