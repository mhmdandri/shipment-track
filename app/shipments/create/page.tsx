// src/app/shipments/create/page.tsx
import { ShipmentForm } from "@/features/shipments/ShipmentForm";

export default function CreateShipmentPage() {
  return (
    <div className="space-y-6 p-8 min-h-screen bg-slate-50/30">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Provision New Forwarding File
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Entering target logistics details auto-generates tracking tasks and
          SLA windows.
        </p>
      </div>
      <ShipmentForm />
    </div>
  );
}
