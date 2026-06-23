"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProgress } from "@bprogress/next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TrackerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const progress = useProgress();
  const [isPending, startTransition] = useTransition();

  // Get initial values from URL
  const initialCarrier = searchParams.get("carrier") || "ONE";
  const initialSearchType = searchParams.get("search_type") || "BKG_NO";
  const initialSearchText = searchParams.get("search_text") || "";

  const [carrier, setCarrier] = useState(initialCarrier);
  const [searchType, setSearchType] = useState(initialSearchType);
  const [searchText, setSearchText] = useState(initialSearchText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    progress.start();
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("carrier", carrier);
      params.set("search_type", searchType);
      params.set("search_text", searchText.trim());
      
      router.push(`/tracker?${params.toString()}`);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Carrier Select */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="carrier" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Shipping Line (Pelayaran)
          </Label>
          <Select value={carrier} onValueChange={setCarrier}>
            <SelectTrigger 
              id="carrier" 
              className="w-full h-10! rounded-xl bg-background border border-border px-3 text-sm font-semibold justify-between cursor-pointer"
            >
              <SelectValue placeholder="Select Shipping Line">
                {carrier === "ONE" && "Ocean Network Express (ONE)"}
                {carrier === "EMC" && "Evergreen Marine (EMC)"}
                {carrier === "MAERSK" && "Maersk Line (Coming Soon)"}
                {carrier === "MSC" && "MSC (Coming Soon)"}
                {carrier === "CMA" && "CMA CGM (Coming Soon)"}
                {carrier === "HAPAG" && "Hapag-Lloyd (Coming Soon)"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl border border-border bg-popover text-popover-foreground">
              <SelectItem value="ONE" className="cursor-pointer">Ocean Network Express (ONE)</SelectItem>
              <SelectItem value="EMC" className="cursor-pointer">Evergreen Marine (EMC)</SelectItem>
              <SelectItem value="MAERSK" disabled className="text-muted-foreground/45 cursor-not-allowed">Maersk Line (Coming Soon)</SelectItem>
              <SelectItem value="MSC" disabled className="text-muted-foreground/45 cursor-not-allowed">MSC (Coming Soon)</SelectItem>
              <SelectItem value="CMA" disabled className="text-muted-foreground/45 cursor-not-allowed">CMA CGM (Coming Soon)</SelectItem>
              <SelectItem value="HAPAG" disabled className="text-muted-foreground/45 cursor-not-allowed">Hapag-Lloyd (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Type Select */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Search Type (Jenis Query)
          </Label>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger 
              id="search-type" 
              className="w-full h-10! rounded-xl bg-background border border-border px-3 text-sm font-semibold justify-between cursor-pointer"
            >
              <SelectValue placeholder="Select Search Type">
                {searchType === "BKG_NO" && "Booking Number (BKG_NO)"}
                {searchType === "CNTR_NO" && "Container Number (CNTR_NO)"}
                {searchType === "BL_NO" && "Bill of Lading (BL_NO)"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl border border-border bg-popover text-popover-foreground">
              <SelectItem value="BKG_NO" className="cursor-pointer">Booking Number (BKG_NO)</SelectItem>
              <SelectItem value="CNTR_NO" className="cursor-pointer">Container Number (CNTR_NO)</SelectItem>
              <SelectItem value="BL_NO" className="cursor-pointer">Bill of Lading (BL_NO)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Query Input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-text" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Reference Number (Nomor Ref)
          </Label>
          <div className="flex gap-2">
            <Input
              id="search-text"
              type="text"
              placeholder="e.g. BKKEFN240500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="rounded-xl flex-1 font-semibold placeholder:font-normal h-10 bg-background border border-border"
            />
            <Button
              type="submit"
              disabled={isPending || !searchText.trim()}
              className="rounded-xl px-4 flex items-center gap-2 h-10 shrink-0 font-bold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Track</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
