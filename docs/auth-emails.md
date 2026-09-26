# Authentication email requirements

Status: proposed implementation scope. This document records the repository review and acceptance criteria; it does not implement the flows or change Supabase configuration.

Reviewed `develop` at `77f2392` on 2026-09-26. Requirements apply to user, coordinator, and admin accounts. Children and emergency contacts are not authentication accounts and must not receive account-access links.

## Current behavior and gaps

| Area                   | Repository evidence                                                                                                                                                                                                                    | Gap                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Self-service signup    | [`signup`](../app/login/actions.ts) calls `auth.signUp` with a password and names, then redirects to a check-email message.                                                                                                            | No explicit `emailRedirectTo`, resend action, or tracked proof that confirmation is required in deployed Supabase settings.                                                                                                |
| Email callback         | [`/auth/callback`](../app/auth/callback/route.ts) exchanges a `code` for a session.                                                                                                                                                    | No token-hash verification or invitation/recovery destination handling. Failures use `?error=`, but the [login page](../app/login/page.tsx) only displays `message`. Destination validation needs to be shared and tested. |
| Admin account creation | [`createUserAdmin`](../app/%28authenticated%29/users/actions.ts) supplies an admin-chosen password and `email_confirm: true`; the [dialog](../app/%28authenticated%29/users/_components/user-admin-dialog.tsx) collects that password. | No invitation or account-created email. The recipient never proves ownership or chooses their own initial password.                                                                                                        |
| Password recovery      | [Login UI and actions](../app/login/page.tsx) contain login/signup only.                                                                                                                                                               | No forgot-password request, reset page, recovery action, or resend UI.                                                                                                                                                     |
| Email and role edits   | [`updateUserAdmin`](../app/%28authenticated%29/users/actions.ts) changes Auth email/app metadata and then `profiles.role`.                                                                                                             | No app-level verification or notifications; an Auth update can succeed before the profile update fails.                                                                                                                    |
| Account deletion       | [`deleteUserAdmin`](../app/%28authenticated%29/users/actions.ts) deletes the Auth user after the coordinator-assignment check.                                                                                                         | No deletion notice or durable record for email delivery after deletion.                                                                                                                                                    |
| Account settings       | [`/settings`](../app/%28authenticated%29/settings/page.tsx) is a heading-only stub.                                                                                                                                                    | [Issue #129](https://github.com/hack4impact/mcld-project/issues/129) plans a password-change form; its successful changes need the same password-changed notice as recovery. Email is read-only in that issue.             |
| Delivery               | [`lib/email/client.ts`](../lib/email/client.ts) uses Brevo SMTP; current [templates](../lib/email/templates.ts) and `emails/` previews concern coordinator bookings.                                                                   | No versioned auth templates or auth delivery setup. App SMTP environment variables do not configure Supabase Auth SMTP.                                                                                                    |

The live Supabase dashboard, mail delivery, and database hooks were not inspected. Existing signup confirmation may already send provider-default mail; deployed settings and behavior must be verified rather than inferred from the success message. [Profile documentation](./profiles.md) also describes a signup trigger and access-token hook that need to be checked when implementing invitations.

## Email inventory

Action emails require the recipient to complete a step. Notices report a completed change and must not imply that another confirmation is required.

| Priority                     | Event and recipient                                                                             | Email / action                                                                                                                    | Delivery owner                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Required                     | A person signs up; send to their submitted address.                                             | **Confirm your MCLD email address** — verify ownership before normal sign-in.                                                     | Supabase Auth confirmation template.                                                         |
| Required                     | An admin creates an account; send to the intended account owner.                                | **You have been invited to MCLD** — explain who created the account, confirm ownership, and let the recipient set their password. | Supabase Auth invitation flow.                                                               |
| Required                     | A person requests password recovery; send only when the address belongs to an eligible account. | **Reset your MCLD password** — open a form to choose a new password.                                                              | Supabase Auth recovery template.                                                             |
| Required supporting behavior | The recipient requests another confirmation, invitation, or recovery email.                     | Resend the relevant action email, subject to rate limits; this is not a separate template.                                        | The owner of the original flow.                                                              |
| Recommended for this scope   | A password is successfully reset or changed; send to the account's current verified address.    | **Your MCLD password was changed** — state when it happened and how to report an unexpected change.                               | Enable and verify Supabase's password-changed notification.                                  |
| Recommended for this scope   | An admin requests an email-address change.                                                      | **Confirm your new MCLD email address**, plus approval/notice to the existing address as described below.                         | Explicit pending-change workflow; do not assume the current admin API performs verification. |
| Recommended for this scope   | An email-address change completes; notify the previous and newly verified addresses.            | **Your MCLD email address was changed** — identify the change and provide a support path.                                         | Verify provider recipients; add app delivery only for uncovered recipients.                  |
| Recommended for this scope   | An admin changes a role; send to the account's verified address.                                | **Your MCLD account access was updated** — previous/new role, effective time, and support contact.                                | App notification using Brevo.                                                                |
| Recommended for this scope   | An admin successfully deletes an established account; send to its last verified address.        | **Your MCLD account was deleted** — effective time and support contact.                                                           | App notification using Brevo, with recipient captured before deletion.                       |

Do not add routine login/logout emails or a second signup welcome message for this scope. Magic links, MFA changes, phone-auth changes, linked identity changes, suspicious-login alerts, account suspension/reactivation, and self-service deletion have no corresponding implemented flows in this review. Add their email requirements when those features are introduced. An email reauthentication code is conditional on the security policy selected for sensitive changes; it is not a replacement for the password-change notice.

## Required flows

### 1. Signup and confirmation

- Enable and verify **Confirm email** in every deployed Supabase environment. A successful signup must leave the user unable to enter authenticated features until email ownership is confirmed.
- Keep first/last-name metadata and the default `user` role. Never accept a privileged role from public signup input.
- Send a branded confirmation email with one clear action, an expiry explanation matching the configured lifetime, and guidance for an unrequested signup.
- Show a check-your-email screen with a return-to-login link and a rate-limited resend action. Avoid revealing whether an address already has an account.
- Make the email template, redirect configuration, and callback agree on the token flow. On success, show a clear confirmation result and continue to a validated internal destination, including a saved checkout destination when present.
- Handle invalid, expired, used, and missing tokens with visible errors and a safe way to request another email. Do not show authentication errors in a success banner.

### 2. Admin-created accounts

- Replace the admin-entered password/confirmation fields and unconditional `email_confirm: true` with an invitation workflow. Never email a password, temporary password, or admin credential.
- Keep admin-only authorization and the existing name, role, and optional complimentary-subscription inputs. The invitation should explain that MCLD created the account and offer **Accept invitation and set password**.
- Use Supabase-issued invitation tokens. `inviteUserByEmail` is a possible entry point, but it sends immediately: design provisioning order so recipients cannot enter an incomplete account. If delivery must happen after provisioning, evaluate Supabase `generateLink` with app delivery as an alternative, choosing one sender for the invitation.
- Ensure profile creation, trusted role assignment, and required metadata succeed before granting the invited user normal access. Enforce any pending-setup state on the server, not only by redirecting the browser to a password form. Do not derive roles from user-editable metadata or URL parameters.
- Preserve the intended complimentary subscription without granting it again on resend/retry. Report account creation, invitation delivery, and subscription failures separately, with a retry that targets the existing account.
- Correct the current profile-write failure path as part of this flow: it attempts to delete the new Auth user but then continues toward subscription creation and a success response. Failed provisioning must not report success or send a usable invitation; failed rollback also needs an explicit recoverable state.
- After successful token verification, let the recipient choose and confirm a password, then finish setup. A link opened from another browser/device must work without relying on the creating admin's session.
- Admins can resend to a still-pending recipient with a cooldown. Do not create duplicate users or reopen completed invitations. Notify the admin of delivery failures without leaking token values.

### 3. Forgot password and reset

- Add **Forgot password?** to login and a publicly reachable request form. Suggested routes are `/auth/forgot-password` and `/auth/reset-password`, which fit the current public `/auth` prefix; still enforce all required checks in the reset action.
- Use `resetPasswordForEmail` with an approved reset destination. Return the same public response for existing and unknown addresses, such as: "If an account exists for this email, we will send password reset instructions." Unknown addresses must not create accounts.
- Apply server-side request/resend limits and a visible cooldown. Handle delivery/service failures without exposing account existence or leaving the UI stuck.
- Verify the recovery token before accepting a new password. Resolve the account from the verified session and recovery context; never trust a submitted user ID, email, or `type=recovery` query parameter as authorization.
- Ask for a new password and confirmation. Use a shared policy across signup, invitations, recovery, and settings, with at least the existing admin/settings minimum of eight characters; login must continue to accept existing valid credentials even if they predate that policy.
- Invalid or expired links offer a fresh request. Consumed links cannot reset again. After a successful reset, invalidate other refresh sessions according to the chosen session policy, sign out the recovery session, and return to login with a success message. Verify the provider's access-token expiry behavior rather than promising immediate revocation of every existing token.
- Send the password-changed notice only after the update succeeds. The same notice applies to the authenticated change-password feature in #129, which requires verification of the current password. Confirm compatibility with the installed SDK before selecting its reauthentication API.

## Additional flows justified by the repository

### Email-address changes

The existing admin form can change an account's sign-in address. Supabase documents that [`updateUserById`](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) applies changes directly without confirmation flows. Enabling secure email change alone does not repair this admin path.

- Record a pending requested address and retain the current verified sign-in address until the required checks complete. Verify the new address and require approval from the existing address for the normal change flow; an inaccessible old mailbox needs a separately audited support recovery process.
- The requested change and its tokens must be bound to the target account and exact new address, expire, be single-use, and be invalidated if the request is replaced or cancelled. Do not build an unsigned "confirm" URL around a direct admin update.
- Notify the existing address when the change is requested, with instructions for an unexpected request. Apply the change only after confirmation; notify both addresses on completion. Send no completion notice on failure or cancellation.
- Keep role changes independent of pending email changes. A request that also changes role must not prematurely replace the recipient address for role/security notices.
- Prefer the provider's secure change flow where supported. If implementing an admin-driven pending workflow, explicitly document its state, verification, finalization, and recovery model before coding it. Verify whether provider email-changed notifications cover admin operations and both recipients; cover any gaps without sending duplicate notices.

Self-service email editing remains outside #129's current scope. If added later, it must reuse these ownership-verification requirements.

### Role changes and account deletion

- A role notice follows a real successful role transition, including promotions and demotions among user, coordinator, and admin. A no-op save sends nothing. Keep Auth metadata and `profiles.role` consistent, reconcile partial failures, and address session/claim refresh as part of making the access change effective.
- A deletion notice follows a successful explicit admin deletion. Capture the verified recipient before Auth data is removed and persist enough delivery information to retry afterward. A coordinator-assignment rejection, failed deletion, or rollback of an incomplete signup/invitation sends no deletion notice.
- These emails are informational; the user does not need to approve the admin action by email. Do not imply that deleting an account automatically cancels a Stripe subscription, issues a refund, or erases all records. Subscription handling is a separate account-lifecycle concern.
- Notification failure must not reverse a completed role change or deletion. Use a durable delivery record with bounded retry and duplicate protection, and surface operational failures to admins.

## Delivery, callbacks, and configuration

Prefer Supabase Auth as the owner of confirmation, invitation, recovery, and built-in password/email security notices, with Brevo configured as its custom SMTP transport. Continue using the app's Brevo sender for role/deletion notices. If a custom send hook or generated-link workflow is chosen, assign exactly one sender per event and keep Supabase responsible for token issuance/verification.

- Configure Supabase SMTP separately from `BREVO_SMTP_*` in the app. Verify the sending domain, sender/reply-to addresses, delivery to an address outside the Supabase project team, and actual configured send limits. The [default SMTP service is not intended for production](https://supabase.com/docs/guides/auth/auth-smtp).
- Version templates or reproducible setup instructions for each enabled email. Configure and verify [password/email change notifications](https://supabase.com/docs/guides/auth/auth-email-templates), which are project-level settings. Do not assume they are enabled.
- Use an explicit trusted app origin, exact approved redirect URLs per environment, and HTTPS outside local development. Validate post-auth destinations as permitted same-origin paths, rejecting external, protocol-relative, backslash, and encoded bypass cases. Use fixed destinations for invitation/recovery where possible.
- Support the token format chosen for each template. The current code-exchange callback alone does not implement the complete invitation/recovery flow. For server-side token-hash verification, allow only the intended action types and call `verifyOtp` before trusting the resulting session; see [Supabase's server-side email link guidance](https://supabase.com/docs/guides/auth/auth-email-templates#redirecting-the-user-to-a-server-side-endpoint).
- Test links across browsers/devices and when a different account is already signed in. Avoid updating the wrong account or accidentally losing a saved destination. Consider an explicit confirmation button or code entry so mail scanners do not consume single-use links on prefetch; disable provider link tracking that rewrites auth links.
- Render accessible mobile-friendly HTML and a readable text alternative, with MCLD branding, one primary action where needed, accurate expiry wording, and a real support contact. Notices include the event time and advice for unexpected changes. Do not include passwords, unnecessary profile/child data, or sensitive details in subjects.
- Log event type, delivery status, and a safe correlation ID; redact tokens, full action URLs, passwords, and secret keys. Keep privileged clients and SMTP credentials server-only.
- Document required environment variables, including the existing `SUPABASE_SECRET_KEY` admin-client dependency, without committing values. Record confirmation settings, token lifetimes, resend limits, sender ownership, session policy, and deployment steps so local/staging/production behave consistently.

## Acceptance and verification

These are implementation acceptance criteria, not claims that the flows have been tested or delivered by this documentation PR.

- [ ] Unconfirmed self-signup cannot sign in or access protected features; confirmation works and provides clear success/failure feedback.
- [ ] Resending signup confirmation respects limits and handles unknown, existing, and already-confirmed addresses without enumeration.
- [ ] Admin creation sends an invitation without exposing a password. Accepting it establishes the correct profile/role and a recipient-chosen password, including from another device.
- [ ] Duplicate invite submissions, delivery retries, profile failures, and subscription failures neither duplicate users/subscriptions nor grant access to incomplete accounts.
- [ ] Forgot-password returns an indistinguishable response for known and unknown addresses. Only the intended account receives a recovery email, and unknown addresses create no account.
- [ ] Recovery requires verified authorization; mismatched/weak passwords, missing/tampered/expired/reused tokens, and a different signed-in user cannot update the wrong account.
- [ ] Reset succeeds with the new password, the old password fails, the agreed session policy is enforced, and exactly one password-changed notice is sent. A failed update sends none.
- [ ] #129's settings password change uses the same policy and notice, with current-password verification preserved.
- [ ] Email changes remain pending until required ownership checks pass, cover old/new recipient notifications, and handle cancellation, replaced requests, partial failures, and recovery without prematurely changing the sign-in address.
- [ ] Role/deletion notices follow successful state changes only, use the correct verified recipient, and survive retry without duplicates; deletion rollback and no-op role saves send none.
- [ ] Callback destinations cannot escape approved origins, errors are visible, and intended login/checkout destinations survive the confirmation flow.
- [ ] Automated action/route tests cover authorization, validation, token errors, enumeration resistance, redirect validation, and delivery/provisioning failures using mocks or a mail sink.
- [ ] Staging end-to-end checks verify real provider templates, configuration, delivery, expiry/replay handling, scanner behavior, and cross-device links for all three roles. Confirm that no real users receive test emails.

Suggested implementation order: delivery/configuration and shared callback handling; signup/resend; invitations; recovery and password-change notices; pending email changes; role/deletion delivery. Treat the live Supabase configuration and staging checks as release requirements, not consequences of merging application code.

## Provider references

- [Email/password signup and recovery](https://supabase.com/docs/guides/auth/passwords)
- [Admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Admin-generated action links](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Email templates and security notifications](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Admin updates bypass confirmation](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
