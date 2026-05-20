"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Layers } from "lucide-react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <div className="w-full max-w-md px-4">
      {/* Brand Mark */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand/20"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <Layers className="w-5 h-5 text-brand" />
        </div>
        <span
          className="text-2xl font-semibold tracking-tight text-text-primary"
        >
          JiraClone
        </span>
      </div>

      <Card
        className="border-border-default bg-surface-1"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-text-primary text-center">
            Sign in
          </CardTitle>
          <CardDescription className="text-text-tertiary text-center text-sm">
            Enter your credentials to access your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-text-secondary text-sm">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="bg-surface-2 border-border-default text-text-primary placeholder:text-text-tertiary
                           focus:border-border-focus hover:border-border-focus/50
                           transition-colors"
                style={{ transitionDuration: "var(--transition-fast)" }}
                placeholder="ali@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-text-secondary text-sm"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="bg-surface-2 border-border-default text-text-primary placeholder:text-text-tertiary
                           focus:border-border-focus hover:border-border-focus/50
                           transition-colors"
                style={{ transitionDuration: "var(--transition-fast)" }}
                placeholder="••••••••"
              />
            </div>

            {/* §9 — Error state: user-facing error, never silent */}
            {state?.error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2">
                <p className="text-sm text-danger">{state.error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-brand hover:bg-brand-hover text-white font-medium
                         transition-all cursor-pointer"
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-text-tertiary text-xs text-center mt-6">
        Demo accounts: ali.manager.demo · sara.frontend.demo · omar.backend.demo
      </p>
    </div>
  );
}
