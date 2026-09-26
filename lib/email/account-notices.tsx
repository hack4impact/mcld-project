import {
   Body,
   Button,
   Container,
   Head,
   Heading,
   Hr,
   Html,
   Img,
   Link,
   Preview,
   Text,
} from "@react-email/components";

import { LOGO_URL } from "@/lib/email/coordinator-booking";

type NoticeLayoutProps = {
   preview: string;
   heading: string;
   supportEmail: string;
   children: React.ReactNode;
};

function NoticeLayout({
   preview,
   heading,
   supportEmail,
   children,
}: NoticeLayoutProps) {
   return (
      <Html lang="en">
         <Head />
         <Preview>{preview}</Preview>
         <Body style={body}>
            <Container style={container}>
               <Img src={LOGO_URL} alt="MCLD" width={120} style={logo} />
               <Heading as="h1" style={h1}>
                  {heading}
               </Heading>
               {children}
               <Hr style={footerRule} />
               <Text style={footer}>
                  Questions, or didn&apos;t expect this email? Contact us at{" "}
                  <Link href={`mailto:${supportEmail}`} style={footerLink}>
                     {supportEmail}
                  </Link>
                  .
               </Text>
            </Container>
         </Body>
      </Html>
   );
}

export type InviteEmailProps = {
   firstName: string;
   acceptUrl: string;
   supportEmail: string;
};

export function InviteEmail({
   firstName,
   acceptUrl,
   supportEmail,
}: InviteEmailProps) {
   return (
      <NoticeLayout
         preview="Your MCLD account is ready — choose a password"
         heading="You're invited to MCLD"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            An MCLD administrator created an account for you. Accept the
            invitation and choose a password to sign in.
         </Text>
         <Button href={acceptUrl} style={button}>
            Accept invitation and set password
         </Button>
         <Text style={muted}>
            For your security, this link can only be used once and expires after
            a while. If it no longer works, ask us to send a new invitation. You
            can open it on any device.
         </Text>
         <Text style={muted}>
            If the button doesn&apos;t work, copy this link into your browser:
            <br />
            <Link href={acceptUrl} style={rawLink}>
               {acceptUrl}
            </Link>
         </Text>
      </NoticeLayout>
   );
}

export type EmailChangeApprovalEmailProps = {
   firstName: string;
   newEmail: string;
   approveUrl: string;
   supportEmail: string;
};

/** Sent to the current address when an admin asks to change it. */
export function EmailChangeApprovalEmail({
   firstName,
   newEmail,
   approveUrl,
   supportEmail,
}: EmailChangeApprovalEmailProps) {
   return (
      <NoticeLayout
         preview="Approve the change to your MCLD email address"
         heading="Approve your new email address"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            An MCLD administrator asked to change the email address on your
            account to <strong>{newEmail}</strong>. Nothing changes until you
            approve it here and the new address confirms it too. Until then,
            keep using this address to sign in.
         </Text>
         <Button href={approveUrl} style={button}>
            Approve the change
         </Button>
         <Text style={muted}>
            Didn&apos;t expect this? Don&apos;t click the button — ignore this
            email and contact us. The link can only be used once and expires
            after a while.
         </Text>
      </NoticeLayout>
   );
}

export type EmailChangeConfirmEmailProps = {
   firstName: string;
   confirmUrl: string;
   supportEmail: string;
};

/** Sent to the new address when an admin asks to change an account's email. */
export function EmailChangeConfirmEmail({
   firstName,
   confirmUrl,
   supportEmail,
}: EmailChangeConfirmEmailProps) {
   return (
      <NoticeLayout
         preview="Confirm your new MCLD email address"
         heading="Confirm your new email address"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            An MCLD administrator asked to use this address for your MCLD
            account. Confirm it below. The change finishes once your current
            address approves it too.
         </Text>
         <Button href={confirmUrl} style={button}>
            Confirm this address
         </Button>
         <Text style={muted}>
            The link can only be used once and expires after a while. If you
            don&apos;t have an MCLD account, ignore this email.
         </Text>
      </NoticeLayout>
   );
}

export type EmailChangedEmailProps = {
   firstName: string;
   oldEmail: string;
   newEmail: string;
   changedAt: string;
   supportEmail: string;
};

/** Sent to both the old and the new address once a change completes. */
export function EmailChangedEmail({
   firstName,
   oldEmail,
   newEmail,
   changedAt,
   supportEmail,
}: EmailChangedEmailProps) {
   return (
      <NoticeLayout
         preview="Your MCLD email address was changed"
         heading="Your email address was changed"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            The email address on your MCLD account was changed on{" "}
            <strong>{changedAt}</strong>.
         </Text>
         <Text style={detail}>
            <span style={detailLabel}>Before:</span> {oldEmail}
            <br />
            <span style={detailLabel}>Now:</span> {newEmail}
         </Text>
         <Text style={muted}>
            Sign in with the new address from now on. If you didn&apos;t approve
            this change, contact us right away.
         </Text>
      </NoticeLayout>
   );
}

export type PasswordChangedEmailProps = {
   firstName: string;
   changedAt: string;
   forgotPasswordUrl: string;
   supportEmail: string;
};

export function PasswordChangedEmail({
   firstName,
   changedAt,
   forgotPasswordUrl,
   supportEmail,
}: PasswordChangedEmailProps) {
   return (
      <NoticeLayout
         preview="Your MCLD password was changed"
         heading="Your password was changed"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            The password for your MCLD account was changed on{" "}
            <strong>{changedAt}</strong>. You&apos;ve been signed out
            everywhere, so sign in again with your new password.
         </Text>
         <Text style={paragraph}>
            If you didn&apos;t make this change, reset your password right away
            and contact us:
         </Text>
         <Button href={forgotPasswordUrl} style={button}>
            Reset my password
         </Button>
      </NoticeLayout>
   );
}

export type RoleChangedEmailProps = {
   firstName: string;
   oldRole: string;
   newRole: string;
   changedAt: string;
   supportEmail: string;
};

export function RoleChangedEmail({
   firstName,
   oldRole,
   newRole,
   changedAt,
   supportEmail,
}: RoleChangedEmailProps) {
   return (
      <NoticeLayout
         preview={`Your MCLD role is now ${newRole}`}
         heading="Your account role changed"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            An MCLD administrator changed your account role on{" "}
            <strong>{changedAt}</strong>.
         </Text>
         <Text style={detail}>
            <span style={detailLabel}>Before:</span> {oldRole}
            <br />
            <span style={detailLabel}>Now:</span> {newRole}
         </Text>
         <Text style={muted}>
            Sign out and back in if you don&apos;t see the change right away.
         </Text>
      </NoticeLayout>
   );
}

export type AccountDeletedEmailProps = {
   firstName: string;
   deletedAt: string;
   supportEmail: string;
};

export function AccountDeletedEmail({
   firstName,
   deletedAt,
   supportEmail,
}: AccountDeletedEmailProps) {
   return (
      <NoticeLayout
         preview="Your MCLD account was deleted"
         heading="Your account was deleted"
         supportEmail={supportEmail}
      >
         <Text style={paragraph}>Hi {firstName},</Text>
         <Text style={paragraph}>
            An MCLD administrator deleted your account on{" "}
            <strong>{deletedAt}</strong>. You can no longer sign in with this
            email address.
         </Text>
         <Text style={muted}>
            If you think this was a mistake, contact us and we&apos;ll help.
         </Text>
      </NoticeLayout>
   );
}

const body: React.CSSProperties = {
   backgroundColor: "#f3f3f3",
   fontFamily:
      "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
   color: "#111111",
   lineHeight: 1.5,
};

const container: React.CSSProperties = {
   maxWidth: "560px",
   margin: "0 auto",
   padding: "24px",
   backgroundColor: "#ffffff",
};

const logo: React.CSSProperties = {
   display: "block",
   margin: "0 auto 20px",
   height: "auto",
};

const h1: React.CSSProperties = {
   fontSize: "20px",
   margin: "0 0 16px",
};

const paragraph: React.CSSProperties = { fontSize: "14px", margin: "8px 0" };

const muted: React.CSSProperties = {
   fontSize: "14px",
   margin: "8px 0",
   color: "#666666",
};

const detail: React.CSSProperties = {
   fontSize: "14px",
   margin: "12px 0",
   padding: "12px",
   backgroundColor: "#f7f7f7",
};

const detailLabel: React.CSSProperties = { color: "#666666" };

const button: React.CSSProperties = {
   display: "inline-block",
   margin: "16px 0",
   padding: "12px 20px",
   borderRadius: "6px",
   backgroundColor: "#111111",
   color: "#ffffff",
   fontSize: "14px",
   fontWeight: 600,
   textDecoration: "none",
};

const rawLink: React.CSSProperties = {
   color: "#111111",
   wordBreak: "break-all",
};

const footerRule: React.CSSProperties = {
   borderColor: "#eeeeee",
   margin: "24px 0 0",
};

const footer: React.CSSProperties = {
   marginTop: "12px",
   fontSize: "12px",
   color: "#888888",
};

const footerLink: React.CSSProperties = { color: "#888888" };
