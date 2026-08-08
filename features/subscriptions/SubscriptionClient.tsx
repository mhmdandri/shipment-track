"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@bprogress/next";
import {
  SubscriptionWithCount,
  createSubscriptionAction,
  updateSubscriptionAction,
  toggleSubscriptionAction,
  deleteSubscriptionAction,
} from "@/actions/subscription-action";
import {
  getUsersAction,
  UserWithSubscription,
} from "@/actions/user-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Plus,
  Calendar,
  Layers,
  Power,
  Trash2,
  Edit2,
  Users,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import DialogDelete from "./components/DialogDelete";
import AddMemberModal from "./components/AddMemberModal";
import MemberUsersList from "./components/MemberUsersList";

interface Props {
  initialSubscriptions: SubscriptionWithCount[];
}

export default function SubscriptionClient({ initialSubscriptions }: Props) {
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [activeTab, setActiveTab] = useState<"subscribers" | "members">("subscribers");
  const [subscriptions, setSubscriptions] =
    useState<SubscriptionWithCount[]>(initialSubscriptions);
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionWithCount | null>(
    null,
  );

  const [now] = useState(() => new Date());

  // Load Member Users list
  useEffect(() => {
    async function loadUsers() {
      const res = await getUsersAction();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    }
    loadUsers();
  }, []);

  // Form Fields State
  const [targetId, setTargetId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("STARTER");
  const [maxContainers, setMaxContainers] = useState(10);
  const [expiredAt, setExpiredAt] = useState(
    () =>
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
  );
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingSub(null);
    setTargetId("");
    setPhoneNumber("");
    setName("");
    setPlan("STARTER");
    setMaxContainers(10);
    setExpiredAt(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    );
    setIsActive(true);
    setError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (sub: SubscriptionWithCount) => {
    setEditingSub(sub);
    setTargetId(sub.targetId);
    setPhoneNumber(sub.phoneNumber || "");
    setName(sub.name);
    setPlan(sub.plan);
    setMaxContainers(sub.maxContainers);
    setExpiredAt(new Date(sub.expiredAt).toISOString().split("T")[0]);
    setIsActive(sub.isActive);
    setError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    startProgress();

    const payload = {
      targetId: targetId.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      name: name.trim(),
      plan,
      maxContainers: Number(maxContainers),
      expiredAt,
      isActive,
    };

    try {
      if (editingSub) {
        const res = await updateSubscriptionAction(editingSub.id, payload);
        setLoading(false);
        if (res.success) {
          setSubscriptions((prev) =>
            prev.map((s) => (s.id === editingSub.id ? res.data : s)),
          );
          setDialogOpen(false);
        } else {
          setError(res.error);
        }
      } else {
        const res = await createSubscriptionAction(payload);
        setLoading(false);
        if (res.success) {
          setSubscriptions((prev) => [res.data, ...prev]);
          setDialogOpen(false);
        } else {
          setError(res.error);
        }
      }
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  const handleToggleActive = async (sub: SubscriptionWithCount) => {
    const nextStatus = !sub.isActive;
    startProgress();
    try {
      const res = await toggleSubscriptionAction(sub.id, nextStatus);
      if (res.success) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === sub.id ? { ...s, isActive: nextStatus } : s)),
        );
      }
    } finally {
      stopProgress();
    }
  };

  const handleQuickExtend = async (
    sub: SubscriptionWithCount,
    months: number,
  ) => {
    const nowTime = now.getTime();
    const currentExpiry =
      new Date(sub.expiredAt).getTime() > nowTime
        ? new Date(sub.expiredAt)
        : new Date();

    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    const res = await updateSubscriptionAction(sub.id, {
      targetId: sub.targetId,
      name: sub.name,
      plan: sub.plan,
      maxContainers: sub.maxContainers,
      expiredAt: newExpiry.toISOString().split("T")[0],
      isActive: true,
    });

    if (res.success) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? res.data : s)),
      );
    }
  };

  const handleDelete = async (id: string) => {
    startProgress();
    try {
      const res = await deleteSubscriptionAction(id);
      if (res.success) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      }
      setDialogDeleteOpen(false);
    } finally {
      stopProgress();
    }
  };

  const handleDeleteDialogOpen = (id: string) => {
    setDialogDeleteOpen(true);
    setDeleteTargetId(id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Subscriptions & Member Accounts
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola akses klien WhatsApp, paket subscription, serta akun Member & CS.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border shrink-0">
          <Button
            type="button"
            variant={activeTab === "subscribers" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("subscribers")}
            className="text-xs font-bold gap-1.5 h-8 rounded-lg"
          >
            <CreditCard className="w-3.5 h-3.5" /> WhatsApp Subscribers ({subscriptions.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === "members" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("members")}
            className="text-xs font-bold gap-1.5 h-8 rounded-lg"
          >
            <UserPlus className="w-3.5 h-3.5" /> Member Accounts ({users.length})
          </Button>
        </div>
      </div>

      {activeTab === "members" ? (
        <MemberUsersList
          users={users}
          subscriptions={subscriptions}
          onDeleteUser={(id) => setUsers((prev) => prev.filter((u) => u.id !== id))}
          onOpenAddModal={() => setAddMemberModalOpen(true)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">
              Daftar target WhatsApp yang berhak menggunakan bot & automonitoring.
            </p>
            <Button onClick={openCreateDialog} className="font-semibold shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Subscriber
            </Button>
          </div>

      {/* Grid of Subscriptions */}
      {subscriptions.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center">
          <CardContent className="flex flex-col items-center justify-center gap-2 p-0">
            <CreditCard className="w-12 h-12 text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground mt-2">
              No Subscriptions Configured
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The bot currently runs in <strong>Default Open Mode</strong>. Add
              your first subscriber to enforce subscription access control.
            </p>
            <Button onClick={openCreateDialog} className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Add First Subscriber
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((sub) => {
            const isExpired = new Date(sub.expiredAt).getTime() < now.getTime();
            return (
              <Card
                key={sub.id}
                className={`border transition-all ${
                  !sub.isActive
                    ? "opacity-60 bg-muted/40 border-border"
                    : isExpired
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border hover:border-primary/40"
                }`}
              >
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {sub.name}
                      </CardTitle>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {sub.targetId}
                        {sub.phoneNumber && (
                          <span className="text-primary block text-[11px] font-sans">
                            Alt: {sub.phoneNumber}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        !sub.isActive
                          ? "secondary"
                          : isExpired
                            ? "destructive"
                            : "default"
                      }
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {!sub.isActive
                        ? "Suspended"
                        : isExpired
                          ? "Expired"
                          : sub.plan}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-sm">
                  {/* Status & Expiry */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Expires On:
                      </span>
                      <span className="font-semibold text-foreground">
                        {format(new Date(sub.expiredAt), "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Status:</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          !sub.isActive
                            ? "text-muted-foreground"
                            : isExpired
                              ? "text-destructive"
                              : "text-emerald-600"
                        }`}
                      >
                        {!sub.isActive ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> Suspended
                          </>
                        ) : isExpired ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> Expired (
                            {formatDistanceToNow(new Date(sub.expiredAt), {
                              addSuffix: true,
                            })}
                            )
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active (
                            {formatDistanceToNow(new Date(sub.expiredAt), {
                              addSuffix: true,
                            })}
                            )
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Quota Progress */}
                  <div className="bg-muted/50 p-2.5 rounded-lg border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5" /> Container Quota:
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {sub.activeContainersCount} /{" "}
                        {sub.maxContainers === 0
                          ? "Unlimited"
                          : sub.maxContainers}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Controls */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-medium"
                        onClick={() => handleQuickExtend(sub, 1)}
                        title="Extend 1 Month"
                      >
                        +1 Mo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-medium"
                        onClick={() => handleQuickExtend(sub, 12)}
                        title="Extend 1 Year"
                      >
                        +1 Yr
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 ${
                          sub.isActive
                            ? "text-emerald-600 hover:text-emerald-700"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => handleToggleActive(sub)}
                        title={
                          sub.isActive ? "Suspend Client" : "Activate Client"
                        }
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(sub)}
                        title="Edit Subscription"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={() => handleDeleteDialogOpen(sub.id)}
                        title="Delete Subscription"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </>
    )}

      <AddMemberModal
        open={addMemberModalOpen}
        onOpenChange={setAddMemberModalOpen}
        existingSubscriptions={subscriptions}
        onUserCreated={(newUser) => {
          setUsers((prev) => [newUser, ...prev]);
          if (newUser.subscription) {
            const sub = newUser.subscription;
            setSubscriptions((prev) => {
              if (prev.some((s) => s.id === sub.id)) return prev;
              return [
                {
                  ...sub,
                  activeContainersCount: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                ...prev,
              ];
            });
          }
        }}
      />

      <DialogDelete
        open={dialogDeleteOpen}
        id={deleteTargetId}
        handleDelete={handleDelete}
        handleClose={() => setDialogDeleteOpen(false)}
      />

      {/* Add / Edit Subscription Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSub ? "Edit Subscription" : "Add New Subscriber"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="targetId" className="text-xs font-semibold">
                Target WhatsApp ID (Number or Group ID)
              </Label>
              <Input
                id="targetId"
                placeholder="e.g. 628123456789@c.us or 1203630123@g.us"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Personal numbers end with <code>@c.us</code>, LID numbers end with <code>@lid</code>, Groups end with <code>@g.us</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber" className="text-xs font-semibold">
                Alternate Phone / WA Number (Optional)
              </Label>
              <Input
                id="phoneNumber"
                placeholder="e.g. 6281210860242 or 081210860242"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Optional alternate phone number linked for Web UI & WhatsApp Bot dual-identity matching.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Client / Subscriber Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. PT Logistics Indonesia / Group CS Import"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plan" className="text-xs font-semibold">
                  Subscription Plan
                </Label>
                <select
                  id="plan"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={plan}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setPlan(selected);
                    if (selected === "STARTER") setMaxContainers(10);
                    else if (selected === "BUSINESS") setMaxContainers(25);
                    else if (
                      selected === "ENTERPRISE" ||
                      selected === "UNLIMITED"
                    )
                      setMaxContainers(0);
                  }}
                >
                  <option value="STARTER">STARTER (10 Containers)</option>
                  <option value="BUSINESS">BUSINESS (25 Containers)</option>
                  <option value="ENTERPRISE">ENTERPRISE (Unlimited)</option>
                  <option value="UNLIMITED">CUSTOM UNLIMITED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="maxContainers"
                  className="text-xs font-semibold"
                >
                  Max Active Containers
                </Label>
                <Input
                  id="maxContainers"
                  type="number"
                  min="0"
                  placeholder="0 = Unlimited"
                  value={maxContainers}
                  onChange={(e) => setMaxContainers(Number(e.target.value))}
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Set <code>0</code> for unlimited container tracking.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiredAt" className="text-xs font-semibold">
                Expiration Date
              </Label>
              <Input
                id="expiredAt"
                type="date"
                value={expiredAt}
                onChange={(e) => setExpiredAt(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingSub
                    ? "Update Subscription"
                    : "Create Subscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
