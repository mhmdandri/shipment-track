import { ShipmentTable } from "@/features/shipments/ShipmentTable";
import LinkNext from "next/link";
import { Plus, Search } from "lucide-react";
import { ShipmentStatus } from "../generated/prisma/enums";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Shipments File Ledger
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Query, filter, and inspect operational job numbers.
          </p>
        </div>
        <Button asChild>
          <LinkNext href="/shipments/create">
            <Plus /> Initialize Shipment
          </LinkNext>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <form
          method="GET"
          action="/shipments"
          className="w-full flex-1 flex items-center gap-3 bg-muted px-3 py-1.5 rounded-xl border border-border"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by Job Number, BL, Consignee or Shipper..."
            className="bg-transparent border-none text-sm w-full focus:outline-none text-foreground font-medium placeholder:text-muted-foreground"
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
