"use client";

import { useState } from "react";
import { useProgress } from "@bprogress/next";
import {
  UserWithSubscription,
  updateUserAction,
} from "@/actions/user-action";
import { SubscriptionWithCount } from "@/actions/subscription-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, MessageSquare, AlertCircle, Lock } from "lucide-react";

interface Props {
  user: UserWithSubscription | null;
  subscriptions: SubscriptionWithCount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: (user: UserWithSubscription) => void;
}

export default function EditUserModal({
  user,
  subscriptions,
  open,
  onOpenChange,
  onUserUpdated,
}: Props) {
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "MEMBER");
  const [subscriptionId, setSubscriptionId] = useState<string>(
    user?.subscriptionId || "none"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    startProgress();

    try {
      const res = await updateUserAction({
        userId: user.id,
        name: name.trim(),
        username: username.trim(),
        password: password.trim() || undefined,
        role,
        subscriptionId: subscriptionId === "none" ? null : subscriptionId,
      });

      if (res.success) {
        onUserUpdated(res.data);
        onOpenChange(false);
      } else {
        setError(res.error || "Gagal memperbarui data user.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-primary" /> Edit Akun User & Subscription
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nama Lengkap</Label>
            <Input
              placeholder="Nama Lengkap User"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Username</Label>
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Password Baru <span className="text-muted-foreground font-normal">(Kosongkan jika tidak diubah)</span>
            </Label>
            <div className="relative">
              <Input
                type="password"
                placeholder="Minimal 4 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-xs font-mono pl-8"
              />
              <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Role Pengguna</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER" className="text-xs">
                  MEMBER (CS / User Operasional)
                </SelectItem>
                <SelectItem value="CS" className="text-xs">
                  CS (Customer Service)
                </SelectItem>
                <SelectItem value="ADMIN" className="text-xs font-bold text-primary">
                  ADMIN (Administrator Sistem)
                </SelectItem>
                <SelectItem value="OWNER" className="text-xs font-bold text-amber-500">
                  OWNER (Pemilik Sistem)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscription Link Dropdown */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" /> Tautan WhatsApp Subscription
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Kaitkan akun ini ke salah satu paket WA Subscription terdaftar.
            </p>

            <Select value={subscriptionId} onValueChange={setSubscriptionId}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Pilih WhatsApp Subscription" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs text-muted-foreground italic">
                  -- Tanpa Subscription (Bebas Pilih Target) --
                </SelectItem>
                {subscriptions.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id} className="text-xs font-medium">
                    <span className="font-bold text-foreground">{sub.name}</span>{" "}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({sub.targetId} - {sub.plan})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="text-xs font-bold">
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
