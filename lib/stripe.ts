import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
   const key = process.env.STRIPE_SECRET_KEY;
   if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
   }
   if (!stripeClient) {
      stripeClient = new Stripe(key);
   }
   return stripeClient;
}

/** One-time CAD prices only; recurring is ignored for service catalog. */
export async function getLatestCadOneTimePrice(
   productId: string
): Promise<Stripe.Price | null> {
   const stripe = getStripe();
   const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
   });
   const cadOneTime = prices.data
      .filter((p) => p.currency === "cad" && p.recurring === null)
      .sort((a, b) => b.created - a.created);
   return cadOneTime[0] ?? null;
}

export async function createStripeProductWithCadPrice(params: {
   title: string;
   description: string | null;
   amountCents: number;
}): Promise<{ productId: string }> {
   const stripe = getStripe();
   const product = await stripe.products.create({
      name: params.title,
      description: params.description ?? undefined,
      active: true,
   });
   await stripe.prices.create({
      product: product.id,
      unit_amount: params.amountCents,
      currency: "cad",
   });
   return { productId: product.id };
}

export async function deleteStripeProduct(productId: string): Promise<void> {
   const stripe = getStripe();
   await stripe.products.del(productId);
}

export async function updateStripeProductDetails(
   productId: string,
   params: { title: string; description: string | null }
): Promise<void> {
   const stripe = getStripe();
   await stripe.products.update(productId, {
      name: params.title,
      description: params.description ?? undefined,
   });
}

/**
 * Stripe Prices are immutable; deactivate old CAD one-time prices and add a new one.
 */
export async function replaceCadOneTimePrice(
   productId: string,
   amountCents: number
): Promise<void> {
   const stripe = getStripe();
   const prices = await stripe.prices.list({ product: productId, limit: 100 });
   for (const p of prices.data) {
      if (p.currency === "cad" && p.recurring === null && p.active) {
         await stripe.prices.update(p.id, { active: false });
      }
   }
   await stripe.prices.create({
      product: productId,
      unit_amount: amountCents,
      currency: "cad",
   });
}

export async function setStripeProductActive(
   productId: string,
   active: boolean
): Promise<void> {
   const stripe = getStripe();
   await stripe.products.update(productId, { active });
}
