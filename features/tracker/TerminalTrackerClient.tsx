"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Map,
  Info,
  BellRing,
  CheckCircle2,
} from "lucide-react";
import {
  trackTerminalContainer,
  TerminalTrackingResult,
} from "@/actions/terminal-track-action";
import { enableTerminalMonitoring } from "@/actions/monitor-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TERMINALS = [
  { id: "jict", name: "JICT (Jakarta International Container Terminal)" },
  { id: "npct1", name: "NPCT1 (New Priok Container Terminal 1)" },
  { id: "koja", name: "KOJA (TPK Koja)" },
  { id: "tmal", name: "TMAL (Terminal Mustika Alam Lestari)" },
  { id: "ter3", name: "TER3 (Terminal 3)" },
];

export default function TerminalTrackerPage() {
  const [port, setPort] = useState<string>("jict");
  const [containerNo, setContainerNo] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [voyageNo, setVoyageNo] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorMessage, setMonitorMessage] = useState("");
  const [result, setResult] = useState<TerminalTrackingResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNo.trim()) return;

    setLoading(true);
    setResult(null);
    setMonitorMessage("");

    if (port === "npct1") {
      if (!vesselName.trim() || !voyageNo.trim()) {
        setResult({
          success: false,
          port,
          containerNo: containerNo.trim(),
          error: "Vessel Code and Voyage No are required for NPCT1.",
        });
        setLoading(false);
        return;
      }
    }

    const data = await trackTerminalContainer(
      port,
      containerNo.trim(),
      vesselName.trim() || undefined,
      voyageNo.trim() || undefined,
    );
    setResult(data);
    setLoading(false);
  };

  const handleMonitor = async () => {
    if (!result || !result.containerNo || !result.status) return;

    // Auto-format WhatsApp number (remove non-digits and replace leading 0 with 62)
    let formattedWa = waNumber.trim().replace(/\D/g, "");
    if (formattedWa.startsWith("0")) {
      formattedWa = "62" + formattedWa.substring(1);
    }

    setMonitorLoading(true);
    const res = await enableTerminalMonitoring(
      result.containerNo,
      result.port,
      result.status,
      formattedWa || undefined,
      vesselName.trim() || undefined,
      voyageNo.trim() || undefined,
    );
    if (res.success) {
      setMonitorMessage(res.message || "Monitoring enabled.");
    } else {
      setMonitorMessage(res.error || "Failed to monitor.");
    }
    setMonitorLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border pb-4">
          <CardTitle className="text-lg">Track Location</CardTitle>
          <CardDescription>
            Select the terminal and enter your container number to track.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="w-full md:w-1/3">
                <Select value={port} onValueChange={setPort}>
                  <SelectTrigger className="w-full font-semibold">
                    <SelectValue placeholder="Select Terminal" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMINALS.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={t.id}
                        className="font-medium"
                      >
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  placeholder="Enter Container Number (e.g. ONEU7648347)"
                  value={containerNo}
                  onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
                  className="pl-9 font-mono uppercase font-bold text-foreground"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !containerNo.trim()}
                className="w-full md:w-auto font-bold px-8"
              >
                {loading ? "Searching..." : "Track"}
              </Button>
            </div>

            {port === "npct1" && (
              <div className="flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="w-full md:w-1/2">
                  <Input
                    placeholder="Vessel Code (e.g. EVBIT)"
                    value={vesselName}
                    onChange={(e) =>
                      setVesselName(e.target.value.toUpperCase())
                    }
                    className="font-mono uppercase bg-primary/5 border-primary/20"
                    disabled={loading}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 ml-1 font-medium uppercase tracking-wider">
                    NPCT1 Requires Vessel Code
                  </p>
                </div>
                <div className="w-full md:w-1/2">
                  <Input
                    placeholder="Voyage No (e.g. 080B)"
                    value={voyageNo}
                    onChange={(e) => setVoyageNo(e.target.value.toUpperCase())}
                    className="font-mono uppercase bg-primary/5 border-primary/20"
                    disabled={loading}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 ml-1 font-medium uppercase tracking-wider">
                    NPCT1 Requires Voyage Number
                  </p>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="overflow-hidden border-border shadow-sm">
            <div className="bg-muted/40 p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-bold tracking-tight text-foreground">
                  Tracking Result
                </h3>
              </div>
              <Badge variant="outline" className="font-mono bg-background">
                {result.containerNo}
              </Badge>
            </div>

            <div className="p-6">
              {!result.success ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Info className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground">
                      Tracking Failed
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {result.error}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-xl bg-card gap-4">
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" />
                      Terminal Allocation
                    </p>
                    <p className="font-black text-lg text-foreground uppercase tracking-tight">
                      {TERMINALS.find((t) => t.id === result.port)?.name ||
                        result.port}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="space-y-1 text-right">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Status
                      </p>
                      <Badge
                        variant={
                          result.status === "GNSTK" ? "default" : "secondary"
                        }
                        className="font-black tracking-widest text-xs px-3 py-1"
                      >
                        {result.status === "GNSTK"
                          ? "TERSEDIA (GNSTK)"
                          : `BELUM TERSEDIA (${result.status})`}
                      </Badge>
                    </div>

                    {result.status === "GNSTK" && result.time && (
                      <div className="space-y-1 text-right border-l border-border pl-4">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                          Time
                        </p>
                        <p className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded border border-border text-foreground">
                          {result.time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monitoring Box */}
              {result && result.success && result.status !== "GNSTK" && (
                <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                      <BellRing className="w-4 h-4" />
                      Auto-Monitor Container
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      We will check this container every 30 minutes and notify
                      you via Telegram when it gets a yard allocation (GNSTK).
                    </p>
                  </div>
                  <div>
                    {monitorMessage ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        {monitorMessage}
                      </div>
                    ) : result.isMonitored ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        Already Monitored
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          placeholder="WhatsApp Number (e.g. 62812...)"
                          value={waNumber}
                          onChange={(e) => setWaNumber(e.target.value)}
                          className="w-full sm:w-64 bg-background border-primary/20 focus-visible:ring-primary/30"
                          disabled={monitorLoading}
                        />
                        <Button
                          onClick={handleMonitor}
                          disabled={monitorLoading}
                          variant="default"
                          className="w-full sm:w-auto font-bold shadow-sm shadow-primary/20"
                        >
                          {monitorLoading ? "Enabling..." : "Enable Monitoring"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
