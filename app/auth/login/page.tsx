"use client";

import { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Ship,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await loginAction({ username, password });
      if (res.success) {
        window.location.href = redirectPath;
      } else {
        setError(res.error || "Gagal melakukan verifikasi kredensial");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-background via-muted/30 to-background p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-border/60 shadow-2xl backdrop-blur-xl bg-card/90 z-10 relative">
        <CardHeader className="space-y-3 text-center pb-6 border-b border-border/40">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-tr from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 text-primary-foreground">
            <Ship className="w-9 h-9" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              CS EKSIM TRACKER
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Freight Forwarding Operational Dashboard
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-xs font-semibold text-foreground/80 uppercase tracking-wider"
              >
                Username
              </Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 bg-background/60 focus:bg-background transition-colors"
                  disabled={isPending}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-foreground/80 uppercase tracking-wider"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-background/60 focus:bg-background transition-colors"
                  disabled={isPending}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 group"
              disabled={isPending}
            >
              {isPending ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-4 border-t border-border/40 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Diunduh dengan Proteksi JWT & Encrypted Password</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-2">
            <Ship className="w-10 h-10 animate-bounce mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Memuat halaman login...
            </p>
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
