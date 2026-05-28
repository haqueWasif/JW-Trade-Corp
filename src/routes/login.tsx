import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Terminal, Shield, Target, TrendingUp } from "lucide-react";
import jwLogo from "@/assets/jw-logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You're in.");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-card/80 to-background border-r border-border">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded bg-background border border-primary/40 grid place-items-center glow-primary overflow-hidden">
            <img src={jwLogo} alt="JW Trade Corp" className="size-full object-contain" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">JW TRADE</div>
            <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-widest">Jahir & Wasif Trade Corp</div>
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-primary uppercase tracking-widest mb-3">// Prop-Firm OS</div>
          <h1 className="text-4xl font-bold leading-tight">
            Pass the challenge.<br />Survive your own mistakes.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md">
            A private rule-protection system, strategy playbook, and trading journal built to keep you compliant with your prop firm and disciplined during every session.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-md">
            {[
              { Icon: Shield, t: "Rule Breach Engine" },
              { Icon: Target, t: "Strategy Playbook" },
              { Icon: TrendingUp, t: "Live Risk Tracker" },
            ].map(({ Icon, t }) => (
              <div key={t} className="panel p-3 text-center">
                <Icon className="size-5 mx-auto text-primary mb-2" />
                <div className="text-[11px] text-muted-foreground">{t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          v1.0 • secure private workspace
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="font-mono text-xs text-primary uppercase tracking-widest mb-1">// Authentication</div>
          <h2 className="text-2xl font-bold mb-6">Access your dungeon</h2>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-4">
                <Field label="Email"><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></Field>
                <Field label="Password"><Input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} /></Field>
                <Button type="submit" disabled={busy} className="w-full">{busy ? "..." : "Enter command center"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-4">
                <Field label="Email"><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></Field>
                <Field label="Password"><Input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} /></Field>
                <Button type="submit" disabled={busy} className="w-full">{busy ? "..." : "Create account"}</Button>
                <p className="text-[11px] text-muted-foreground">A FundingPips $2,500 Standard account is pre-seeded with default rules.</p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{label}</Label>
      {children}
    </div>
  );
}
