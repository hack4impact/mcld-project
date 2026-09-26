import type Stripe from "stripe";
import { stripe } from "./stripe";

export type CashSessionRecord = {
   invoiceId: string;
   submissionId: string;
   serviceId: string;
   userId: string;
   childId: string | null;
   coordinatorId: string;
   recordedBy: string;
   sessionAt: Date;
   collectedAt: Date;
   durationMinutes: number;
   amountCents: number;
   currency: string;
   title: string;
   createdAt: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toCashSession(invoice: Stripe.Invoice): CashSessionRecord | null {
   const m = invoice.metadata;
   if (
      invoice.status !== "paid" ||
      m?.type !== "cash_private_lesson" ||
      m.schemaVersion !== "1" ||
      !invoice.id ||
      !Number.isSafeInteger(invoice.total) ||
      invoice.total <= 0 ||
      invoice.amount_paid !== invoice.total ||
      invoice.amount_remaining !== 0 ||
      invoice.starting_balance !== 0 ||
      (invoice.ending_balance !== null && invoice.ending_balance !== 0) ||
      !/^[a-z]{3}$/.test(invoice.currency)
   ) {
      return null;
   }

   const submissionId = m.submissionId || m.privateLessonSessionId;
   const ids = [
      submissionId,
      m.serviceId,
      m.userId,
      m.collectedBy,
      m.recordedBy,
   ];
   if (ids.some((id) => !id || !UUID.test(id))) return null;
   if (m.childId && !UUID.test(m.childId)) return null;
   if (m.privateLessonSessionId && m.privateLessonSessionId !== submissionId) {
      return null;
   }

   const sessionAt = new Date(m.sessionAt);
   const collectedAt = new Date(m.collectedAt);
   const createdAt = new Date(invoice.created * 1000);
   const durationMinutes = Number(m.durationMinutes);
   if (
      [sessionAt, collectedAt, createdAt].some((date) =>
         Number.isNaN(date.getTime()),
      ) ||
      !Number.isSafeInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      (m.cashAmountCents !== undefined &&
         Number(m.cashAmountCents) !== invoice.total)
   ) {
      return null;
   }

   return {
      invoiceId: invoice.id,
      submissionId,
      serviceId: m.serviceId,
      userId: m.userId,
      childId: m.childId || null,
      coordinatorId: m.collectedBy,
      recordedBy: m.recordedBy,
      sessionAt,
      collectedAt,
      durationMinutes,
      amountCents: invoice.total,
      currency: invoice.currency,
      title:
         invoice.description?.replace(/ — paid in cash$/, "") ||
         "Private lesson",
      createdAt,
   };
}

/** Stripe list reads avoid the propagation delay of metadata search. */
export async function listCashSessions({
   customerId,
   serviceId,
}: {
   customerId?: string;
   serviceId?: string;
} = {}): Promise<CashSessionRecord[]> {
   const records: CashSessionRecord[] = [];
   let startingAfter: string | undefined;
   do {
      const page = await stripe.invoices.list({
         status: "paid",
         limit: 100,
         ...(customerId ? { customer: customerId } : {}),
         ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const invoice of page.data) {
         const record = toCashSession(invoice);
         if (record && (!serviceId || record.serviceId === serviceId)) {
            records.push(record);
         }
      }
      startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
   } while (startingAfter);
   return records;
}
