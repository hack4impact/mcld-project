# Account emails, signup confirmation and password recovery

How MCLD accounts are confirmed, invited and recovered, which emails go out, and
the Supabase settings this depends on.

## Who sends what

Every email has exactly one sender. Supabase Auth sends the emails it creates
tokens for through its own SMTP settings. The app sends the rest through Brevo
(`lib/email/client.ts`).

| Event | Sent by | Template | Link goes to |
|---|---|---|---|
| Signup confirmation (and resend) | Supabase Auth | [`supabase/templates/confirm-signup.html`](../supabase/templates/confirm-signup.html) | `/auth/confirm?type=email` |
| Forgot password | Supabase Auth | [`supabase/templates/reset-password.html`](../supabase/templates/reset-password.html) | `/auth/confirm?type=recovery` |
| Email change requested by the user (for #129) | Supabase Auth | [`supabase/templates/change-email.html`](../supabase/templates/change-email.html) | `/auth/confirm?type=email_change` |
| Invite sent from the Supabase dashboard | Supabase Auth | [`supabase/templates/invite.html`](../supabase/templates/invite.html) | `/auth/confirm?type=invite` |
| Admin invitation (Users → Add user / Resend invitation) | App | `InviteEmail` in `lib/email/account-notices.tsx` | `/auth/confirm?type=invite` |
| Email change requested by an admin (Users → Edit user) | App | `EmailChangeApprovalEmail` (current address), `EmailChangeConfirmEmail` (new address) | `/auth/confirm?type=email_change` |
| Email changed (both addresses, on completion) | App | `EmailChangedEmail` | — |
| Password changed (after a reset) | App | `PasswordChangedEmail` | Link to `/auth/forgot-password` |
| Role changed | App | `RoleChangedEmail` | — |
| Account deleted | App | `AccountDeletedEmail` | — |

Notices only go to a **verified** address, and only after the change succeeded.
Failed changes, no-op edits and the rollback of a failed invitation send
nothing. If a notice can't be delivered, the change stays done and the admin
sees a warning.

## Supabase dashboard setup

Do this once per Supabase project (staging and production). None of it is in
code.

1. **Custom SMTP** (Authentication → SMTP Settings). Use Brevo, the same account
   as the app but its own SMTP key. Host `smtp-relay.brevo.com`, port `587`, the
   Brevo login and SMTP key, and a sender such as `MCLD <no-reply@…>`. Supabase's
   built-in sender only delivers to project team members, at about 2 emails an
   hour. With custom SMTP the limit starts at 30 an hour (Authentication → Rate
   Limits).
2. **URL configuration** (Authentication → URL Configuration).
   - Site URL: the app's URL, the same value as `APP_URL`.
   - Redirect URLs: add `<APP_URL>/**`, so signup can return people to where
     they were (for example a checkout page).
3. **Email templates** (Authentication → Emails → Templates). Paste each file
   from `supabase/templates/` and set the subject:

   | Template | File | Subject |
   |---|---|---|
   | Confirm signup | `confirm-signup.html` | `Confirm Your Signup` |
   | Invite user | `invite.html` | `You're invited to MCLD` |
   | Reset password | `reset-password.html` | `Reset your MCLD password` |
   | Change email address | `change-email.html` | `Confirm your MCLD email change` |
4. **Sign In / Providers → Email**
   - Turn **Confirm email** on. Unconfirmed accounts then can't sign in.
     **Admin email changes need this too:** while it's off, Supabase finishes
     an email change on the first link either address clicks. The app checks
     `mailer_autoconfirm` in Supabase's public auth settings and refuses to
     start an email change until it's on.
   - Keep **Secure email change** on (the default). Admin email changes refuse
     to start without it, because the current address must approve.
   - Set the **Minimum password length** to 8, matching the app.
5. **Security notifications** (Authentication → Emails). Keep **Password changed**
   and **Email address changed** off: the app already sends those notices.
6. **Email OTP expiration** (Sign In / Providers → Email) sets how long every
   email link works, invitations included. The default is 1 hour. Invitations
   can be re-sent from the Users page, or you can raise the limit (maximum
   24 hours).

## How the flows work

All email links point at **`/auth/confirm`**. It shows a button and only
verifies the token (`supabase.auth.verifyOtp({ type, token_hash })`) when the
person clicks it.

- **Works on any device.** Unlike Supabase's default `?code=` (PKCE) links,
  these don't have to be opened in the browser that asked for them.
- **Email scanners can't use up a link.** Tools like Outlook Safe Links open
  links ahead of the user, which would consume a one-time token.
- **Signing out another account first.** If someone else is signed in on that
  browser, the page says so, and continuing signs them out before the link's
  account is signed in.
- **Dead links.** Expired, already-used and invalid links show what to do next.

`/auth/callback` still handles `?code=` links, e.g. ones sent before the
templates changed.

### Signup confirmation

`signup` (`app/login/actions.ts`) passes `emailRedirectTo: APP_URL + next`.
The template sends it back as `next={{ .RedirectTo }}`, and `/auth/confirm` only
follows it if it's a path on this app. Public signup always creates a `user`:
the `handle_new_user` database trigger sets that role whatever the signup sends.

- The login page then shows **Check your email**, with a resend button that has
  a 60-second cooldown.
- Logging in before confirming shows the same resend button.
- The resend answer is the same whether or not the address has an account.
- If "Confirm email" is off, Supabase signs people straight in and the app skips
  the check-email screen.
- Before the templates are pasted in, Supabase's default link confirms the
  email and returns to the page without signing in, so the person logs in.

### Admin invitation

**Add user** no longer takes a password. `createUserAdmin`:

1. Calls `auth.admin.generateLink({ type: "invite" })`, which creates the
   account and a token **without sending anything**.
2. Sets up the account: profile, role (in `profiles.role` and `app_metadata`),
   and the complimentary subscription.
3. Only then emails the invitation through Brevo.

Failures are reported separately:

- **Setup fails:** a newly created account is deleted again (unless another request re-invited it meanwhile) and nothing is sent.
- **Subscription fails:** nothing is sent. Submit the form again to retry.
- **Email fails:** the account stays and the row gets a **Resend invitation**
  button.

Retrying never duplicates anything:

- Inviting an address with a pending invitation re-uses that account.
- `grantComplimentarySubscription` skips customers that already have a
  subscription.
- Every resend creates a new link, and the previous one stops working.
- An address that already has a confirmed account is refused.
- An address someone signed up with but never confirmed is refused too.
  Inviting that account would keep the password they chose, so delete it from
  the Users list first.

The invitee opens the link, lands on `/auth/set-password`, chooses a password,
and is signed in. That page only works in the 30 minutes after accepting. After
that (or once the invitation was accepted), people set their password with
**Forgot password?**, which the expired-link screens point to.

Anyone can ask Supabase to resend a signup confirmation for a pending address,
which replaces the invitation link. If the invitee confirms through that email
instead, `/auth/confirm` still sends them to `/auth/set-password`.

### Forgot password

1. **Log in → Forgot password?** (`/auth/forgot-password`) calls
   `resetPasswordForEmail`. It always gives the same answer and never creates
   an account.
2. The link leads to `/auth/reset-password`. Before the templates are pasted
   in, Supabase's default link goes through `/auth/callback` instead, which
   only works in the browser that asked for the reset.
3. That page only accepts a session that came from an email link in the last
   30 minutes. The access token's `amr` claim says `otp`, so the account comes
   from the verified token, never from anything the browser submits.
4. After the password changes:
   - Supabase ends the account's other sessions, and the app ends the current
     one too (session revocation policy: **sign out everywhere**).
   - The person is sent back to log in, and the password-changed notice is sent.
   - Access tokens that were already issued stay valid until they expire (the
     JWT expiry, 1 hour by default).

**For #129 (settings page):** after a signed-in user changes their password
(keeping #129's current-password check), call `sendPasswordChangedNotice` from
`lib/auth/account-emails.ts`, so there's still one sender for this notice. A
user-initiated `updateUser({ email })` needs nothing extra: the Change email
template already links to `/auth/confirm`, which sends the completion notices.

### Email change requested by an admin

Changing the email in **Edit user** doesn't change it straight away.
`updateUserAdmin` calls `generateLink` with `email_change_current` and
`email_change_new`:

- The current address gets an **approval** link.
- The new address gets a **confirmation** link.

The old address keeps working until both are clicked, in any order. Then Supabase
switches the email and the app emails both addresses.

- Nothing is saved if **Confirm email** is off or the settings can't be read
  (see the setup section).
- The role and profile are saved first, and the two links go out last, so an
  edit that fails to save never emails anyone. If the links can't be sent, the
  admin is told the other changes were saved.
- Saving the same new address again while its links still work (1 hour) doesn't
  send a second pair.

- The `?email=` in these links only picks who gets that completion notice, and
  it's ignored unless it matches the account that was verified.
- Invitations that haven't been accepted can't have their email changed (the
  address was never verified). Delete the account and invite the right address.

**Support path when the old address is unreachable:** confirm the person's
identity another way, then change the email in Supabase (Authentication →
Users → the user → edit email). That skips both confirmations and sends no
emails, so tell both addresses yourself.

### Role changes and deletion

- **Role change:** `profiles.role` and `app_metadata.user_role` are updated
  together. The access token picks up the new role at its next refresh (within
  the JWT expiry, 1 hour by default) or at the next sign-in. The notice tells
  the person to sign out and back in.
- **Deletion:** the address is captured before the account is deleted, and the
  notice is sent only if the deletion succeeded.

## Limits

- **Resend cooldowns.** The app's resend buttons wait 60 seconds between sends.
  Supabase also allows one email per address per 60 seconds, plus the
  project-wide hourly limit above. Admin re-invites are limited to one per minute
  per user.
- **Per-IP limits.** Supabase allows 30 signup, recovery, resend and verify
  requests per 5 minutes per IP. The app calls Supabase from its server, so all
  users share the server's IP for these limits.

## Testing checklist (staging, with test accounts)

- [ ] Sign up, confirm from a different browser or device, and land back on the
      page you started from (e.g. a checkout).
- [ ] Open a confirmation link while a different account is signed in.
- [ ] Open an expired or already-used link of each type: it shows what to do next.
- [ ] Log in before confirming, resend the confirmation, then confirm.
- [ ] Invite a user, accept on another device, set a password, and check the
      role, profile and subscription.
- [ ] Resend an invitation: the old link stops working.
- [ ] Forgot password with a known and an unknown address: same answer, and
      only the known one gets an email. Afterwards the old password fails, other
      sessions are signed out, and the password-changed notice arrives.
- [ ] Change a user's email as an admin, confirm from both addresses in either
      order, and check that both get the completion notice.
- [ ] Change a user's role and delete a user: each gets its notice. A failed
      deletion sends nothing.
- [ ] Each of the three roles can still log in after the templates change.
