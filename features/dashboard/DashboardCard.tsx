import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/lib";
import { Ship, Clock, AlertTriangle, Calendar } from "lucide-react";

export function DashboardCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      title: "Active Shipments",
      value: stats.totalActive,
      icon: Ship,
      iconClass: "text-blue-600",
      bgClass: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900",
    },
    {
      title: "Need Action Today",
      value: stats.needActionToday,
      icon: Clock,
      iconClass: "text-amber-600",
      bgClass: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900",
    },
    {
      title: "Overdue Reminders",
      value: stats.overdueReminders,
      icon: AlertTriangle,
      iconClass: "text-destructive",
      bgClass: "bg-destructive/10 border-destructive/20",
    },
    {
      title: "ETA This Week",
      value: stats.etaThisWeek,
      icon: Calendar,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <Card key={i} className="shadow-sm border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {c.title}
            </CardTitle>
            <div className={`p-2 rounded-lg border ${c.bgClass}`}>
              <c.icon className={`w-4 h-4 ${c.iconClass}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {c.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
