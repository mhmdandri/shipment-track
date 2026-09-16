"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Ship, Loader2, Search, Check, ChevronDown } from "lucide-react";
import { getNpct1VesselOptionsAction } from "@/actions/vessel-action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [manualMode, setManualMode] = useState(false);
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  if (manualMode) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground font-semibold uppercase">
            Kode Kapal NPCT1 (Manual)
          </label>
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
          >
            Pilih dari Daftar ({vessels.length})
          </button>
        </div>
        <Input
          placeholder="Kode Kapal (misal: EVBIT / AXPER)"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="font-mono uppercase bg-primary/5 border-primary/20 text-xs h-9"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full relative" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
          <Ship className="w-3 h-3 text-primary" /> Kapal NPCT1
          {vessels.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1 py-0 h-4 font-mono"
            >
              {vessels.length} Kapal
            </Badge>
          )}
        </label>
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-[10px] text-muted-foreground hover:text-primary underline font-medium cursor-pointer"
        >
          Input Manual
        </button>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="w-full justify-between h-9 text-xs font-mono font-semibold bg-primary/5 border-primary/20 px-3 cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground font-normal">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat Kapal
            NPCT1...
          </span>
        ) : selectedVessel ? (
          <span className="truncate font-bold text-foreground">
            {selectedVessel.name}
          </span>
        ) : value ? (
          <span className="font-bold text-foreground">{value}</span>
        ) : (
          <span className="text-muted-foreground font-normal">
            Pilih Kapal Sandar NPCT1...
          </span>
        )}
        <ChevronDown className="w-4 h-4 shrink-0 opacity-50 ml-1" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 p-2 bg-popover border border-border shadow-xl rounded-xl animate-in fade-in duration-150">
          <div className="flex items-center gap-2 border-b border-border pb-2 mb-2 px-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cari kapal / kode (misal: AXPER / PEARL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs outline-hidden font-medium placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div className="max-h-55 overflow-y-auto space-y-0.5">
            {filteredVessels.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Kapal &quot;{searchQuery}&quot; tidak ditemukan.
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
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
