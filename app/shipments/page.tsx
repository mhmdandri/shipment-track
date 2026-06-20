import { ShipmentTable } from "@/features/shipments/ShipmentTable";
import LinkNext from "next/link";
import { Plus, Search } from "lucide-react";
import { ShipmentStatus } from "../generated/prisma/enums";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import prisma from "@/lib/prisma";

export const revalidate = 0;

const repo = new ShipmentRepository(prisma);

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sortByEta?: string;
    page?: string;
  }>;
}

export default async function ShipmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const status = (params.status as ShipmentStatus) || undefined;
  const sortByEta = (params.sortByEta as "asc" | "desc") || "asc";
  const page = parseInt(params.page || "1", 10);
  const take = 20;
  const skip = (page - 1) * take;

  const { items, total } = await repo.findAll({
    search,
    status,
    sortByEta,
    skip,
    take,
  });

  return (
    <div className="space-y-6 p-8 min-h-screen bg-slate-50/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Shipments File Ledger
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Query, filter, and inspect operational job numbers.
          </p>
        </div>
        <LinkNext
          href="/shipments/create"
          className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" /> Initialize Shipment
        </LinkNext>
      </div>

      <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <form
          method="GET"
          action="/shipments"
          className="w-full flex-1 flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by Job Number, BL, Consignee or Shipper..."
            className="bg-transparent border-none text-sm w-full focus:outline-none text-slate-800 font-medium"
          />
        </form>
      </div>

      <ShipmentTable
        data={items}
        search={search}
        status={status || ""}
        sortByEta={sortByEta}
      />
    </div>
  );
}
