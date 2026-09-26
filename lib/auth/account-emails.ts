import "server-only";

import { eq, sql } from "drizzle-orm";

import { appUrl } from "@/lib/app-url";
import { confirmLinkUrl } from "@/lib/auth/email-links";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-users";
import { profiles } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";
import {
   accountDeletedEmail,
   emailChangeApprovalEmail,
   emailChangeConfirmEmail,
   emailChangedEmail,
   formatNoticeTime,
   inviteEmail,
   passwordChangedEmail,
   roleChangedEmail,
} from "@/lib/email/templates";

function greetingName(firstName: string | null | undefined): string {
   return firstName?.trim() || "there";
}

export type AccountByEmail = {
   id: string;
   email: string;
   firstName: string | null;
};

/** Finds an account by email address, ignoring case. */
export async function findAccountByEmail(
   email: string,
): Promise<AccountByEmail | null> {
   const [row] = await db
      .select({
         id: authUsers.id,
         email: authUsers.email,
         firstName: profiles.firstName,
      })
      .from(authUsers)
      .leftJoin(profiles, eq(profiles.id, authUsers.id))
      .where(sql`lower(${authUsers.email}) = lower(${email})`)
      .limit(1);
   if (!row?.email) return null;
   return { id: row.id, email: row.email, firstName: row.firstName };
}

export async function sendInviteEmail(params: {
   to: string;
   firstName: string | null;
   tokenHash: string;
}): Promise<void> {
   const email = await inviteEmail({
      firstName: greetingName(params.firstName),
      acceptUrl: confirmLinkUrl({
         tokenHash: params.tokenHash,
         type: "invite",
      }),
   });
   await sendEmail({ to: params.to, ...email });
}

/** Asks the current address to approve, and the new address to confirm. */
export async function sendEmailChangeRequest(params: {
   firstName: string | null;
   currentEmail: string;
   newEmail: string;
   currentTokenHash: string;
   newTokenHash: string;
}): Promise<void> {
   const firstName = greetingName(params.firstName);
   const approval = await emailChangeApprovalEmail({
      firstName,
      newEmail: params.newEmail,
      approveUrl: confirmLinkUrl({
         tokenHash: params.currentTokenHash,
         type: "email_change",
         email: params.currentEmail,
      }),
   });
   const confirmation = await emailChangeConfirmEmail({
      firstName,
      confirmUrl: confirmLinkUrl({
         tokenHash: params.newTokenHash,
         type: "email_change",
         email: params.currentEmail,
      }),
   });
   await sendEmail({ to: params.currentEmail, ...approval });
   await sendEmail({ to: params.newEmail, ...confirmation });
}

/** Tells both the old and the new address that a change went through. */
export async function sendEmailChangedNotices(params: {
   firstName: string | null;
   oldEmail: string;
   newEmail: string;
}): Promise<void> {
   const email = await emailChangedEmail({
      firstName: greetingName(params.firstName),
      oldEmail: params.oldEmail,
      newEmail: params.newEmail,
      changedAt: formatNoticeTime(new Date()),
   });
   await sendEmail({ to: params.oldEmail, ...email });
   await sendEmail({ to: params.newEmail, ...email });
}

export async function sendPasswordChangedNotice(params: {
   to: string;
   firstName: string | null;
}): Promise<void> {
   const email = await passwordChangedEmail({
      firstName: greetingName(params.firstName),
      changedAt: formatNoticeTime(new Date()),
      forgotPasswordUrl: appUrl("/auth/forgot-password"),
   });
   await sendEmail({ to: params.to, ...email });
}

export async function sendRoleChangedNotice(params: {
   to: string;
   firstName: string | null;
   oldRole: string;
   newRole: string;
}): Promise<void> {
   const email = await roleChangedEmail({
      firstName: greetingName(params.firstName),
      oldRole: params.oldRole,
      newRole: params.newRole,
      changedAt: formatNoticeTime(new Date()),
   });
   await sendEmail({ to: params.to, ...email });
}

export async function sendAccountDeletedNotice(params: {
   to: string;
   firstName: string | null;
}): Promise<void> {
   const email = await accountDeletedEmail({
      firstName: greetingName(params.firstName),
      deletedAt: formatNoticeTime(new Date()),
   });
   await sendEmail({ to: params.to, ...email });
}

/**
 * Sends an informational notice after a change that already succeeded. A
 * delivery failure is logged and reported, never undoing the change.
 */
export async function sendNotice(
   label: string,
   send: () => Promise<void>,
): Promise<boolean> {
   try {
      await send();
      return true;
   } catch (error) {
      console.error(`[account email] ${label} could not be sent`, error);
      return false;
   }
}
