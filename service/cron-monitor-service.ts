import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/tracking";
import {
  trackVesselSchedule,
  parseVesselDate,
  isVesselSailingOrCompleted,
} from "@/actions/tracking/vessel";

import { isOutgateStatus, isYardStatus, isObType } from "@/actions/tracking/utils";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";

export interface CronProcessingResult {
  type: "container" | "vessel";
  containerNo?: string;
  vesselName?: string;
  port?: string;
  status: string;
}

/**
 * Processes active container terminal monitors (JICT, NPCT1, KOJA, TMAL, TER3, PARAMA).
 * Checks yard allocation and Outgate status, updates DB & dispatches alerts.
 */
export async function processContainerMonitors(): Promise<CronProcessingResult[]> {
  const activeMonitors = await prisma.terminalMonitor.findMany({
    where: { isActive: true },
  });

  const results: CronProcessingResult[] = [];
  const chunkSize = 5;

  for (let i = 0; i < activeMonitors.length; i += chunkSize) {
    const chunk = activeMonitors.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (monitor): Promise<CronProcessingResult> => {
        try {
          const result = await trackTerminalContainer(
            monitor.port,
            monitor.containerNo,
            monitor.vesselName || undefined,
            monitor.voyageNo || undefined
          );

          const isOb = isObType(result.ob);
          let newStatus = result.status || "UNKNOWN";

          if (isOb && !newStatus.includes("(OB)")) {
            newStatus = `${newStatus} (OB)`;
          }

          if (
            result.success &&
            newStatus !== monitor.status &&
            newStatus !== "UNKNOWN"
          ) {
            const isOutgate = isOutgateStatus(newStatus);
            const isYard = isYardStatus(newStatus);
            const wasYard = isYardStatus(monitor.status);

            await prisma.terminalMonitor.update({
              where: { id: monitor.id },
              data: {
                status: newStatus,
                isActive: !isOutgate,
                updatedAt: new Date(),
              },
            });

            if (isYard && !wasYard) {
              const telegramMsg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>${monitor.port.toUpperCase()}</b> has received a yard allocation!\nStatus: <b>${newStatus}</b>\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
              await sendTelegramMessage(telegramMsg).catch((e) =>
                console.error("Telegram error in cron:", e)
              );
            }

            const hasil = isOutgate ? result.timeOut || result.time || "-" : result.time || "-";
            if (monitor.waNumber) {
              if (isOutgate) {
                const wasOb = isOb || monitor.status.includes("(OB)");
                const waMsg = wasOb
                  ? whatsappMessage.pulledToOb(
                      monitor.containerNo,
                      monitor.port,
                      hasil,
                      result.obName || result.ob || "Gudang OB"
                    )
                  : whatsappMessage.outgate(
                      monitor.containerNo,
                      monitor.port,
                      hasil,
                      result.customer || "-"
                    );
                await sendWhatsappMessage(monitor.waNumber, waMsg).catch((e) =>
                  console.error("WhatsApp error in cron:", e)
                );
              } else if (isOb && !monitor.status.includes("(OB)")) {
                const waMsg = whatsappMessage.changedToOb(
                  monitor.containerNo,
                  monitor.port,
                  result.status || "UNKNOWN",
                  result.ob,
                  result.obName
                );
                await sendWhatsappMessage(monitor.waNumber, waMsg).catch((e) =>
                  console.error("WhatsApp error in cron:", e)
                );
              } else if (isYard && !wasYard) {
                const waMsg = whatsappMessage.statusChangedToGNSTK(
                  monitor.containerNo,
                  monitor.port,
                  result.time || "-",
                  newStatus
                );
                await sendWhatsappMessage(monitor.waNumber, waMsg).catch((e) =>
                  console.error("WhatsApp error in cron:", e)
                );
              } else {
                const waMsg = whatsappMessage.statusChanged(
                  monitor.containerNo,
                  monitor.port,
                  monitor.status,
                  newStatus,
                  result.time || "-"
                );
                await sendWhatsappMessage(monitor.waNumber, waMsg).catch((e) =>
                  console.error("WhatsApp error in cron:", e)
                );
              }
            }

            return {
              type: "container",
              containerNo: monitor.containerNo,
              port: monitor.port,
              status: `Updated to ${newStatus} (isActive: ${!isOutgate})`,
            };
          }

          return {
            type: "container",
            containerNo: monitor.containerNo,
            port: monitor.port,
            status: result.status || "Unchanged",
          };
        } catch (error) {
          console.error(`Error processing container monitor ${monitor.containerNo}:`, error);
          return {
            type: "container",
            containerNo: monitor.containerNo,
            port: monitor.port,
            status: `Error: ${error instanceof Error ? error.message : "Failed"}`,
          };
        }
      })
    );
    results.push(...chunkResults);
  }

  return results;
}

import { checkWaSubscription } from "@/lib/whatsapp/subscription";

/**
 * Helper to check if a Date field has changed relative to a new date string from port tracking.
 */
function isDateChanged(oldDate: Date | null, newDateStr: string | null | undefined): boolean {
  const newDate = parseVesselDate(newDateStr);
  const oldTime = oldDate ? oldDate.getTime() : 0;
  const newTime = newDate ? newDate.getTime() : 0;
  return oldTime !== newTime;
}

/**
 * Processes active vessel schedule & open stack monitors across all ports (NPCT1, JICT, KOJA, TMAL, TER3).
 * Performs full multi-field change detection (OpenStack, Status, ETB, ATA, ETD, ATD, Closing Doc, Closing Physic).
 * Updates DB & dispatches WhatsApp & Telegram alerts upon any schedule or status modification.
 */
export async function processVesselMonitors(): Promise<CronProcessingResult[]> {
  const activeVesselMonitors = await prisma.vesselMonitor.findMany({
    where: { isActive: true },
  });

  const results: CronProcessingResult[] = [];
  const chunkSize = 5;
  const scheduleCache = new Map<string, ReturnType<typeof trackVesselSchedule>>();

  const fetchScheduleCached = (port: string, vesselName: string) => {
    const key = `${port.toLowerCase().trim()}:${vesselName.toUpperCase().trim()}`;
    if (!scheduleCache.has(key)) {
      scheduleCache.set(key, trackVesselSchedule(port, vesselName));
    }
    return scheduleCache.get(key)!;
  };

  for (let i = 0; i < activeVesselMonitors.length; i += chunkSize) {
    const chunk = activeVesselMonitors.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (vMonitor): Promise<CronProcessingResult> => {
        try {
          const result = await fetchScheduleCached(vMonitor.port, vMonitor.vesselName);
          if (result.success && result.selectedSchedule) {
            const s = result.selectedSchedule;

            const newOpenStackDate = parseVesselDate(s.openStacking);
            const newEtbDate = parseVesselDate(s.etb);
            const newAtaDate = parseVesselDate(s.ata);
            const newEtdDate = parseVesselDate(s.etd);
            const newAtdDate = parseVesselDate(s.atd);
            const newClosingDocDate = parseVesselDate(s.closingDoc);
            const newClosingPhysicDate = parseVesselDate(s.closingPhysic);

            const oldOpenStackTime = vMonitor.openStacking ? vMonitor.openStacking.getTime() : 0;
            const newOpenStackTime = newOpenStackDate ? newOpenStackDate.getTime() : 0;

            const hasNewOpenStack = Boolean(oldOpenStackTime === 0 && newOpenStackTime > 0);
            const openStackChanged = Boolean(
              oldOpenStackTime > 0 &&
                newOpenStackTime > 0 &&
                oldOpenStackTime !== newOpenStackTime
            );

            const statusChanged = Boolean(
              s.status && s.status.trim().toUpperCase() !== vMonitor.status.trim().toUpperCase()
            );
            const etbChanged = isDateChanged(vMonitor.etb, s.etb);
            const ataChanged = isDateChanged(vMonitor.ata, s.ata);
            const etdChanged = isDateChanged(vMonitor.etd, s.etd);
            const atdChanged = isDateChanged(vMonitor.atd, s.atd);
            const closingDocChanged = isDateChanged(vMonitor.closingDoc, s.closingDoc);
            const closingPhysicChanged = isDateChanged(vMonitor.closingPhysic, s.closingPhysic);

            const isSailingOrCompleted = isVesselSailingOrCompleted(s.status, s.etd);

            const hasAnyChange =
              hasNewOpenStack ||
              openStackChanged ||
              statusChanged ||
              etbChanged ||
              ataChanged ||
              etdChanged ||
              atdChanged ||
              closingDocChanged ||
              closingPhysicChanged ||
              isSailingOrCompleted;

            if (hasAnyChange) {
              const oldStatus = vMonitor.status;

              await prisma.vesselMonitor.update({
                where: { id: vMonitor.id },
                data: {
                  status: s.status,
                  line: s.line || vMonitor.line,
                  voyageIn: s.voyIn || vMonitor.voyageIn,
                  voyageOut: s.voyOut || vMonitor.voyageOut,
                  service: s.service || vMonitor.service,
                  etb: newEtbDate,
                  ata: newAtaDate,
                  etd: newEtdDate,
                  atd: newAtdDate,
                  openStacking: newOpenStackDate,
                  closingDoc: newClosingDocDate,
                  closingPhysic: newClosingPhysicDate,
                  isActive: !isSailingOrCompleted,
                  updatedAt: new Date(),
                },
              });

              // Construct detailed summary of modified fields
              const changesSummary: string[] = [];
              if (hasNewOpenStack) changesSummary.push(`Open Stacking Tersedia (${s.openStacking})`);
              else if (openStackChanged) changesSummary.push(`Open Stacking Berubah (${s.openStacking})`);

              if (statusChanged) changesSummary.push(`Status (${oldStatus} ➔ ${s.status})`);
              if (etbChanged) changesSummary.push(`ETB (${s.etb || "N/A"})`);
              if (ataChanged) changesSummary.push(`ATA (${s.ata || "N/A"})`);
              if (etdChanged) changesSummary.push(`ETD (${s.etd || "N/A"})`);
              if (atdChanged) changesSummary.push(`ATD (${s.atd || "N/A"})`);
              if (closingDocChanged) changesSummary.push(`Closing Doc (${s.closingDoc || "N/A"})`);
              if (closingPhysicChanged) changesSummary.push(`Closing Physic (${s.closingPhysic || "N/A"})`);
              if (isSailingOrCompleted && !statusChanged) changesSummary.push("Status Kapal Berlayar / SAILED");

              // Send Telegram Alert
              const teleHeader = hasNewOpenStack
                ? `🚢 <b>OPEN STACK AVAILABLE (${vMonitor.port.toUpperCase()})</b> 🚢`
                : `🚢 <b>VESSEL SCHEDULE UPDATED (${vMonitor.port.toUpperCase()})</b> 🚢`;

              const teleMsg = `${teleHeader}\n\nVessel: <b>${vMonitor.vesselName}</b>\nStatus: <b>${s.status}</b>\nChanges: <i>${changesSummary.join(", ")}</i>\nOpen Stacking: <b>${s.openStacking || "N/A"}</b>\nETB: ${s.etb || "N/A"}\nETD: ${s.etd || "N/A"}`;
              await sendTelegramMessage(teleMsg).catch((e) =>
                console.error("Telegram error in vessel cron:", e)
              );

              // Send WhatsApp Alert
              if (vMonitor.waNumber) {
                const subCheck = await checkWaSubscription(vMonitor.waNumber, 0);
                if (subCheck.allowed) {
                  const waMsg = hasNewOpenStack
                    ? whatsappMessage.npct1OpenStackAvailableAlert(
                        vMonitor.vesselName,
                        s.openStacking || "TERSEDIA",
                        s.etb || "-",
                        s.etd || "-",
                        s.status,
                        vMonitor.port
                      )
                    : whatsappMessage.vesselScheduleUpdatedAlert(
                        vMonitor.vesselName,
                        vMonitor.port,
                        oldStatus,
                        s.status,
                        changesSummary,
                        s.openStacking || "BELUM TERSEDIA",
                        s.etb || "-",
                        s.etd || "-"
                      );

                  await sendWhatsappMessage(vMonitor.waNumber, waMsg).catch((e) =>
                    console.error("WhatsApp error in vessel cron:", e)
                  );
                } else {
                  console.log(`Skipping WhatsApp notification for ${vMonitor.waNumber}: subscription expired or suspended`);
                }
              }

              return {
                type: "vessel",
                vesselName: vMonitor.vesselName,
                port: vMonitor.port,
                status: `Updated (${changesSummary.join(", ")})`,
              };
            }

            return {
              type: "vessel",
              vesselName: vMonitor.vesselName,
              port: vMonitor.port,
              status: "Unchanged",
            };
          }

          // Handles case where selectedSchedule is null or schedule cleared (vessel departed)
          const errLower = (result.error || "").toLowerCase();
          const isScheduleClearedOrNotFound =
            result.success ||
            errLower.includes("tidak ditemukan") ||
            errLower.includes("not found") ||
            errLower.includes("tidak ada") ||
            errLower.includes("kosong");

          if (isScheduleClearedOrNotFound) {
            await prisma.vesselMonitor.update({
              where: { id: vMonitor.id },
              data: {
                status: "SAILED",
                isActive: false,
                updatedAt: new Date(),
              },
            });

            // Dispatch Telegram completion alert
            const teleMsg = `🚢 <b>VESSEL DEPARTED / MONITORING CLOSED (${vMonitor.port.toUpperCase()})</b> 🚢\n\nVessel: <b>${vMonitor.vesselName}</b>\nStatus: <b>SAILED / DEPARTED</b>\nJadwal kapal telah selesai dan bertolak dari terminal. Auto-monitoring otomatis dinonaktifkan.`;
            await sendTelegramMessage(teleMsg).catch((e) =>
              console.error("Telegram error in vessel cron:", e)
            );

            // Dispatch WhatsApp completion alert
            if (vMonitor.waNumber) {
              const subCheck = await checkWaSubscription(vMonitor.waNumber, 0);
              if (subCheck.allowed) {
                const waMsg = whatsappMessage.vesselScheduleUpdatedAlert(
                  vMonitor.vesselName,
                  vMonitor.port,
                  vMonitor.status,
                  "SAILED / DEPARTED",
                  ["Jadwal kapal telah selesai dan bertolak dari terminal."],
                  "SELESAI",
                  "-",
                  "-"
                );
                await sendWhatsappMessage(vMonitor.waNumber, waMsg).catch((e) =>
                  console.error("WhatsApp error in vessel cron:", e)
                );
              }
            }

            return {
              type: "vessel",
              vesselName: vMonitor.vesselName,
              port: vMonitor.port,
              status: "Deactivated (SAILED / Schedule cleared)",
            };
          }

          return {
            type: "vessel",
            vesselName: vMonitor.vesselName,
            port: vMonitor.port,
            status: `Transient error: ${result.error}`,
          };
        } catch (error) {
          console.error(`Error processing vessel monitor ${vMonitor.vesselName}:`, error);
          return {
            type: "vessel",
            vesselName: vMonitor.vesselName,
            port: vMonitor.port,
            status: `Error: ${error instanceof Error ? error.message : "Failed"}`,
          };
        }
      })
    );
    results.push(...chunkResults);
  }

  return results;
}
