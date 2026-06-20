import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/lib";
import { Ship, Clock, AlertTriangle, Calendar } from "lucide-react";

export function DashboardCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      title: "Active Shipments",
      value: stats.totalActive,
      icon: Ship,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Need Action Today",
      value: stats.needActionToday,
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Overdue Reminders",
      value: stats.overdueReminders,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      title: "ETA This Week",
      value: stats.etaThisWeek,
      icon: Calendar,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <Card key={i} className="shadow-sm border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {c.title}
            </CardTitle>
            <div className={`p-2 rounded-lg border ${c.color}`}>
              <c.icon className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {c.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
