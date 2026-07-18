"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "@bprogress/next";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ShipmentSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  if (defaultValue !== prevDefaultValue) {
    setValue(defaultValue);
    setPrevDefaultValue(defaultValue);
  }

  useEffect(() => {
    // Avoid running effect on initial mount if defaultValue matches value
    if (value === defaultValue) return;

    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      // Reset back to page 1 on new search
      params.delete("page");

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 400); // 400ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [value, defaultValue, pathname, searchParams, router]);

  return (
    <div className="w-full flex-1 flex items-center gap-3 bg-muted px-3 py-1.5 rounded-xl border border-border">
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : (
        <Search className="w-4 h-4 text-muted-foreground" />
      )}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by Job Number, BL, Consignee or Shipper..."
        className="bg-transparent border-none text-sm w-full focus-visible:ring-0 px-0 h-auto font-medium text-foreground placeholder:text-muted-foreground shadow-none"
      />
    </div>
  );
}
