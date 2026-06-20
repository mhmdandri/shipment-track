import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowUpDown } from "lucide-react";

interface ShipmentTableProps {
  data: any[];
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <th className="p-4">Job No / BL No</th>
              <th className="p-4">Consignee & Shipper</th>
              <th className="p-4">
                <Link
                  href={`/shipments?search=${search}&status=${status}&sortByEta=${sortByEta === "asc" ? "desc" : "asc"}`}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  ETA Schedule <ArrowUpDown className="w-3.5 h-3.5" />
                </Link>
              </th>
              <th className="p-4">Current Workflow Stage</th>
              <th className="p-4">Next Required Milestone</th>
              <th className="p-4">Operational Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
            {data.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="p-4">
                  <span className="text-slate-900 font-bold block">
                    {item.jobNo}
                  </span>
                  <span className="text-xs text-slate-400 block font-mono mt-0.5">
                    {item.blNo}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-slate-900 block truncate max-w-50">
                    {item.consignee}
                  </span>
                  <span className="text-xs text-slate-400 block truncate max-w-50 mt-0.5">
                    from {item.shipper}
                  </span>
                </td>
                <td className="p-4 font-semibold text-slate-900">
                  {format(new Date(item.eta), "dd MMM yyyy")}
                </td>
                <td className="p-4">
                  <Badge
                    variant="secondary"
                    className="bg-cyan-50 text-cyan-800 border-cyan-100 text-xs px-2.5 py-1"
                  >
                    {item.currentStep}
                  </Badge>
                </td>
                <td className="p-4 text-amber-700 font-semibold text-xs">
                  {item.nextAction}
                </td>
                <td className="p-4">
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${item.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                  >
                    {item.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/shipments/${item.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 font-bold hover:underline transition-all"
                  >
                    Inspect File <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
