"use client";

import { useState } from "react";
import { useProgress } from "@bprogress/next";
import {
  createMemberUserAction,
  UserWithSubscription,
} from "@/actions/user-action";
import { SubscriptionWithCount } from "@/actions/subscription-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MessageSquare, Link, PlusCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSubscriptions: SubscriptionWithCount[];
  onUserCreated: (user: UserWithSubscription) => void;
}

export default function AddMemberModal({
  open,
  onOpenChange,
  existingSubscriptions,
  onUserCreated,
}: Props) {
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MEMBER" | "CS" | "ADMIN">("MEMBER");

  // Subscription provisioning fields
  const [subscriptionMode, setSubscriptionMode] = useState<
    "new" | "existing" | "none"
  >("new");
  const [existingSubscriptionId, setExistingSubscriptionId] = useState("");

  // New Subscription fields
  const [targetId, setTargetId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [subName, setSubName] = useState("");
  const [plan, setPlan] = useState("STARTER");
  const [maxContainers, setMaxContainers] = useState(10);
  const [expiredAt, setExpiredAt] = useState(
    () =>
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
  );

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setRole("MEMBER");
    setSubscriptionMode("new");
    setExistingSubscriptionId("");
    setTargetId("");
    setPhoneNumber("");
    setSubName("");
    setPlan("STARTER");
    setMaxContainers(10);
    setExpiredAt(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
    );
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    startProgress();

    const payload = {
      name: name.trim(),
      username: username.trim(),
      password,
      role,
      subscriptionMode,
      existingSubscriptionId:
        subscriptionMode === "existing" ? existingSubscriptionId : undefined,
      newSubscription:
        subscriptionMode === "new"
          ? {
              targetId: targetId.trim(),
              phoneNumber: phoneNumber.trim() || undefined,
              name: subName.trim() || name.trim(),
              plan,
              maxContainers: Number(maxContainers),
              expiredAt,
            }
          : undefined,
    };

    try {
      const res = await createMemberUserAction(payload);
      setLoading(false);

      if (res.success) {
        if (res.data) {
          onUserCreated(res.data);
        }
        resetForm();
        onOpenChange(false);
      } else {
        setError(res.error || "Gagal membuat akun member.");
      }
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="w-5 h-5 text-primary" />
            Tambah Akun Member & Subscription
          </DialogTitle>
          <DialogDescription className="text-xs">
            Buat akun pengguna (Member/CS) baru sekaligus atur/buatkan paket WhatsApp Subscription-nya secara langsung.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: User Details */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              👤 Informasi Akun User
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mem-name" className="text-xs font-semibold">
                  Nama Lengkap
                </Label>
                <Input
                  id="mem-name"
                  placeholder="misal: Andri CS Import"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!subName) setSubName(e.target.value);
                  }}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-username" className="text-xs font-semibold">
                  Username Login
                </Label>
                <Input
                  id="mem-username"
                  placeholder="misal: andri_cs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mem-password" className="text-xs font-semibold">
                  Password Login
                </Label>
                <Input
                  id="mem-password"
                  type="password"
                  placeholder="Minimal 4 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-role" className="text-xs font-semibold">
                  Role Akses
                </Label>
                <select
                  id="mem-role"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "MEMBER" | "CS" | "ADMIN")}
                >
                  <option value="MEMBER">MEMBER (Auto WhatsApp Sub)</option>
                  <option value="CS">CS (Customer Service)</option>
                  <option value="ADMIN">ADMIN (Akses Penuh)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Subscription Link Mode */}
          <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Provisioning WhatsApp Subscription
              </h4>
              <Badge variant="outline" className="text-[10px] bg-background">
                Auto-Linked
              </Badge>
            </div>

            <div className="flex items-center gap-2 bg-background p-1.5 rounded-lg border border-border">
              <Button
                type="button"
                variant={subscriptionMode === "new" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSubscriptionMode("new")}
                className="text-xs font-bold gap-1.5 h-8 flex-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Buat Subscription Baru
              </Button>
              <Button
                type="button"
                variant={subscriptionMode === "existing" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSubscriptionMode("existing")}
                className="text-xs font-bold gap-1.5 h-8 flex-1"
              >
                <Link className="w-3.5 h-3.5" /> Pilih Yang Sudah Ada
              </Button>
            </div>

            {/* Mode NEW Subscription Form */}
            {subscriptionMode === "new" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="sub-targetId" className="text-xs font-semibold">
                    Target WhatsApp ID (Personal / Grup WA / LID)
                  </Label>
                  <Input
                    id="sub-targetId"
                    placeholder="misal: 628123456789@c.us atau 1203630123@g.us"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    required={subscriptionMode === "new"}
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Personal: <code>@c.us</code>, Grup: <code>@g.us</code>, LID: <code>@lid</code>.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sub-name" className="text-xs font-semibold">
                    Nama Klien / Grup WA
                  </Label>
                  <Input
                    id="sub-name"
                    placeholder="misal: PT Logistics / Client Import A"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    required={subscriptionMode === "new"}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sub-plan" className="text-xs font-semibold">
                      Paket Subscription
                    </Label>
                    <select
                      id="sub-plan"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={plan}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setPlan(selected);
                        if (selected === "STARTER") setMaxContainers(10);
                        else if (selected === "BUSINESS") setMaxContainers(25);
                        else if (selected === "ENTERPRISE" || selected === "UNLIMITED")
                          setMaxContainers(0);
                      }}
                    >
                      <option value="STARTER">STARTER (10 Container)</option>
                      <option value="BUSINESS">BUSINESS (25 Container)</option>
                      <option value="ENTERPRISE">ENTERPRISE (Unlimited)</option>
                      <option value="UNLIMITED">CUSTOM UNLIMITED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sub-expired" className="text-xs font-semibold">
                      Tanggal Kadaluarsa
                    </Label>
                    <Input
                      id="sub-expired"
                      type="date"
                      value={expiredAt}
                      onChange={(e) => setExpiredAt(e.target.value)}
                      required={subscriptionMode === "new"}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode EXISTING Subscription Form */}
            {subscriptionMode === "existing" && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="sub-existing" className="text-xs font-semibold">
                  Pilih Subscription Terdaftar
                </Label>
                <select
                  id="sub-existing"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={existingSubscriptionId}
                  onChange={(e) => setExistingSubscriptionId(e.target.value)}
                  required={subscriptionMode === "existing"}
                >
                  <option value="">-- Pilih Subscription Klien --</option>
                  {existingSubscriptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.targetId}) - {s.plan}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Akun member ini akan otomatis menggunakan kuota dan target notifikasi paket subscription terpilih.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="font-bold">
              {loading ? "Memproses..." : "Buat Akun Member & Provisioning"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
