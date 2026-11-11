import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — FieldPro" },
      { name: "description", content: "Set a new password for your FieldPro account." },
      { property: "og:title", content: "Choose a new password — FieldPro" },
      { property: "og:description", content: "Set a new password for your FieldPro account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/today" });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background px-5 pt-16">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Opened from your reset email? Enter your new password below.</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" variant="signal" size="xl" className="w-full" disabled={busy}>
          Save password
        </Button>
      </form>
      <Toaster position="top-center" />
    </div>
  );
}
