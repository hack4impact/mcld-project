"use client";

import { useActionState, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  login,
  resendConfirmation,
  signup,
  type ActionState,
} from "./actions";
import { AuthAlert, AuthHeading, AuthShell } from "@/components/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/hooks/use-cooldown";
import { authErrorMessage, authNoticeMessage } from "@/lib/auth/messages";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

const RESEND_COOLDOWN_SECONDS = 60;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

function ResendConfirmationForm({
  email,
  next,
  justSent,
}: {
  email: string;
  next: string;
  // True right after signup sent a link, so the button starts on cooldown.
  justSent: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resendConfirmation,
    null
  );
  const { remaining, start } = useCooldown(RESEND_COOLDOWN_SECONDS, justSent);

  return (
    <form action={action} onSubmit={start} className="space-y-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      {state?.resent && (
        <p className="text-sm text-muted-foreground" role="status">
          If {email} is waiting for confirmation, we&apos;ve sent it a new
          link.
        </p>
      )}
      <FieldError errors={state?.errors?.email} />
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pending || remaining > 0}
      >
        {remaining > 0
          ? `Resend confirmation email in ${remaining}s`
          : "Resend confirmation email"}
      </Button>
    </form>
  );
}

function CheckEmail({
  email,
  next,
  onBack,
}: {
  email: string;
  next: string;
  onBack: () => void;
}) {
  return (
    <AuthShell>
      <AuthHeading
        title="Check your email"
        description={
          <>
            We sent a confirmation link to <strong>{email}</strong>. Open it on
            any device to finish creating your account. It works once and
            expires after about an hour.
          </>
        }
      />
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Can&apos;t find it? Check your spam folder, or send it again.
        </p>
        <ResendConfirmationForm email={email} next={next} justSent />
        <Button variant="ghost" size="lg" className="w-full" onClick={onBack}>
          Back to log in
        </Button>
      </div>
    </AuthShell>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const errorMessage = authErrorMessage(searchParams.get("error"));
  const noticeMessage = authNoticeMessage(searchParams.get("notice"));
  const nextParam = searchParams.get("next") ?? "/";
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loginState, loginAction] = useActionState<ActionState, FormData>(
    login,
    null
  );
  const [signupState, signupAction] = useActionState<ActionState, FormData>(
    signup,
    null
  );
  // The signup result the person already dismissed with "Back to log in".
  const [dismissedSignup, setDismissedSignup] = useState<ActionState>(null);

  if (
    mode === "signup" &&
    signupState?.checkEmail &&
    signupState !== dismissedSignup
  ) {
    return (
      <CheckEmail
        email={signupState.checkEmail}
        next={nextParam}
        onBack={() => {
          setDismissedSignup(signupState);
          setMode("login");
        }}
      />
    );
  }

  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;

  return (
    <AuthShell>
      <AuthHeading
        title={mode === "login" ? "Welcome back" : "Create an account"}
        description={
          mode === "login"
            ? "Sign in to your account to continue."
            : "Fill in your details to get started."
        }
      />

      {noticeMessage && <AuthAlert tone="success">{noticeMessage}</AuthAlert>}
      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}

      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={nextParam} />
        {mode === "signup" && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="Jane"
                className="h-10"
              />
              <FieldError errors={signupState?.errors?.firstName} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Doe"
                className="h-10"
              />
              <FieldError errors={signupState?.errors?.lastName} />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="h-10"
          />
          <FieldError errors={state?.errors?.email} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "login" && (
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="h-10"
          />
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">
              At least {PASSWORD_MIN_LENGTH} characters.
            </p>
          )}
          <FieldError errors={state?.errors?.password} />
        </div>
        <div className="flex flex-col gap-3 pt-3">
          {mode === "login" ? (
            <>
              <Button type="submit" size="lg">
                Log in
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setMode("signup")}
              >
                Create an account
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" size="lg">
                Sign up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setMode("login")}
              >
                Already have an account? Log in
              </Button>
            </>
          )}
        </div>
      </form>

      {mode === "login" && loginState?.unconfirmedEmail && (
        <div className="mt-5">
          <ResendConfirmationForm
            key={loginState.unconfirmedEmail}
            email={loginState.unconfirmedEmail}
            next={nextParam}
            justSent={false}
          />
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
