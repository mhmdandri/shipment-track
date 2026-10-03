"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Ship, Loader2, Search, Check, ChevronDown } from "lucide-react";
import { getNpct1VesselOptionsAction } from "@/actions/vessel-action";
import { Button } from "@/components/ui/button";

export interface Npct1VesselOption {
  code: string;
  name: string;
}

interface Npct1VesselSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function Npct1VesselSelect({
  value,
  onChange,
  disabled = false,
}: Npct1VesselSelectProps) {
  const [vessels, setVessels] = useState<Npct1VesselOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadVessels() {
      setLoading(true);
      const res = await getNpct1VesselOptionsAction();
      if (isMounted && res.success && res.data) {
        setVessels(res.data);
      }
      if (isMounted) setLoading(false);
    }
    loadVessels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredVessels = useMemo(() => {
    if (!searchQuery.trim()) return vessels.slice(0, 100);
    const q = searchQuery.trim().toLowerCase();
    return vessels
      .filter(
        (v) =>
          v.code.toLowerCase().includes(q) || v.name.toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [vessels, searchQuery]);

  const selectedVessel = useMemo(() => {
    if (!value) return null;
    return vessels.find((v) => v.code.toUpperCase() === value.toUpperCase());
  }, [vessels, value]);

  return (
    <div className="flex flex-col gap-1 w-full relative" ref={dropdownRef}>
      <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
        <Ship className="w-3.5 h-3.5 text-primary" />
        <span>Nama Kapal</span>
      </label>

      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="w-full justify-between h-9 text-xs font-medium bg-background border-input hover:bg-accent/50 px-3 cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat Kapal NPCT1...
          </span>
        ) : selectedVessel ? (
          <span className="truncate font-semibold text-foreground">
            {selectedVessel.name}
          </span>
        ) : value ? (
          <span className="font-semibold text-foreground font-mono">{value}</span>
        ) : (
          <span className="text-muted-foreground">Pilih / Cari Kapal NPCT1...</span>
        )}
        <ChevronDown className="w-4 h-4 shrink-0 opacity-50 ml-1.5" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 p-2 bg-popover border border-border shadow-lg rounded-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2 border-b border-border pb-2 mb-2 px-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cari nama kapal / kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs outline-hidden font-medium placeholder:text-muted-foreground"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredVessels.length === 0 ? (
              <div className="py-2 px-1 space-y-2">
                <div className="text-center text-xs text-muted-foreground">
                  Kapal &quot;{searchQuery}&quot; tidak ada di daftar sandar.
                </div>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchQuery.trim().toUpperCase());
                      setOpen(false);
                    }}
                    className="w-full text-center py-1.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-md cursor-pointer transition-colors"
                  >
                    Gunakan kode &quot;{searchQuery.trim().toUpperCase()}&quot;
                  </button>
                )}
              </div>
            ) : (
              filteredVessels.map((v) => {
                const isSelected = value.toUpperCase() === v.code.toUpperCase();
                return (
                  <button
                    key={`${v.code}-${v.name}`}
                    type="button"
                    onClick={() => {
                      onChange(v.code);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-muted font-medium text-foreground"
                    }`}
                  >
                    <span className="truncate pr-2">{v.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
