"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, type ActionState } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to your account"
              : "Fill in your details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              {message}
            </div>
          )}

          <form action={action} className="space-y-4" noValidate>
            {mode === "signup" && (
              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    placeholder="Jane"
                  />
                  <FieldError errors={signupState?.errors?.firstName} />
                </div>
                <div className="space-y-1 flex-1">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    placeholder="Doe"
                  />
                  <FieldError errors={signupState?.errors?.lastName} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
              />
              <FieldError errors={state?.errors?.email} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
              />
              <FieldError errors={state?.errors?.password} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {mode === "login" ? (
                <>
                  <Button type="submit">Log in</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode("signup")}
                  >
                    Create an account
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit">Sign up</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode("login")}
                  >
                    Already have an account? Log in
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
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
