"use client";

import { login, signup } from "./actions";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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

function LoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const error = searchParams.get("error");
  const [mode, setMode] = useState<"login" | "signup">("login");

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
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              {message}
            </div>
          )}

          <form className="space-y-4">
            {mode === "signup" && (
              <div className="flex gap-3">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {mode === "login" ? (
                <>
                  <Button formAction={login}>Log in</Button>
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
                  <Button formAction={signup}>Sign up</Button>
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
