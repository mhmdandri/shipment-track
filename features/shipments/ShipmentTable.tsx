import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowUpDown } from "lucide-react";
import { Shipment } from "@/app/generated/prisma/client";

interface ShipmentTableProps {
  data: Shipment[];
  search: string;
  status: string;
  sortByEta: string;
}

export function ShipmentTable({
  data,
  search,
  status,
  sortByEta,
}: ShipmentTableProps) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
              <th className="p-3 lg:p-4">Job No / BL No</th>
              <th className="p-3 lg:p-4 hidden md:table-cell">Consignee & Shipper</th>
              <th className="p-3 lg:p-4">
                <Link
                  href={`/shipments?search=${search}&status=${status}&sortByEta=${sortByEta === "asc" ? "desc" : "asc"}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  ETA <ArrowUpDown className="w-3.5 h-3.5" />
                </Link>
              </th>
              <th className="p-3 lg:p-4 hidden lg:table-cell">Workflow Stage</th>
              <th className="p-3 lg:p-4 hidden lg:table-cell">Next Milestone</th>
              <th className="p-3 lg:p-4 hidden sm:table-cell">Status</th>
              <th className="p-3 lg:p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm text-foreground font-medium">
            {data.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="p-3 lg:p-4">
                  <span className="text-foreground font-bold block">
                    {item.jobNo}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.blNo}
                    </span>
                    {item.blNo && item.blNo.trim() !== "" && (
                      <Link
                        href={`/tracker?carrier=ONE&search_type=BL_NO&search_text=${encodeURIComponent(
                          item.blNo.trim()
                        )}`}
                        className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-primary hover:underline hover:text-primary/80 transition-colors"
                        title="Live track this shipment on ONE Line"
                      >
                        Live Track 🚢
                      </Link>
                    )}
                  </div>
                  {/* Show consignee on mobile below job no */}
                  <span className="md:hidden text-xs text-muted-foreground block mt-1 truncate max-w-37.5">
                    {item.consignee}
                  </span>
                </td>
                <td className="p-3 lg:p-4 hidden md:table-cell">
                  <span className="text-foreground block truncate max-w-48">
                    {item.consignee}
                  </span>
                  <span className="text-xs text-muted-foreground block truncate max-w-48 mt-0.5">
                    from {item.shipper}
                  </span>
                </td>
                <td className="p-3 lg:p-4 font-semibold text-foreground whitespace-nowrap">
                  {format(new Date(item.eta), "dd MMM yyyy")}
                </td>
                <td className="p-3 lg:p-4 hidden lg:table-cell">
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground border-border text-xs px-2.5 py-1"
                  >
                    {item.currentStep}
                  </Badge>
                </td>
                <td className="p-3 lg:p-4 hidden lg:table-cell text-muted-foreground font-semibold text-xs">
                  {item.nextAction}
                </td>
                <td className="p-3 lg:p-4 hidden sm:table-cell">
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${item.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : item.status === "COMPLETED"
                        ? "bg-muted text-muted-foreground border-border"
                        : "bg-secondary text-secondary-foreground border-border"
                      }`}
                  >
                    {item.status}
                  </Badge>
                </td>
                <td className="p-3 lg:p-4 text-right">
                  <Button variant="ghost" size="xs" asChild>
                    <Link href={`/shipments/${item.id}`}>
                      Inspect <ArrowUpRight />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
