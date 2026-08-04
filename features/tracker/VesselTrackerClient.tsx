"use client";

import { useState } from "react";
import {
  Ship,
  Search,
  Calendar,
  Clock,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Anchor,
  FileCheck,
  PackageCheck,
} from "lucide-react";
import {
  searchVesselScheduleAction,
  enableVesselMonitoringAction,
} from "@/actions/vessel-action";
import {
  isVesselSailingOrCompleted,
  type VesselTrackingResult,
  type VesselScheduleItem,
} from "@/actions/tracking/vessel";
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

export const VESSEL_TERMINALS = [
  { id: "jict", name: "JICT (Jakarta International Container Terminal)" },
  { id: "npct1", name: "NPCT1 (New Priok Container Terminal 1)" },
  { id: "koja", name: "KOJA (TPK Koja)" },
  { id: "tmal", name: "TMAL (Terminal Mustika Alam Lestari)" },
  { id: "ter3", name: "TER3 (Terminal 3)" },
];

interface VesselTrackerClientProps {
  onMonitorChanged?: () => void;
}

export default function VesselTrackerClient({ onMonitorChanged }: VesselTrackerClientProps) {
  const [port, setPort] = useState<string>("jict");
  const [vesselName, setVesselName] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorMessage, setMonitorMessage] = useState("");
  const [monitorError, setMonitorError] = useState("");
  const [result, setResult] = useState<VesselTrackingResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vesselName.trim()) return;

    setLoading(true);
    setResult(null);
    setMonitorMessage("");
    setMonitorError("");

    const res = await searchVesselScheduleAction(
      port,
      vesselName.trim()
    );

    if (res.success) {
      setResult(res.data);
    } else {
      setResult({
        success: false,
        port,
        vesselName: vesselName.trim(),
        schedules: [],
        selectedSchedule: null,
        error: res.error || `Gagal mengambil jadwal dari ${port.toUpperCase()}.`,
      });
    }
    setLoading(false);
  };

  const handleEnableMonitor = async () => {
    if (!vesselName.trim()) return;

    let formattedWa = waNumber.trim().replace(/\D/g, "");
    if (formattedWa.startsWith("0")) {
      formattedWa = "62" + formattedWa.substring(1);
    }

    setMonitorLoading(true);
    setMonitorMessage("");
    setMonitorError("");

    const res = await enableVesselMonitoringAction(
      vesselName.trim(),
      port,
      formattedWa || undefined
    );

    if (res.success) {
      setMonitorMessage(res.data.message);
      if (res.data.trackingResult) {
        setResult(res.data.trackingResult);
      }
      onMonitorChanged?.();
    } else {
      setMonitorError(res.error || "Gagal mengaktifkan auto-monitoring.");
    }
    setMonitorLoading(false);
  };

  const s: VesselScheduleItem | null = result?.selectedSchedule || null;

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ship className="w-5 h-5 text-primary" />
            Port Vessel Open Stack Checker
          </CardTitle>
          <CardDescription>
            Pilih terminal dan masukkan nama kapal untuk mengecek jadwal Open Stacking real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="w-full md:w-1/3">
                <Select
                  value={port}
                  onValueChange={(val) => {
                    setPort(val);
                    setResult(null);
                    setMonitorMessage("");
                    setMonitorError("");
                  }}
                >
                  <SelectTrigger className="w-full font-semibold">
                    <SelectValue placeholder="Pilih Terminal" />
                  </SelectTrigger>
                  <SelectContent>
                    {VESSEL_TERMINALS.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="font-medium">
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
                  placeholder="Masukkan Nama Kapal (contoh: SKY PRIDE atau JOSEPHINE MAERSK)"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value.toUpperCase())}
                  className="pl-9 font-mono uppercase font-bold text-foreground"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !vesselName.trim()}
                className="w-full md:w-auto font-bold px-8"
              >
                {loading ? "Mencari..." : "Cek Schedule"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {!result.success ? (
            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardContent className="p-6 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-destructive text-base">
                    Pencarian Gagal
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.error}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : !s ? (
            <Card className="border-blue-500/30 bg-blue-500/5 shadow-sm">
              <CardContent className="p-6 flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-foreground text-base">
                    Tidak Ada Jadwal Kapal Aktif
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kapal <strong>{result.vesselName}</strong> tidak memiliki jadwal aktif di terminal <strong>{result.port.toUpperCase()}</strong> (kapal mungkin sudah berlayar/SAILED atau belum terjadwal).
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/20 shadow-md overflow-hidden bg-card">
              {/* Header banner */}
              <div className="bg-primary/5 p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-bold uppercase tracking-wider text-[11px]">
                      {result.port.toUpperCase()} Terminal
                    </Badge>
                    <Badge
                      className={`font-bold text-[11px] uppercase ${
                        s.status.toUpperCase() === "ACTIVE" || s.status.toUpperCase() === "WORKING"
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground mt-2">
                    {s.vessel}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Line: <span className="font-bold text-foreground">{s.line || "-"}</span> | Service:{" "}
                    <span className="font-bold text-foreground">{s.service || "-"}</span> | Voy In/Out:{" "}
                    <span className="font-bold text-foreground">{s.voyIn || "-"} / {s.voyOut || "-"}</span>
                  </p>
                </div>

                {/* Highlighted Open Stacking Box */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3 shrink-0">
                  <Calendar className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Jadwal Open Stacking
                    </p>
                    <p className="text-lg font-black text-primary font-mono mt-0.5">
                      {s.openStacking || "BELUM TERSEDIA"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule detail cards */}
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Anchor className="w-4 h-4 text-blue-500" /> ETB (Berthing)
                    </p>
                    <p className="text-sm font-bold font-mono text-foreground mt-2">
                      {s.etb || "-"}
                    </p>
                    {s.ata && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        ATA: {s.ata}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" /> ETD (Departure)
                    </p>
                    <p className="text-sm font-bold font-mono text-foreground mt-2">
                      {s.etd || "-"}
                    </p>
                    {s.atd && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        ATD: {s.atd}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-purple-500" /> Closing Document
                    </p>
                    <p className="text-sm font-bold font-mono text-foreground mt-2">
                      {s.closingDoc || "-"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-rose-500" /> Closing Physic
                    </p>
                    <p className="text-sm font-bold font-mono text-foreground mt-2">
                      {s.closingPhysic || "-"}
                    </p>
                  </div>
                </div>

                {/* Auto-Monitoring Registration section */}
                {(() => {
                  const isSailingOrCompleted = isVesselSailingOrCompleted(s.status, s.etd);

                  if (isSailingOrCompleted) {
                    return (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                        <div>
                          <h4 className="font-bold text-foreground text-sm">
                            Kapal Berstatus {s.status} (Sudah Bertolak / Sailing)
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Kegiatan operasional kapal ini di terminal {result.port.toUpperCase()} telah selesai/berangkat, sehingga pemantauan otomatis (auto-monitoring) tidak perlu diaktifkan.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                            <BellRing className="w-4 h-4 text-primary" /> Auto-Monitoring Open Stack ({result.port.toUpperCase()})
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Dapatkan notifikasi instan via WhatsApp / Telegram saat jadwal Open Stacking tersedia / terupdate.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          placeholder="Nomor WhatsApp (misal: 08123456789)"
                          value={waNumber}
                          onChange={(e) => setWaNumber(e.target.value)}
                          className="font-mono text-sm"
                          disabled={monitorLoading}
                        />
                        <Button
                          onClick={handleEnableMonitor}
                          disabled={monitorLoading}
                          className="font-bold shrink-0"
                        >
                          {monitorLoading ? "Mengaktifkan..." : "Aktifkan Auto-Monitoring"}
                        </Button>
                      </div>

                      {monitorMessage && (
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{monitorMessage}</span>
                        </div>
                      )}

                      {monitorError && (
                        <div className="flex items-center gap-2 text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          <span>{monitorError}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Other schedule records if multiple exist */}
                {result.schedules.length > 1 && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                      Semua Schedule Ditemukan ({result.schedules.length})
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted text-muted-foreground font-bold">
                          <tr>
                            <th className="p-2.5">VESSEL</th>
                            <th className="p-2.5">LINE</th>
                            <th className="p-2.5">VOY IN/OUT</th>
                            <th className="p-2.5">STATUS</th>
                            <th className="p-2.5">ETB</th>
                            <th className="p-2.5">OPEN STACKING</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {result.schedules.map((item, idx) => (
                            <tr
                              key={idx}
                              className={
                                item === s ? "bg-primary/10 font-bold" : "hover:bg-muted/30"
                              }
                            >
                              <td className="p-2.5 font-mono">{item.vessel}</td>
                              <td className="p-2.5">{item.line}</td>
                              <td className="p-2.5 font-mono">
                                {item.voyIn} / {item.voyOut}
                              </td>
                              <td className="p-2.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {item.status}
                                </Badge>
                              </td>
                              <td className="p-2.5 font-mono">{item.etb || "-"}</td>
                              <td className="p-2.5 font-mono text-primary">
                                {item.openStacking || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
