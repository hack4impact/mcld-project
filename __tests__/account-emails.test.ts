/**
 * @jest-environment node
 */
import {
   sendEmailChangeRequest,
   sendInviteEmail,
} from "@/lib/auth/account-emails";
import {
   accountDeletedEmail,
   emailChangeApprovalEmail,
   emailChangeConfirmEmail,
   emailChangedEmail,
   inviteEmail,
   passwordChangedEmail,
   roleChangedEmail,
} from "@/lib/email/templates";

jest.mock("server-only", () => ({}));

// @react-email/render loads its renderer with a dynamic import that Jest can't
// run, so render the same components with React's own static renderer.
jest.mock("@react-email/render", () => ({
   render: async (
      element: React.ReactElement,
      options?: { plainText?: boolean },
   ) => {
      const { renderToStaticMarkup } =
         jest.requireActual<typeof import("react-dom/server")>(
            "react-dom/server",
         );
      const html: string = renderToStaticMarkup(element);
      return options?.plainText ? html.replace(/<[^>]+>/g, " ") : html;
   },
}));
jest.mock("@/lib/db", () => ({ db: {} }));

const sendEmail = jest.fn();
jest.mock("@/lib/email/client", () => ({
   sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const env = { ...process.env };
beforeAll(() => {
   process.env.APP_URL = "https://app.mcld.example";
   process.env.EMAIL_FROM = "MCLD <hello@mcld.example>";
   delete process.env.SUPPORT_EMAIL;
});
afterAll(() => {
   for (const key of ["APP_URL", "EMAIL_FROM", "SUPPORT_EMAIL"] as const) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
   }
});

beforeEach(() => {
   jest.clearAllMocks();
   sendEmail.mockResolvedValue(undefined);
});

function linkIn(html: string, label: string) {
   // The href of the first link whose content includes `label` (buttons wrap
   // their label in spans).
   const links = html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g);
   for (const [, href, content] of links) {
      if (content!.includes(label)) {
         return new URL(href!.replaceAll("&amp;", "&"));
      }
   }
   throw new Error(`No link labelled ${label}`);
}

describe("sendInviteEmail", () => {
   it("links to /auth/confirm with the invite token", async () => {
      await sendInviteEmail({
         to: "ada@example.com",
         firstName: "Ada",
         tokenHash: "invite-token",
      });

      const [{ to, html }] = sendEmail.mock.calls[0];
      expect(to).toBe("ada@example.com");
      const url = linkIn(html, "Accept invitation and set password");
      expect(url.origin + url.pathname).toBe(
         "https://app.mcld.example/auth/confirm",
      );
      expect(url.searchParams.get("token_hash")).toBe("invite-token");
      expect(url.searchParams.get("type")).toBe("invite");
   });
});

describe("sendEmailChangeRequest", () => {
   it("sends the approval to the current address and the confirmation to the new one", async () => {
      await sendEmailChangeRequest({
         firstName: "Ada",
         currentEmail: "ada+old@example.com",
         newEmail: "ada@new.example.com",
         currentTokenHash: "current-token",
         newTokenHash: "new-token",
      });

      const [approval, confirmation] = sendEmail.mock.calls.map((c) => c[0]);
      expect(approval.to).toBe("ada+old@example.com");
      expect(confirmation.to).toBe("ada@new.example.com");

      const approveUrl = linkIn(approval.html, "Approve the change");
      expect(approveUrl.searchParams.get("token_hash")).toBe("current-token");
      expect(approveUrl.searchParams.get("type")).toBe("email_change");
      // The + must survive, so the completion notice finds the account.
      expect(approveUrl.searchParams.get("email")).toBe("ada+old@example.com");

      const confirmUrl = linkIn(confirmation.html, "Confirm this address");
      expect(confirmUrl.searchParams.get("token_hash")).toBe("new-token");
      expect(confirmUrl.searchParams.get("email")).toBe("ada+old@example.com");
   });
});

describe("notice templates", () => {
   it.each([
      [
         "invite",
         () => inviteEmail({ firstName: "Ada", acceptUrl: "https://x/a" }),
         "invited to MCLD",
      ],
      [
         "email change approval",
         () =>
            emailChangeApprovalEmail({
               firstName: "Ada",
               newEmail: "new@example.com",
               approveUrl: "https://x/a",
            }),
         "new@example.com",
      ],
      [
         "email change confirmation",
         () =>
            emailChangeConfirmEmail({
               firstName: "Ada",
               confirmUrl: "https://x/a",
            }),
         "Confirm this address",
      ],
      [
         "email changed",
         () =>
            emailChangedEmail({
               firstName: "Ada",
               oldEmail: "old@example.com",
               newEmail: "new@example.com",
               changedAt: "Sat, Sep 26, 2026",
            }),
         "old@example.com",
      ],
      [
         "password changed",
         () =>
            passwordChangedEmail({
               firstName: "Ada",
               changedAt: "Sat, Sep 26, 2026",
               forgotPasswordUrl: "https://x/f",
            }),
         "Sat, Sep 26, 2026",
      ],
      [
         "role changed",
         () =>
            roleChangedEmail({
               firstName: "Ada",
               oldRole: "User",
               newRole: "Coordinator",
               changedAt: "Sat, Sep 26, 2026",
            }),
         "Coordinator",
      ],
      [
         "account deleted",
         () =>
            accountDeletedEmail({
               firstName: "Ada",
               deletedAt: "Sat, Sep 26, 2026",
            }),
         "Sat, Sep 26, 2026",
      ],
   ])(
      "renders the %s email with a support contact",
      async (_label, render, expected) => {
         const email = await render();

         expect(email.subject).toMatch(/MCLD/);
         expect(email.html).toContain(expected);
         expect(email.text).toContain(expected);
         // SUPPORT_EMAIL isn't set, so it falls back to the sender's address.
         expect(email.html).toContain("mailto:hello@mcld.example");
      },
   );
});
