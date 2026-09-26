/**
 * Cash private lessons store the id of their out-of-band Stripe invoice
 * (`in_…`) in `stripe_order_id`; online bookings store a Checkout session
 * id (`cs_…`) there.
 */
export function isCashSession(stripeOrderId: string | null): boolean {
   return stripeOrderId?.startsWith("in_") ?? false;
}
