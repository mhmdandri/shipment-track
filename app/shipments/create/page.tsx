// src/app/shipments/create/page.tsx
import { ShipmentForm } from "@/features/shipments/ShipmentForm";

export default function CreateShipmentPage() {
  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8 min-h-screen bg-background">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Provision New Forwarding File
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Entering target logistics details auto-generates tracking tasks and
          SLA windows.
        </p>
      </div>
      <ShipmentForm />
    </div>
  );
}
