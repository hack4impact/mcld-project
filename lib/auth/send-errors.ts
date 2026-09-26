import {
   isAuthRetryableFetchError,
   type AuthError,
} from "@supabase/supabase-js";

export const EMAIL_NOT_SENT =
   "We couldn't send the email right now. Please try again in a few minutes.";

export function isTemporarySendFailure(error: AuthError): boolean {
   return (
      error.code === "over_request_rate_limit" ||
      isAuthRetryableFetchError(error)
   );
}
