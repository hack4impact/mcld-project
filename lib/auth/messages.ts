// Pages read `?error=` / `?notice=` codes and show these fixed messages, so a
// crafted URL can't put arbitrary text on the login page.

const ERRORS = {
   link_expired:
      "That link has expired or was already used. To get a new one, log in (for a confirmation email) or use “Forgot password?” (for a reset link).",
   link_invalid:
      "That link isn't valid. To get a new one, log in (for a confirmation email) or use “Forgot password?” (for a reset link).",
   link_other_browser:
      "We couldn't finish signing you in from this browser. If you were confirming your email, it's confirmed — log in. Otherwise, request a new link.",
   email_not_confirmed:
      "Confirm your email address first. We can send a new confirmation link.",
} as const;

const NOTICES = {
   password_updated:
      "Your password was changed and you've been signed out everywhere. Log in with your new password.",
} as const;

export function authErrorMessage(code: string | null): string | null {
   if (!code) return null;
   return code in ERRORS
      ? ERRORS[code as keyof typeof ERRORS]
      : "Something went wrong. Please try again.";
}

export function authNoticeMessage(code: string | null): string | null {
   if (!code || !(code in NOTICES)) return null;
   return NOTICES[code as keyof typeof NOTICES];
}
