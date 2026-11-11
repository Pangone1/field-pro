import "@lovable.dev/cloud-auth-js/styles.css";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { GoogleButton } from "@/components/app/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FieldPro" },
      { name: "description", content: "Sign in to FieldPro to see your jobs, invoices and mileage on any device." },
      { property: "og:title", content: "Sign in — FieldPro" },
      { property: "og:description", content: "Sign in to FieldPro to see your jobs, invoices and mileage on any device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // Already signed in (or just returned from an email link / Google) → straight to today's jobs.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/today" });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void navigate({ to: "/today" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) setSent("We sent a confirmation link to your email. Tap it to finish signing up.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If that email has an account, a password reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error(result.error.message || "Sign-in was cancelled.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/today" });
  };

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background px-5 pb-10 pt-12">
      <div className="hazard-strip absolute inset-x-0 top-0 h-1.5" />
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 rounded-xl" />
        <div className="leading-tight">
          <div className="font-display text-xl font-extrabold tracking-tight">FieldPro</div>
          <div className="text-xs text-muted-foreground">Solo contractor toolkit</div>
        </div>
      </div>

      <h1 className="mt-10 font-display text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your jobs, invoices and mileage — synced to every device, even after a day with no signal.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm">{sent}</p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => { setSent(null); setMode("signin"); }}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          {mode !== "forgot" && (
            <div className="mt-8 space-y-2">
              <GoogleButton disabled={busy} onClick={() => oauth("google")}>
                Continue with Google
              </GoogleButton>
              <button type="button" className="lovable-auth-button w-full" disabled={busy} onClick={() => oauth("lovable")}>
                Continue with Lovable
              </button>
              <div className="flex items-center gap-3 py-3 text-[11px] font-semibold uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className={mode === "forgot" ? "mt-8 space-y-3" : "space-y-3"}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button type="button" className="text-xs font-semibold text-primary" onClick={() => setMode("forgot")}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}
            <Button type="submit" variant="signal" size="xl" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                New to FieldPro?{" "}
                <button className="font-semibold text-primary" onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button className="font-semibold text-primary" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </>
      )}
      <Toaster position="top-center" />
    </div>
  );
}
