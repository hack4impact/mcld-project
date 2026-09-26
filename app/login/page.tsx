"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { CircleCheck } from "lucide-react";
import { login, signup, type ActionState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
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

  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <BrandPanel />

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Image
            src="/logo.png"
            alt="Montréal Centre for Learning Disabilities"
            width={200}
            height={66}
            className="mb-10 h-12 w-auto"
            priority
          />

          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Sign in to your account to continue."
                : "Fill in your details to get started."}
            </p>
          </div>

          {message && (
            <div className="mb-6 flex items-start gap-2 rounded-xl bg-success-soft p-3.5 text-sm font-medium text-success">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              {message}
            </div>
          )}

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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="h-10"
              />
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
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[#263962] lg:block">
      <Image
        src="/login-hero.png"
        alt="A smiling teacher working with a young student at her desk"
        fill
        priority
        sizes="40vw"
        className="object-cover object-[70%_50%]"
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
