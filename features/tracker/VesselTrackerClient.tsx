"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@bprogress/next";
import {
  Ship,
  Search,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Users,
  Compass,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  searchVesselAllPortsAction,
  enableVesselMonitoringAction,
  enableMultiPortVesselMonitoringAction,
} from "@/actions/vessel-action";
import {
  MultiPortVesselResult,
  VesselScheduleItem,
} from "@/actions/tracking/vessel";
import { getActiveSubscriptionsAction } from "@/actions/subscription-action";
import { getCurrentUserAction } from "@/actions/user-action";
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

export interface VesselTrackerClientProps {
  onMonitorChanged?: () => void;
}

interface SubscriptionItem {
  id: string;
  targetId: string;
  name: string;
  isGroup: boolean;
}

interface CurrentUser {
  id: string;
  username: string;
  role: string;
  subscriptionId?: string | null;
  subscriptionTargetId?: string | null;
  subscriptionName?: string | null;
}

export default function VesselTrackerClient({
  onMonitorChanged,
}: VesselTrackerClientProps = {}) {
  const { start: startProgress, stop: stopProgress } = useProgress();

  // Search Form State
  const [vesselName, setVesselName] = useState("");
  const [voyageNo, setVoyageNo] = useState("");

  // Subscriptions & User Auth State
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("custom");
  const [customWaNumber, setCustomWaNumber] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Results State
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] =
    useState<MultiPortVesselResult | null>(null);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [searchedVoyage, setSearchedVoyage] = useState("");

  // Monitor Submit Feedback
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorMessage, setMonitorMessage] = useState("");
  const [monitorError, setMonitorError] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [subRes, userRes] = await Promise.all([
          getActiveSubscriptionsAction(),
          getCurrentUserAction(),
        ]);

        if (subRes.success && subRes.data) {
          setSubscriptions(subRes.data);
        }

        if (userRes.success && userRes.data) {
          const usr = userRes.data;
          setCurrentUser(usr);
          if (usr.subscriptionTargetId) {
            setSelectedTargetId(usr.subscriptionTargetId);
          }
        }
      } catch (err) {
        console.error("Failed loading initial vessel tracker data:", err);
      }
    }
    loadInitialData();
  }, []);

  const refreshMonitors = () => {
    if (onMonitorChanged) {
      onMonitorChanged();
    }
  };

  const getEffectiveWaNumber = (): string | undefined => {
    if (currentUser?.role === "MEMBER" && currentUser.subscriptionTargetId) {
      return currentUser.subscriptionTargetId;
    }
    if (selectedTargetId === "custom") {
      return customWaNumber.trim() || undefined;
    }
    return selectedTargetId || undefined;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vesselName.trim() || vesselName.trim().length < 2) {
      setMonitorError("Masukkan nama vessel minimal 2 karakter.");
      return;
    }

    setLoading(true);
    setMonitorError("");
    setMonitorMessage("");
    startProgress();

    try {
      const res = await searchVesselAllPortsAction(vesselName.trim());
      if (res.success) {
        setSearchResult(res.data);
        setSearchedKeyword(vesselName.trim().toUpperCase());
        setSearchedVoyage(voyageNo.trim().toUpperCase());
      } else {
        setMonitorError(res.error || "Gagal melakukan pencarian jadwal kapal.");
        setSearchResult(null);
      }
    } catch (err) {
      setMonitorError(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
      );
      setSearchResult(null);
    } finally {
      setLoading(false);
      stopProgress();
    }
  };

  const handleEnableSinglePortMonitor = async (
    vessel: string,
    port: string,
    voyageNo?: string,
  ) => {
    const targetWa = getEffectiveWaNumber();
    setMonitorLoading(true);
    setMonitorError("");
    setMonitorMessage("");
    startProgress();

    try {
      const res = await enableVesselMonitoringAction(vessel, port, targetWa, voyageNo);
      if (res.success) {
        setMonitorMessage(res.data.message);
        await refreshMonitors();
      } else {
        setMonitorError(res.error || "Gagal mengaktifkan monitoring kapal.");
      }
    } catch (err) {
      setMonitorError(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
      );
    } finally {
      setMonitorLoading(false);
      stopProgress();
    }
  };

  const handleEnableMultiPortMonitor = async () => {
    if (!searchedKeyword) return;
    const targetWa = getEffectiveWaNumber();
    setMonitorLoading(true);
    setMonitorError("");
    setMonitorMessage("");
    startProgress();

    try {
      const res = await enableMultiPortVesselMonitoringAction(
        searchedKeyword,
        searchedVoyage || undefined,
        targetWa,
      );
      if (res.success) {
        setMonitorMessage(res.data.message);
        await refreshMonitors();
      } else {
        setMonitorError(
          res.error || "Gagal mengaktifkan pemantauan multi-pelabuhan.",
        );
      }
    } catch (err) {
      setMonitorError(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
      );
    } finally {
      setMonitorLoading(false);
      stopProgress();
    }
  };

  // Filter schedules strictly if voyage number search filter is set
  const getFilteredSchedules = (
    schedules: VesselScheduleItem[],
  ): VesselScheduleItem[] => {
    if (!searchedVoyage || !searchedVoyage.trim()) return schedules;
    const rawVq = searchedVoyage.trim().toLowerCase();
    const cleanVq = rawVq.replace(/[^a-z0-9]/g, "");

    return schedules.filter((s) => {
      const voyIn = (s.voyIn || "").trim().toLowerCase();
      const voyOut = (s.voyOut || "").trim().toLowerCase();
      const cleanVoyIn = voyIn.replace(/[^a-z0-9]/g, "");
      const cleanVoyOut = voyOut.replace(/[^a-z0-9]/g, "");

      if (!cleanVoyIn && !cleanVoyOut) return false;

      const matchesVoyIn =
        voyIn === rawVq ||
        (cleanVoyIn.length > 0 &&
          (cleanVoyIn === cleanVq ||
            cleanVoyIn.includes(cleanVq) ||
            cleanVq.includes(cleanVoyIn)));

      const matchesVoyOut =
        voyOut === rawVq ||
        (cleanVoyOut.length > 0 &&
          (cleanVoyOut === cleanVq ||
            cleanVoyOut.includes(cleanVq) ||
            cleanVq.includes(cleanVoyOut)));

      return matchesVoyIn || matchesVoyOut;
    });
  };

  const filteredVessels = searchResult
    ? getFilteredSchedules(searchResult.vessels)
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Grid Layout: Search Form & Monitoring Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Search Form Card (Sticky on desktop, neat natural height) */}
        <Card className="lg:col-span-5 border-border/60 shadow-xs lg:sticky lg:top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Ship className="w-4 h-4 text-primary" /> Pencarian Kapal 5
              Pelabuhan
            </CardTitle>
            <CardDescription className="text-xs">
              Masukkan nama vessel dan nomor voyage untuk mencari ke seluruh
              pelabuhan secara bersamaan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Nama Vessel <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Contoh: JOSEPHINE MAERSK / AXPER"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    className="font-mono text-xs uppercase pl-8"
                    required
                  />
                  <Ship className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  No. Voyage{" "}
                  <span className="text-muted-foreground font-normal">
                    (Opsional)
                  </span>
                </label>
                <Input
                  placeholder="Contoh: 2501S / 0025N"
                  value={voyageNo}
                  onChange={(e) => setVoyageNo(e.target.value)}
                  className="font-mono text-xs uppercase"
                />
              </div>

              {/* Target WhatsApp Selection */}
              <div className="space-y-1.5 pt-1 border-t border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5 text-primary" /> Target
                  Notifikasi WhatsApp
                </label>

                {currentUser?.role === "MEMBER" &&
                currentUser.subscriptionTargetId ? (
                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {currentUser.subscriptionName ||
                          "Grup WhatsApp Terhubung"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Member Account Linked
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedTargetId}
                      onValueChange={setSelectedTargetId}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Pilih Target Notifikasi WA" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptions.map((sub) => (
                          <SelectItem
                            key={sub.id}
                            value={sub.targetId}
                            className="text-xs"
                          >
                            <span className="font-semibold">{sub.name}</span>{" "}
                            <span className="text-[10px] text-muted-foreground">
                              ({sub.isGroup ? "Grup WA" : "Nomor HP"})
                            </span>
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="custom"
                          className="text-xs font-mono text-primary"
                        >
                          + Input Nomor WA / ID Grup Manual
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {selectedTargetId === "custom" && (
                      <Input
                        placeholder="Contoh: 628123456789 atau 120363...@g.us"
                        value={customWaNumber}
                        onChange={(e) => setCustomWaNumber(e.target.value)}
                        className="font-mono text-xs mt-2"
                      />
                    )}
                  </>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs font-bold gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memindai
                    5 Pelabuhan...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" /> Cari di 5 Pelabuhan
                  </>
                )}
              </Button>
            </form>

            {/* Notifications / Alerts */}
            {monitorMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{monitorMessage}</span>
              </div>
            )}
            {monitorError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{monitorError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Results / Unscheduled State Display */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {!searchResult && !loading && (
            <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-border/80 bg-muted/20">
              <Compass className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-bold text-foreground">
                Siap Melacak Kapal 5 Pelabuhan
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Masukkan Nama Vessel (dan Nomor Voyage opsional) pada form di
                sebelah kiri untuk mencari jadwal secara serentak di JICT,
                NPCT1, KOJA, TMAL, dan TER3.
              </p>
            </Card>
          )}

          {searchResult && (
            <>
              {searchResult.vessels.length > 0 ? (
                filteredVessels.length > 0 ? (
                  /* Case A: Found schedules matching vessel & voyage filter */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Hasil
                        Pencarian Kapal:{" "}
                        <span className="text-foreground font-black">
                          {searchedKeyword}
                        </span>
                        {searchedVoyage && (
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] ml-1 bg-primary/10 border-primary/30 text-primary"
                          >
                            Voyage: {searchedVoyage}
                          </Badge>
                        )}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {searchedVoyage
                          ? `Menampilkan ${filteredVessels.length} dari ${searchResult.vessels.length} Jadwal`
                          : `Ditemukan ${filteredVessels.length} Jadwal`}
                      </Badge>
                    </div>

                    {filteredVessels.map((s, idx) => {
                      const isBest = filteredVessels[0] === s;
                      const portName = (s.port || "npct1").toLowerCase();
                      return (
                        <Card
                          key={`${portName}-${s.voyIn || s.voyOut || idx}`}
                          className={`border-border shadow-xs overflow-hidden transition-all ${
                            isBest ? "ring-2 ring-primary/40 bg-primary/5" : ""
                          }`}
                        >
                          <CardHeader className="py-3 bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="default"
                                className="text-xs font-bold uppercase"
                              >
                                {portName}
                              </Badge>
                              <span className="text-xs font-bold text-foreground">
                                {s.vessel}
                              </span>
                              {(s.voyIn || s.voyOut) && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono bg-background"
                                >
                                  Voy: {s.voyIn || s.voyOut}
                                </Badge>
                              )}
                            </div>
                            {s.status && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-bold"
                              >
                                {s.status}
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="p-2 rounded-lg bg-background border border-border">
                                <p className="text-[10px] text-muted-foreground font-semibold">
                                  ETB
                                </p>
                                <p className="font-mono font-bold">
                                  {s.etb || "-"}
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-background border border-border">
                                <p className="text-[10px] text-muted-foreground font-semibold">
                                  ETD
                                </p>
                                <p className="font-mono font-bold">
                                  {s.etd || "-"}
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 col-span-2 sm:col-span-2">
                                <p className="text-[10px] text-primary font-bold uppercase">
                                  Open Stacking
                                </p>
                                <p className="font-mono font-black text-primary text-sm">
                                  {s.openStacking || "BELUM TERSEDIA"}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                              <div>
                                <span className="font-semibold">
                                  Closing Doc:
                                </span>{" "}
                                <span className="font-mono text-foreground">
                                  {s.closingDoc || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Closing Physic:
                                </span>{" "}
                                <span className="font-mono text-foreground">
                                  {s.closingPhysic || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold">Line:</span>{" "}
                                <span className="text-foreground">
                                  {s.line || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold">Service:</span>{" "}
                                <span className="text-foreground">
                                  {s.service || "-"}
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-end pt-2">
                              <Button
                                type="button"
                                onClick={() =>
                                  handleEnableSinglePortMonitor(
                                    s.vessel,
                                    portName,
                                    s.voyIn || s.voyOut,
                                  )
                                }
                                disabled={monitorLoading}
                                size="sm"
                                className="text-xs font-bold gap-1.5 cursor-pointer"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                                Monitoring Open Stack ({portName.toUpperCase()})
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* Case B: Vessel exists in port, but NO schedule matches the entered searchedVoyage */
                  <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">
                          Voyage &quot;{searchedVoyage}&quot; Tidak Ditemukan
                          untuk Vessel &quot;{searchedKeyword}&quot;
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Ditemukan {searchResult.vessels.length} jadwal untuk
                          kapal ini di pelabuhan, namun tidak ada yang cocok
                          dengan Voyage &quot;{searchedVoyage}&quot;.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-background border border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold text-foreground">
                          Opsi Pemantauan Kapal
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Anda dapat melihat seluruh jadwal voyage untuk kapal ini
                        atau memantau Voyage &quot;{searchedVoyage}&quot; secara
                        otomatis di ke-5 pelabuhan.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSearchedVoyage("")}
                          className="text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          Tampilkan Semua Voyage ({searchResult.vessels.length}{" "}
                          Jadwal)
                        </Button>
                        <Button
                          type="button"
                          onClick={handleEnableMultiPortMonitor}
                          disabled={monitorLoading}
                          className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer"
                        >
                          {monitorLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <BellRing className="w-3.5 h-3.5" />
                          )}
                          Pantau Voyage Ini (Auto-Scan 5 Port)
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              ) : (
                /* Case C: NOT found in any port */
                <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">
                        Kapal &quot;{searchedKeyword}&quot; Belum Terdaftar di
                        Pelabuhan Manapun
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Jadwal kapal ini belum ditemukan di JICT, NPCT1, KOJA,
                        TMAL, atau TER3 saat ini.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-foreground">
                        Fitur Auto-Scan Multi-Pelabuhan
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Daftarkan kapal ini untuk dipantau secara otomatis oleh
                      sistem di ke-5 pelabuhan. Begitu jadwal sandar atau Open
                      Stacking terdaftar di salah satu pelabuhan, sistem akan
                      langsung mengirimkan notifikasi WhatsApp & Telegram!
                    </p>

                    <Button
                      type="button"
                      onClick={handleEnableMultiPortMonitor}
                      disabled={monitorLoading}
                      className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer"
                    >
                      {monitorLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BellRing className="w-3.5 h-3.5" />
                      )}
                      Pantau Kapal Ini di Semua Pelabuhan (Auto-Scan)
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
