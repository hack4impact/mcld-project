"use server";

import { headers } from "next/headers";
import { and, eq, isNull,inArray } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { children,coachingSessions, serviceBookings, extraQuestionAnswers, services } from "@/lib/db/schema";
import { getEnrolledChildIdsForProgram } from "@/app/(authenticated)/children/queries";
import { getForm, type QuestionView } from "@/app/(authenticated)/forms/queries";
import {
   getActiveCouponForCustomerProduct,
   getOrCreateStripeCustomer,
   stripe,
} from "@/lib/stripe";
import {
   submitAvailabilities,
   type Availability,
} from "@/app/coaching/actions";
import { createClient } from "@/utils/supabase/server";


export type CheckoutResult = { url: string } | { error: string };

export type FormAnswerInput = {
   questionId: string;
   answer: string[];
};

async function getDefaultPriceId(stripeProductId: string): Promise<string> {
   const product = await stripe.products.retrieve(stripeProductId);
   if (product.default_price) {
      return typeof product.default_price === "string"
         ? product.default_price
         : product.default_price.id;
   }
   const prices = await stripe.prices.list({
      product: stripeProductId,
      active: true,
      limit: 100,
   });
   if (prices.data.length === 0) {
      throw new Error(`Stripe product ${stripeProductId} has no active price`);
   }
   const latest = prices.data.sort((a, b) => b.created - a.created)[0];
   return latest.id;
}

async function getRequestOrigin(): Promise<string> {
   const origin = (await headers()).get("origin");
   if (!origin) {
      throw new Error("Missing request origin");
   }
   return origin;
}

type CreateSessionResult =
   | { session: Stripe.Checkout.Session }
   | { error: string };

async function createStripeCheckoutSession(params: {
   userId: string;
   email: string;
   stripeProductId: string;
   metadata: Record<string, string>;
}): Promise<CreateSessionResult> {
   const priceId = await getDefaultPriceId(params.stripeProductId);

   const customerId = await getOrCreateStripeCustomer(
      params.userId,
      params.email,
   );
   const origin = await getRequestOrigin();

   const couponId = await getActiveCouponForCustomerProduct({
      customerId,
      productId: params.stripeProductId,
   });

   const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: params.metadata,
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
   });

   if (!session.url) return { error: "Stripe did not return a checkout URL" };
   return { session };
}

function validateAnswerForQuestion(
   question: QuestionView,
   answer: string[] | undefined,
): string | null {
   if (!answer?.length) {
      return `Please answer: ${question.prompt}`;
   }

   if (question.type === "text" && !answer[0]?.trim()) {
      return `Please answer: ${question.prompt}`;
   }

   if (question.type === "multiple_choices") {
      const valid = (question.options ?? []).some((o) => o.id === answer[0]);
      if (!valid) return `Invalid answer for: ${question.prompt}`;
   }

   if (question.type === "checkboxes") {
      const optionIds = new Set((question.options ?? []).map((o) => o.id));
      if (!answer.some((id) => optionIds.has(id))) {
         return `Invalid answer for: ${question.prompt}`;
      }
   }

   if (question.type === "user_agreement" && answer[0] !== "true") {
      return `You must agree to: ${question.prompt}`;
   }

   return null;
}

async function saveFormAnswers(
   formId: string,
   childId: string,
   formAnswers: FormAnswerInput[],
): Promise<{ error: string } | void> {
   const form = await getForm(formId);
   if (!form) return { error: "Form not found" };

   const answerMap = new Map(
      formAnswers.map((a) => [a.questionId, a.answer]),
   );
   const questionIds = form.questions.map((q) => q.id);
   const questionIdSet = new Set(questionIds);

   for (const question of form.questions) {
      const error = validateAnswerForQuestion(
         question,
         answerMap.get(question.id),
      );
      if (error) return { error };
   }

   for (const a of formAnswers) {
      if (!questionIdSet.has(a.questionId)) {
         return { error: "Invalid form answer" };
      }
   }

   const rows = form.questions.map((q) => ({
      extraQuestionId: q.id,
      childId,
      answer:
         q.type === "text"
            ? [answerMap.get(q.id)![0].trim()]
            : answerMap.get(q.id)!,
   }));

   await db.transaction(async (tx) => {
      await tx
         .delete(extraQuestionAnswers)
         .where(
            and(
               eq(extraQuestionAnswers.childId, childId),
               inArray(extraQuestionAnswers.extraQuestionId, questionIds),
            ),
         );

      if (rows.length > 0) {
         await tx.insert(extraQuestionAnswers).values(rows);
      }
   });
}

export async function checkoutServiceBooking({
   serviceId,
   childId,
   formAnswers,
}: {
   serviceId: string;
   childId?: string;
   formAnswers?: FormAnswerInput[];
}): Promise<CheckoutResult> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
   });
   if (!service) return { error: "Service not found" };
   if (service.status !== "active")
      return { error: "Service is not available" };
   if (service.type !== "programs")
      return { error: "Service is not a program" };
   if (service.isForChildren && !childId) {
      return { error: "Select a child to enroll" };
   }
   if (!service.isForChildren && childId) {
      return { error: "This service is not for children" };
   }

   if (childId) {
      const child = await db.query.children.findFirst({
         where: and(eq(children.id, childId), eq(children.parentId, user.id)),
      });
      if (!child) return { error: "Child not found" };
      const enrolledIds = await getEnrolledChildIdsForProgram(serviceId, user.id);
      if (enrolledIds.includes(childId)) {
         return { error: "This child is already registered for this program" };
      }
   }

   if (service.formId) {
      if (!childId) return { error: "Select a child to enroll" };
      if (!formAnswers?.length) return { error: "Complete the form" };
      const formError = await saveFormAnswers(
         service.formId,
         childId,
         formAnswers,
      );
      if (formError) return formError;
   }

   await db
   .delete(serviceBookings)
   .where(
      and(
         eq(serviceBookings.userId, user.id),
         eq(serviceBookings.serviceId, service.id),
         eq(serviceBookings.status, "awaiting_payment"),
         childId
            ? eq(serviceBookings.childId, childId)
            : isNull(serviceBookings.childId),
      ),
   );

   const [row] = await db
      .insert(serviceBookings)
      .values({
         userId: user.id,
         serviceId: service.id,
         childId: childId || null,
         status: "awaiting_payment",
      })
      .returning({ id: serviceBookings.id });

   const result = await createStripeCheckoutSession({
      userId: user.id,
      email: user.email!,
      stripeProductId: service.stripeProductId,
      metadata: {
         type: "program",
         bookingId: row.id,
      },
   });
   if ("error" in result) {
      await db.delete(serviceBookings).where(eq(serviceBookings.id, row.id));
      return { error: result.error };
   }

   await db
      .update(serviceBookings)
      .set({ stripeOrderId: result.session.id })
      .where(eq(serviceBookings.id, row.id));

   return { url: result.session.url! };
}

export async function checkoutCoachingSession({
   coachingSessionId,
}: {
   coachingSessionId: string;
}): Promise<CheckoutResult> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const row = await db.query.coachingSessions.findFirst({
      where: and(
         eq(coachingSessions.id, coachingSessionId),
         eq(coachingSessions.userId, user.id),
      ),
   });
   if (!row) return { error: "Coaching session not found" };
   if (row.status !== "awaiting_payment")
      return { error: "Coaching session is not awaiting payment" };

   const service = await db.query.services.findFirst({
      where: eq(services.id, row.serviceId),
   });
   if (!service) return { error: "Service not found" };

   const result = await createStripeCheckoutSession({
      userId: user.id,
      email: user.email!,
      stripeProductId: service.stripeProductId,
      metadata: {
         type: "private_lesson",
         coachingSessionId: row.id,
      },
   });
   if ("error" in result) {
      await db.delete(coachingSessions).where(eq(coachingSessions.id, row.id));
      return { error: result.error };
   }

   await db
      .update(coachingSessions)
      .set({ stripeOrderId: result.session.id })
      .where(eq(coachingSessions.id, row.id));

   return { url: result.session.url! };
}

export async function startPrivateLessonCheckout({
   serviceId,
   availabilities,
}: {
   serviceId: string;
   availabilities: Availability[];
}): Promise<CheckoutResult> {
   const created = await submitAvailabilities({ serviceId, availabilities });
   if ("error" in created) return { error: created.error };

   return checkoutCoachingSession({
      coachingSessionId: created.coachingSessionId,
   });
}

export async function loadFormAnswersForChild({
   childId,
   questionIds,
}: {
   childId: string;
   questionIds: string[];
}): Promise<Record<string, string[]>> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user || questionIds.length === 0) return {};

   const child = await db.query.children.findFirst({
      where: and(eq(children.id, childId), eq(children.parentId, user.id)),
   });
   if (!child) return {};

   const rows = await db
      .select({
         questionId: extraQuestionAnswers.extraQuestionId,
         answer: extraQuestionAnswers.answer,
      })
      .from(extraQuestionAnswers)
      .where(
         and(
            eq(extraQuestionAnswers.childId, childId),
            inArray(extraQuestionAnswers.extraQuestionId, questionIds),
         ),
      );

   const state: Record<string, string[]> = {};
   for (const row of rows) {
      state[row.questionId] = row.answer;
   }
   return state;
}