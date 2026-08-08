"use client";

import { useState, useEffect } from "react";
import { useProgress } from "@bprogress/next";
import {
  Search,
  MapPin,
  Map,
  Info,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Container,
  Layers,
  MessageSquare,
  Users,
} from "lucide-react";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import type { TerminalTrackingResult } from "@/actions/tracking/types";
import {
  enableTerminalMonitoring,
  enableBatchTerminalMonitoring,
} from "@/actions/monitor-action";
import { getActiveSubscriptionsAction } from "@/actions/subscription-action";
import { getCurrentUserAction } from "@/actions/user-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { isOutgateStatus, isYardStatus } from "@/actions/tracking/utils";

const TERMINALS = [
  { id: "jict", name: "JICT (Jakarta International Container Terminal)" },
  { id: "npct1", name: "NPCT1 (New Priok Container Terminal 1)" },
  { id: "koja", name: "KOJA (TPK Koja)" },
  { id: "tmal", name: "TMAL (Terminal Mustika Alam Lestari)" },
  { id: "ter3", name: "TER3 (Terminal 3)" },
];

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

export default function TerminalTrackerClient() {
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [port, setPort] = useState<string>("jict");
  const [containerNo, setContainerNo] = useState("");
  const [multiContainersText, setMultiContainersText] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [voyageNo, setVoyageNo] = useState("");

  // Subscriptions & Auth state
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("custom");
  const [customWaNumber, setCustomWaNumber] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Results state
  const [loading, setLoading] = useState(false);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorMessage, setMonitorMessage] = useState("");
  const [monitorError, setMonitorError] = useState("");

  const [singleResult, setSingleResult] =
    useState<TerminalTrackingResult | null>(null);
  const [batchResults, setBatchResults] = useState<TerminalTrackingResult[]>(
    [],
  );
  const [batchMonitorResults, setBatchMonitorResults] = useState<
    Array<{ containerNo: string; success: boolean; message: string }>
  >([]);

  // Fetch subscriptions & current user on mount
  useEffect(() => {
    async function loadInitialData() {
      let userSubTargetId: string | null = null;

      const userRes = await getCurrentUserAction();
      if (userRes.success && userRes.data) {
        setCurrentUser(userRes.data);
        userSubTargetId = userRes.data.subscriptionTargetId || null;
        if (userRes.data.subscriptionTargetId) {
          setSelectedTargetId(userRes.data.subscriptionTargetId);
        }
      }

      const subRes = await getActiveSubscriptionsAction();
      if (subRes.success && subRes.data) {
        setSubscriptions(subRes.data);
        if (subRes.data.length > 0 && !userSubTargetId) {
          setSelectedTargetId(subRes.data[0].targetId);
        }
      }
    }
    loadInitialData();
  }, []);

  // Compute final WA target
  const getResolvedWaTarget = (): string | undefined => {
    if (
      currentUser?.subscriptionTargetId &&
      (currentUser.role === "MEMBER" || currentUser.role === "CS")
    ) {
      return currentUser.subscriptionTargetId;
    }
    if (selectedTargetId === "custom") {
      let formatted = customWaNumber.trim().replace(/\D/g, "");
      if (formatted.startsWith("0")) {
        formatted = "62" + formatted.substring(1);
      }
      return formatted || undefined;
    }
    return selectedTargetId || undefined;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMonitorMessage("");
    setMonitorError("");
    setBatchMonitorResults([]);
    startProgress();

    try {
      if (mode === "single") {
        if (!containerNo.trim()) return;

        setLoading(true);
        setSingleResult(null);

        if (port === "npct1" && (!vesselName.trim() || !voyageNo.trim())) {
          setSingleResult({
            success: false,
            port,
            containerNo: containerNo.trim(),
            error: "Vessel Code dan Voyage No wajib diisi untuk NPCT1.",
          });
          setLoading(false);
          return;
        }

        const data = await trackTerminalContainer(
          port,
          containerNo.trim(),
          vesselName.trim() || undefined,
          voyageNo.trim() || undefined,
        );
        setSingleResult(data);
        setLoading(false);
      } else {
        // Multi-Container Search
        const rawList = multiContainersText
          .split(/[\n,]/)
          .map((c) => c.trim().toUpperCase())
          .filter((c) => c.length >= 4);

        if (rawList.length === 0) return;

        setLoading(true);
        setBatchResults([]);

        const uniqueContainers = Array.from(new Set(rawList));
        const results: TerminalTrackingResult[] = [];

        for (const contNo of uniqueContainers) {
          const res = await trackTerminalContainer(
            port,
            contNo,
            vesselName.trim() || undefined,
            voyageNo.trim() || undefined,
          );
          results.push(res);
        }

        setBatchResults(results);
        setLoading(false);
      }
    } finally {
      stopProgress();
    }
  };

  const handleSingleMonitor = async () => {
    if (!singleResult || !singleResult.containerNo || !singleResult.status)
      return;

    const waTarget = getResolvedWaTarget();

    setMonitorLoading(true);
    setMonitorMessage("");
    setMonitorError("");
    startProgress();

    try {
      const res = await enableTerminalMonitoring(
        singleResult.containerNo,
        singleResult.port,
        singleResult.status,
        waTarget,
        vesselName.trim() || undefined,
        voyageNo.trim() || undefined,
      );

      if (res.success) {
        setMonitorMessage(
          res.data.message || "Auto-monitoring berhasil diaktifkan.",
        );
      } else {
        setMonitorError(res.error || "Gagal mengaktifkan auto-monitoring.");
      }
    } finally {
      setMonitorLoading(false);
      stopProgress();
    }
  };

  const handleBatchMonitor = async () => {
    const validItems = batchResults
      .filter((r) => r.success && Boolean(r.status) && !isOutgateStatus(r.status))
      .map((r) => ({
        containerNo: r.containerNo,
        port: r.port,
        status: r.status!,
        vesselName: vesselName.trim() || undefined,
        voyageNo: voyageNo.trim() || undefined,
      }));

    if (validItems.length === 0) {
      setMonitorError("Tidak ada kontainer aktif yang dapat didaftarkan.");
      return;
    }

    const waTarget = getResolvedWaTarget();

    setMonitorLoading(true);
    setMonitorMessage("");
    setMonitorError("");
    startProgress();

    try {
      const res = await enableBatchTerminalMonitoring(validItems, waTarget);

      if (res.success && res.data) {
        setBatchMonitorResults(res.data.results);
        setMonitorMessage(
          `Berhasil mendaftarkan ${res.data.registered} dari ${res.data.total} kontainer ke auto-monitoring.`,
        );
      } else {
        setMonitorError(
          !res.success ? res.error : "Gagal mendaftarkan batch monitoring.",
        );
      }
    } finally {
      setMonitorLoading(false);
      stopProgress();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Side-by-Side 2-Column Grid (Left: Input Form, Right: Output Display) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: Input Form (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <Card className="border-border shadow-sm flex-1 flex flex-col justify-between">
            <CardHeader className="bg-muted/30 border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Port Container Tracker
                </CardTitle>
                <CardDescription className="text-xs">
                  Lacak posisi kontainer real-time di pelabuhan.
                </CardDescription>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center bg-muted p-1 rounded-xl border border-border shrink-0">
                <Button
                  type="button"
                  variant={mode === "single" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setMode("single");
                    setSingleResult(null);
                    setBatchResults([]);
                  }}
                  className="text-xs font-bold gap-1.5 h-7 rounded-lg"
                >
                  <Container className="w-3.5 h-3.5" /> Single
                </Button>
                <Button
                  type="button"
                  variant={mode === "multi" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setMode("multi");
                    setSingleResult(null);
                    setBatchResults([]);
                  }}
                  className="text-xs font-bold gap-1.5 h-7 rounded-lg"
                >
                  <Layers className="w-3.5 h-3.5" /> Multi
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              <form onSubmit={handleSearch} className="flex flex-col gap-3.5">
                {/* Terminal Select */}
                <div className="w-full">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
                    Terminal Pelabuhan
                  </label>
                  <Select value={port} onValueChange={setPort}>
                    <SelectTrigger className="w-full font-semibold text-xs">
                      <SelectValue placeholder="Pilih Terminal" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMINALS.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="font-medium text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mode Single Container Input */}
                {mode === "single" ? (
                  <div className="w-full">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 block">
                      Nomor Kontainer
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Input
                        placeholder="Nomor Kontainer (misal: ONEU7648347)"
                        value={containerNo}
                        onChange={(e) =>
                          setContainerNo(e.target.value.toUpperCase())
                        }
                        className="pl-9 font-mono uppercase font-bold text-foreground text-xs"
                        disabled={loading}
                      />
                    </div>
                  </div>
                ) : (
                  /* Mode Multi-Container Textarea Input */
                  <div className="w-full">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 flex items-center justify-between">
                      <span>Daftar Nomor Kontainer</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Pisahkan Enter / koma
                      </span>
                    </label>
                    <Textarea
                      placeholder={`Masukkan beberapa kontainer:\nEMCU6137410\nTGBU1234567\nMSCU9876543`}
                      value={multiContainersText}
                      onChange={(e) =>
                        setMultiContainersText(e.target.value.toUpperCase())
                      }
                      className="font-mono uppercase font-bold text-foreground min-h-24 p-2.5 text-xs"
                      disabled={loading}
                    />
                  </div>
                )}

                {/* NPCT1 Extra Parameters */}
                {port === "npct1" && (
                  <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-full sm:w-1/2">
                      <Input
                        placeholder="Vessel Code (misal: EVBIT)"
                        value={vesselName}
                        onChange={(e) =>
                          setVesselName(e.target.value.toUpperCase())
                        }
                        className="font-mono uppercase bg-primary/5 border-primary/20 text-xs"
                        disabled={loading}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-1 font-medium">
                        NPCT1 Kode Kapal
                      </p>
                    </div>
                    <div className="w-full sm:w-1/2">
                      <Input
                        placeholder="Voyage No (misal: 080B)"
                        value={voyageNo}
                        onChange={(e) => setVoyageNo(e.target.value.toUpperCase())}
                        className="font-mono uppercase bg-primary/5 border-primary/20 text-xs"
                        disabled={loading}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-1 font-medium">
                        NPCT1 Voyage No
                      </p>
                    </div>
                  </div>
                )}

                {/* WhatsApp Target Selector */}
                {currentUser?.subscriptionTargetId &&
                (currentUser.role === "MEMBER" || currentUser.role === "CS") ? (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Target WA Member (Otomatis)
                      </label>
                      <Badge className="text-[9px] bg-emerald-600 text-white font-semibold">
                        MEMBER AUTO-LINKED
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-background border border-emerald-500/20 rounded-lg text-xs font-medium">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Subscription:
                      </span>
                      <strong className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded text-xs truncate max-w-[180px]">
                        {currentUser.subscriptionName ||
                          subscriptions.find(
                            (s) => s.targetId === currentUser.subscriptionTargetId,
                          )?.name ||
                          "Subscription Member"}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        Target Notifikasi WhatsApp
                      </label>
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-background font-mono"
                      >
                        {subscriptions.length} Subscriber
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Select
                        value={selectedTargetId}
                        onValueChange={setSelectedTargetId}
                      >
                        <SelectTrigger className="w-full bg-background font-medium text-xs">
                          <SelectValue placeholder="Pilih Target WhatsApp" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="custom"
                            className="font-semibold text-xs"
                          >
                            ✏️ Input Nomor WA Manual / Custom
                          </SelectItem>
                          {subscriptions.map((sub) => (
                            <SelectItem
                              key={sub.id}
                              value={sub.targetId}
                              className="text-xs"
                            >
                              {sub.isGroup ? "🎯 [GRUP WA]" : "📱 [PERSONAL]"}{" "}
                              <strong>{sub.name}</strong>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedTargetId === "custom" && (
                        <Input
                          placeholder="Nomor HP WhatsApp (misal: 08123456789)"
                          value={customWaNumber}
                          onChange={(e) => setCustomWaNumber(e.target.value)}
                          className="bg-background font-mono text-xs"
                          disabled={loading}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    (mode === "single"
                      ? !containerNo.trim()
                      : !multiContainersText.trim())
                  }
                  className="w-full font-bold h-10 text-sm shadow-sm mt-1"
                >
                  {loading
                    ? "Sedang Memproses Tracking..."
                    : mode === "single"
                      ? "Cek Status Kontainer"
                      : "Track Multi-Container Batch"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Global Error Banner */}
          {monitorError && (
            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs font-medium text-destructive">
                  {monitorError}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Tracking Result Display / Live Preview (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col space-y-4 h-full">
          {mode === "single" && singleResult ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300 h-full flex flex-col">
              <Card className="overflow-hidden border-border shadow-sm h-full flex flex-col">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-primary" />
                    <h3 className="font-bold tracking-tight text-foreground text-sm">
                      Status Kontainer Real-Time
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono bg-background text-xs font-bold border-primary/30"
                  >
                    {singleResult.containerNo}
                  </Badge>
                </div>

                <div className="p-5 flex-1 max-h-[460px] overflow-y-auto space-y-4">
                  {(() => {
                    const isOutgate = isOutgateStatus(singleResult.status);
                    const isYard = isYardStatus(singleResult.status);

                    if (!singleResult.success) {
                      return (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Info className="w-6 h-6 text-destructive" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-foreground text-sm">
                              Tracking Gagal
                            </h4>
                            <p className="text-xs text-muted-foreground max-w-md">
                              {singleResult.error}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl bg-card gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              Terminal Allocation
                            </p>
                            <p className="font-black text-base text-foreground uppercase tracking-tight">
                              {TERMINALS.find((t) => t.id === singleResult.port)
                                ?.name || singleResult.port}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                Status Pelabuhan
                              </p>
                              <Badge
                                variant={
                                  isOutgate
                                    ? "destructive"
                                    : isYard
                                      ? "default"
                                      : "secondary"
                                }
                                className="font-black tracking-widest text-[12px] px-3 py-1 uppercase"
                              >
                                {singleResult.status}
                              </Badge>
                            </div>

                            {singleResult.time && (
                              <div className="space-y-1 text-right border-l border-border pl-3">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                  {isOutgate ? "OUTGATE TIME" : "TIME"}
                                </p>
                                <p className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border border-border text-foreground">
                                  {isOutgate
                                    ? singleResult.timeOut
                                    : singleResult.time}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {(singleResult.ob ||
                          singleResult.obName ||
                          (singleResult.raw &&
                            typeof singleResult.raw === "object" &&
                            "remarks" in
                              (singleResult.raw as Record<string, unknown>) &&
                            (singleResult.raw as Record<string, unknown>)
                              .remarks)) && (
                          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-900 dark:text-amber-300 font-medium flex flex-wrap items-center justify-between gap-2">
                            {singleResult.ob && (
                              <div>
                                <span className="font-bold uppercase tracking-wider">
                                  OB / PLP Status:
                                </span>{" "}
                                {singleResult.ob} (
                                {singleResult.obName || "Gudang OB"})
                              </div>
                            )}
                            {Boolean(
                              singleResult.raw &&
                              typeof singleResult.raw === "object" &&
                              "remarks" in
                                (singleResult.raw as Record<string, unknown>) &&
                              (singleResult.raw as Record<string, unknown>).remarks,
                            ) && (
                              <div>
                                <span className="font-bold uppercase tracking-wider">
                                  Remarks:
                                </span>{" "}
                                {String(
                                  (singleResult.raw as Record<string, unknown>)
                                    .remarks,
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auto-Monitoring Enable Section */}
                        {!isOutgate && (
                          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <h4 className="font-bold text-xs text-primary flex items-center gap-1.5">
                                <BellRing className="w-3.5 h-3.5" />
                                Auto-Monitor Container
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Pengecekan otomatis setiap 30 menit & alert WhatsApp.
                              </p>
                            </div>

                            <div className="shrink-0">
                              {monitorMessage ? (
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {monitorMessage}
                                </div>
                              ) : (
                                <Button
                                  onClick={handleSingleMonitor}
                                  disabled={monitorLoading}
                                  size="sm"
                                  variant="default"
                                  className="font-bold text-xs h-8 shadow-sm"
                                >
                                  {monitorLoading
                                    ? "Mengaktifkan..."
                                    : "Aktifkan Auto-Monitoring"}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Card>
            </div>
          ) : mode === "single" && loading ? (
            /* Loading State Card */
            <Card className="border-border shadow-sm p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px]">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <h4 className="font-bold text-foreground text-sm">Sedang Memproses Tracking Terminal...</h4>
              <p className="text-xs text-muted-foreground mt-1">Mengambil data real-time dari pelabuhan {TERMINALS.find(t => t.id === port)?.name || port}.</p>
            </Card>
          ) : mode === "multi" && loading ? (
            /* Loading State Card for Multi Mode */
            <Card className="border-border shadow-sm p-8 text-center flex flex-col items-center justify-center h-full min-h-[380px]">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <h4 className="font-bold text-foreground text-sm">
                Sedang Memproses Batch Tracking Terminal...
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Mengambil data real-time untuk seluruh kontainer dari pelabuhan{" "}
                {TERMINALS.find((t) => t.id === port)?.name || port}.
              </p>
            </Card>
          ) : (
            /* Multi-Container Batch Results Display in Right Column (Always Visible in Multi Mode) */
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300 h-full flex flex-col">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                <div className="p-2.5 rounded-xl border border-border bg-card">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                  <p className="text-lg font-black text-foreground font-mono">
                    {batchResults.length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    🟢 Yard
                  </p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {batchResults.filter((r) => isYardStatus(r.status)).length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-destructive/30 bg-destructive/5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-destructive">
                    🏁 Outgate
                  </p>
                  <p className="text-lg font-black text-destructive font-mono">
                    {batchResults.filter((r) => isOutgateStatus(r.status)).length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    ⚠️ Fail
                  </p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    {batchResults.filter((r) => !r.success).length}
                  </p>
                </div>
              </div>

              <Card className="border-border shadow-sm overflow-hidden flex-1 flex flex-col justify-between">
                <CardHeader className="bg-muted/40 border-b border-border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <div>
                    <CardTitle className="text-xs flex items-center gap-2 font-bold">
                      <Layers className="w-4 h-4 text-primary" /> Hasil Batch ({batchResults.length} Kontainer)
                    </CardTitle>
                  </div>

                  {/* Batch Monitor Action Button */}
                  {batchResults.some(
                    (r) => r.success && !isOutgateStatus(r.status),
                  ) && (
                    <Button
                      onClick={handleBatchMonitor}
                      disabled={monitorLoading}
                      size="sm"
                      className="font-bold text-xs h-7 px-2.5 shrink-0"
                    >
                      <BellRing className="w-3.5 h-3.5 mr-1" />
                      {monitorLoading
                        ? "Mendaftarkan..."
                        : "Auto-Monitor Semua"}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-3 flex-1 flex flex-col space-y-3">
                  {monitorMessage && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{monitorMessage}</span>
                    </div>
                  )}

                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-border flex-1">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-bold uppercase tracking-wider sticky top-0 bg-muted">
                        <tr>
                          <th className="p-2.5">CONTAINER NO</th>
                          <th className="p-2.5">TERMINAL</th>
                          <th className="p-2.5">STATUS</th>
                          <th className="p-2.5">WAKTU (TIME)</th>
                          <th className="p-2.5">MONITOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {batchResults.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-8 text-center text-muted-foreground"
                            >
                              <div className="flex flex-col items-center justify-center space-y-1.5 py-4">
                                <Layers className="w-8 h-8 text-muted-foreground/40 mb-1" />
                                <p className="font-bold text-xs text-foreground">
                                  Belum Ada Data Batch Kontainer
                                </p>
                                <p className="text-[11px] text-muted-foreground max-w-xs">
                                  Masukkan daftar nomor kontainer pada formulir di sebelah kiri lalu klik <strong>Track Multi-Container Batch</strong>.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          batchResults.map((r, idx) => {
                            const isOutgate = isOutgateStatus(r.status);
                            const isYard = isYardStatus(r.status);
                            const monitorInfo = batchMonitorResults.find(
                              (bm) => bm.containerNo === r.containerNo,
                            );

                            return (
                              <tr
                                key={idx}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                <td className="p-2.5 font-mono font-bold text-foreground">
                                  {r.containerNo}
                                </td>
                                <td className="p-2.5 font-semibold uppercase">
                                  {r.port}
                                </td>
                                <td className="p-2.5">
                                  {r.success ? (
                                    <Badge
                                      variant={
                                        isOutgate
                                          ? "destructive"
                                          : isYard
                                            ? "default"
                                            : "secondary"
                                      }
                                      className="font-bold text-[10px] uppercase"
                                    >
                                      {r.status}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-destructive border-destructive/30 text-[10px]"
                                    >
                                      GAGAL
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono text-[11px]">
                                  {r.success ? r.time || "-" : "-"}
                                </td>
                                <td className="p-2.5">
                                  {monitorInfo ? (
                                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> OK
                                    </span>
                                  ) : isOutgate ? (
                                    <span className="text-[10px] text-muted-foreground italic">
                                      OUTGATE
                                    </span>
                                  ) : r.success ? (
                                    <span className="text-[10px] text-primary font-medium">
                                      Siap Monitor
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
