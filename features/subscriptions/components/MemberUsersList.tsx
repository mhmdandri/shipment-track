"use client";

import { UserWithSubscription, deleteUserAction } from "@/actions/user-action";
import { SubscriptionWithCount } from "@/actions/subscription-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trash2, MessageSquare, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  users: UserWithSubscription[];
  subscriptions: SubscriptionWithCount[];
  onDeleteUser: (id: string) => void;
  onOpenAddModal: () => void;
}

export default function MemberUsersList({
  users,
  onDeleteUser,
  onOpenAddModal,
}: Props) {
  const handleDelete = async (user: UserWithSubscription) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun user "${user.name}" (@${user.username})?`)) {
      const res = await deleteUserAction(user.id);
      if (res.success) {
        onDeleteUser(user.id);
      } else {
        alert(res.error || "Gagal menghapus user.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Daftar Akun Member & CS
          </h3>
          <p className="text-xs text-muted-foreground">
            Akun member secara otomatis menggunakan target notifikasi WhatsApp yang ditautkan oleh Admin.
          </p>
        </div>
        <Button onClick={onOpenAddModal} size="sm" className="font-bold shadow-sm">
          + Tambah Akun Member
        </Button>
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed border-2 p-8 text-center">
          <CardContent className="flex flex-col items-center justify-center gap-2 p-0">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <h4 className="font-bold text-foreground">Belum Ada Akun Member</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Buat akun member baru sekaligus atur/kaitkan paket WhatsApp Subscription agar member dapat langsung mentracking tanpa memilih target WA.
            </p>
            <Button onClick={onOpenAddModal} size="sm" className="mt-2 font-bold">
              Buat Akun Member Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const hasSub = Boolean(u.subscription);
            const sub = u.subscription;
            return (
              <Card key={u.id} className="border border-border hover:border-primary/40 transition-all shadow-sm">
                <CardHeader className="pb-3 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        {u.name}
                      </CardTitle>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        @{u.username}
                      </p>
                    </div>
                    <Badge
                      variant={u.role === "ADMIN" ? "default" : u.role === "MEMBER" ? "secondary" : "outline"}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {u.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  {/* Linked Subscription Info */}
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Auto WA Subscription:
                      </span>
                      {hasSub && sub ? (
                        <Badge variant="outline" className="text-[10px] bg-background font-mono">
                          {sub.plan}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Belum Ditautkan
                        </Badge>
                      )}
                    </div>

                    {hasSub && sub ? (
                      <div className="space-y-1 text-[11px]">
                        <p className="font-bold text-foreground">{sub.name}</p>
                        <p className="font-mono text-muted-foreground truncate">{sub.targetId}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Expiry: {format(new Date(sub.expiredAt), "dd MMM yyyy")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        Akun ini belum memiliki tautan WhatsApp subscription.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>Dibuat: {format(new Date(u.createdAt), "dd/MM/yyyy")}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive"
                      onClick={() => handleDelete(u)}
                      title="Hapus Akun Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
