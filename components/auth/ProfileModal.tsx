"use client";

import { useState } from "react";
import { useProgress } from "@bprogress/next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/actions/auth-action";
import { User, LogOut, ShieldCheck, KeyRound, Mail } from "lucide-react";

export interface UserProfileProps {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface ProfileModalProps {
  user: UserProfileProps | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ user, open, onOpenChange }: ProfileModalProps) {
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      setLoading(true);
      startProgress();
      await logoutAction();
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-primary" /> Profile User
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Informasi akun dan akses sistem operasional
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar & Main Info */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
            <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-primary/60 text-primary-foreground font-black text-xl flex items-center justify-center shadow-md ring-2 ring-primary/20">
              {getInitials(user.name)}
            </div>
            <div className="space-y-1 overflow-hidden">
              <h3 className="font-bold text-lg text-foreground truncate">
                {user.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                <Mail className="w-3.5 h-3.5" /> @{user.username}
              </p>
              <div className="pt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border-primary/20"
                >
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground/70" /> User
                ID
              </span>
              <span className="font-mono text-xs text-foreground/80 truncate max-w-50">
                {user.id}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Mode
                Keamanan
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                JWT Token Valid
              </span>
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-2">
            <Button
              variant="destructive"
              className="w-full flex items-center justify-center gap-2 font-medium shadow-sm hover:opacity-90 transition-opacity"
              onClick={handleLogout}
              disabled={loading}
            >
              <LogOut className="w-4 h-4" />
              {loading ? "Logging out..." : "Logout dari Sistem"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
