import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const DEFAULT_CURRENCY = "cad";

export type StripeCatalogDetails = {
   name: string;
   description: string;
   priceCents: number;
   currency: string;
};

export async function createStripeCatalogItem(input: {
   name: string;
   description?: string;
   priceCents: number;
   currency?: string;
}) {
   const product = await stripe.products.create({
      name: input.name,
      description: input.description || undefined,
      default_price_data: {
         currency: input.currency ?? DEFAULT_CURRENCY,
         unit_amount: input.priceCents,
      },
   });

   const defaultPrice = product.default_price;
   const priceId =
      typeof defaultPrice === "string" ? defaultPrice : defaultPrice?.id;

   if (!priceId) {
      throw new Error("Stripe product was created without a default price");
   }

   return { productId: product.id, priceId };
}

export async function updateStripeCatalogItem(input: {
   productId: string;
   name: string;
   description?: string;
   priceCents?: number;
   currency?: string;
}) {
   await stripe.products.update(input.productId, {
      name: input.name,
      description: input.description || undefined,
   });

   if (input.priceCents === undefined) {
      return null;
   }

   const price = await stripe.prices.create({
      product: input.productId,
      currency: input.currency ?? DEFAULT_CURRENCY,
      unit_amount: input.priceCents,
   });

   await stripe.products.update(input.productId, {
      default_price: price.id,
   });

   return price.id;
}

export async function getStripeCatalogDetails(
   productId: string,
): Promise<StripeCatalogDetails> {
   const product = await stripe.products.retrieve(productId, {
      expand: ["default_price"],
   });

   const defaultPrice = product.default_price as Stripe.Price | string | null;
   const price =
      typeof defaultPrice === "string"
         ? await stripe.prices.retrieve(defaultPrice)
         : defaultPrice;

   return {
      name: product.name,
      description: product.description ?? "",
      priceCents: price?.unit_amount ?? 0,
      currency: price?.currency ?? DEFAULT_CURRENCY,
   };
}

export function formatPrice(cents: number, currency: string) {
   return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currency.toUpperCase(),
   }).format(cents / 100);
}
