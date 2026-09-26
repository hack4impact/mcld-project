import { render } from "@react-email/render";

import {
   CoordinatorBookingEmail,
   type CoordinatorBookingEmailProps,
} from "@/lib/email/coordinator-booking";
import {
   AccountDeletedEmail,
   EmailChangeApprovalEmail,
   EmailChangeConfirmEmail,
   EmailChangedEmail,
   InviteEmail,
   PasswordChangedEmail,
   RoleChangedEmail,
   type AccountDeletedEmailProps,
   type EmailChangeApprovalEmailProps,
   type EmailChangeConfirmEmailProps,
   type EmailChangedEmailProps,
   type InviteEmailProps,
   type PasswordChangedEmailProps,
   type RoleChangedEmailProps,
} from "@/lib/email/account-notices";

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

async function renderEmail(
   subject: string,
   element: React.ReactElement,
): Promise<EmailContent> {
   const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
   ]);
   return { subject, html, text };
}

/** Where account emails tell people to write. Falls back to the sender address. */
export function supportEmail(): string {
   const configured = process.env.SUPPORT_EMAIL?.trim();
   if (configured) return configured;
   const from = process.env.EMAIL_FROM ?? "";
   return from.match(/<([^>]+)>/)?.[1] ?? from.trim();
}

/** e.g. "Sat, Sep 26, 2026, 1:05 PM EDT" in EMAIL_TIMEZONE. */
export function formatNoticeTime(date: Date): string {
   return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: process.env.EMAIL_TIMEZONE || undefined,
   });
}

export function inviteEmail(
   props: Omit<InviteEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "You're invited to MCLD — set your password",
      InviteEmail({ ...props, supportEmail: supportEmail() }),
   );
}

export function emailChangeApprovalEmail(
   props: Omit<EmailChangeApprovalEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "Approve the change to your MCLD email address",
      EmailChangeApprovalEmail({ ...props, supportEmail: supportEmail() }),
   );
}

export function emailChangeConfirmEmail(
   props: Omit<EmailChangeConfirmEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "Confirm your new MCLD email address",
      EmailChangeConfirmEmail({ ...props, supportEmail: supportEmail() }),
   );
}

export function emailChangedEmail(
   props: Omit<EmailChangedEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "Your MCLD email address was changed",
      EmailChangedEmail({ ...props, supportEmail: supportEmail() }),
   );
}

export function passwordChangedEmail(
   props: Omit<PasswordChangedEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "Your MCLD password was changed",
      PasswordChangedEmail({ ...props, supportEmail: supportEmail() }),
   );
}

export function roleChangedEmail(
   props: Omit<RoleChangedEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "Your MCLD account role changed",
      RoleChangedEmail({ ...props, supportEmail: supportEmail() }),
   );
}

export function accountDeletedEmail(
   props: Omit<AccountDeletedEmailProps, "supportEmail">,
): Promise<EmailContent> {
   return renderEmail(
      "Your MCLD account was deleted",
      AccountDeletedEmail({ ...props, supportEmail: supportEmail() }),
   );
}
