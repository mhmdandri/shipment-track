import { Suspense } from "react";
import { Ship, AlertCircle } from "lucide-react";
import { trackShipmentAction } from "@/actions/track-action";
import { TrackerForm } from "@/features/tracker/TrackerForm";
import { TrackerResults } from "@/features/tracker/TrackerResults";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    carrier?: string;
    search_type?: string;
    search_text?: string;
  }>;
}

export default async function TrackerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const carrier = params.carrier || "ONE";
  const searchType = params.search_type || "BKG_NO";
  const searchText = params.search_text || "";

  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8 min-h-screen bg-background">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Shipping Line Live Tracker
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Query live shipping carrier databases for container events and route updates.
        </p>
      </div>

      <TrackerForm />

      <Suspense fallback={<TrackerSkeleton />}>
        {searchText ? (
          <TrackerDataFetch
            carrier={carrier}
            searchType={searchType}
            searchText={searchText}
          />
        ) : (
          <TrackerEmptyState />
        )}
      </Suspense>
    </div>
  );
}

async function TrackerDataFetch({
  carrier,
  searchType,
  searchText,
}: {
  carrier: string;
  searchType: string;
  searchText: string;
}) {
  const result = await trackShipmentAction(carrier, searchType, searchText);

  if (!result.success) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive rounded-2xl p-6 flex gap-3 items-start animate-fade-in">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-black text-sm uppercase tracking-wide">Tracking Query Failed</h4>
          <p className="text-sm font-medium mt-1">
            {result.error || "Failed to retrieve tracking details."}
          </p>
        </div>
      </div>
    );
  }

  return <TrackerResults result={result} />;
}

function TrackerEmptyState() {
  return (
    <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm space-y-6 mt-6 relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      <div className="relative z-10 space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary animate-pulse">
          <Ship className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-foreground">No Search Reference Entered</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto font-medium leading-relaxed">
            Enter a carrier Booking Number, Bill of Lading, or Container Number above to query live carrier information.
          </p>
        </div>
      </div>
    </div>
  );
}

function TrackerSkeleton() {
  return (
    <div className="space-y-8 animate-pulse mt-6">
      {/* Header card skeleton */}
      <div className="bg-card border border-border rounded-2xl p-6 h-36 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded-md w-32" />
          <div className="h-8 bg-muted rounded-md w-64" />
        </div>
        <div className="h-4 bg-muted rounded-md w-full" />
      </div>
      
      {/* Containers skeleton */}
      <div className="space-y-6">
        <div className="h-6 bg-muted rounded-md w-48" />
        <div className="bg-card border border-border rounded-2xl p-6 h-48 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded-md w-40" />
              <div className="h-4 bg-muted rounded-md w-28" />
            </div>
            <div className="h-10 bg-muted rounded-md w-32" />
          </div>
          <div className="h-4 bg-muted rounded-md w-full" />
        </div>
      </div>
    </div>
  );
}
