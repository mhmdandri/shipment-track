import { notFound } from "next/navigation";
import { ShipmentInfoCard } from "@/features/shipments/ShipmentInfoCard";

import { ProgressCard } from "@/features/shipments/ProgressCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { WorkflowChecklist } from "@/features/shipments/WorkFlowChecklist";
import { ActivityLogsCard } from "@/features/shipments/ActivityLogsCard";

export const revalidate = 0;
const repo = new ShipmentRepository(prisma);

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShipmentDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const shipment = await repo.findById(resolvedParams.id);

  if (!shipment) {
    notFound();
  }

  return (
    <div className="space-y-6 p-8 min-h-screen bg-slate-50/30">
      <div className="flex items-center gap-3">
        <Link
          href="/shipments"
          className="p-2 border rounded-xl bg-white hover:bg-slate-50 shadow-sm transition-all text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            File Inspection: {shipment.jobNo}
          </h1>
          <p className="text-xs font-mono text-slate-400">
            System Database Primary Key Ref: {shipment.id}
          </p>
        </div>
      </div>

      <ShipmentInfoCard shipment={shipment} />
      <ProgressCard shipment={shipment} />

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <WorkflowChecklist shipment={shipment} />
        </div>
        <div className="lg:col-span-1">
          <ActivityLogsCard logs={shipment.activityLogs} />
        </div>
      </div>
    </div>
  );
}
