import { render } from "@react-email/render";

import {
   CoordinatorBookingEmail,
   type CoordinatorBookingEmailProps,
} from "@/lib/email/coordinator-booking";

export type {
   ChildInfo,
   ChildFormAnswer,
   EmergencyContactInfo,
   CoordinatorBookingEmailProps,
} from "@/lib/email/coordinator-booking";

export type EmailContent = { subject: string; html: string; text: string };

export async function coordinatorBookingEmail(
   params: CoordinatorBookingEmailProps,
): Promise<EmailContent> {
   const clientName =
      `${params.client.firstName} ${params.client.lastName}`.trim();
   const subject = `New booking: ${params.serviceTitle} — ${clientName}`;

   const element = CoordinatorBookingEmail({
      ...params,
      timeZone: params.timeZone ?? process.env.EMAIL_TIMEZONE,
   });

   const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
   ]);

   return { subject, html, text };
}
