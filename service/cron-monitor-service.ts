import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/tracking";
import {
  trackVesselSchedule,
  searchVesselAllPorts,
  parseVesselDate,
  isVesselSailingOrCompleted,
  isVoyageMatch,
  VesselScheduleItem,
} from "@/actions/tracking/vessel";

import { isOutgateStatus, isYardStatus, isObType } from "@/actions/tracking/utils";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { checkWaSubscription } from "@/lib/whatsapp/subscription";

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
 * Retains DB status if WhatsApp notification delivery fails so transient network issues can be retried on next cron run.
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

          const cleanNewStatus = newStatus.trim().toUpperCase();
          const cleanOldStatus = (monitor.status || "").trim().toUpperCase();

          const hasStatusChanged =
            result.success &&
            cleanNewStatus !== cleanOldStatus &&
            cleanNewStatus !== "UNKNOWN";

          if (hasStatusChanged) {
            const isOutgate = isOutgateStatus(newStatus);
            const isYard = isYardStatus(newStatus);
            const wasYard = isYardStatus(monitor.status);

            // Verify WhatsApp subscription if waNumber is provided
            let isWaAllowed = true;
            if (monitor.waNumber) {
              const subCheck = await checkWaSubscription(monitor.waNumber, 0);
              isWaAllowed = subCheck.allowed;
            }

            let waSent = true;
            const hasil = isOutgate ? result.timeOut || result.time || "-" : result.time || "-";

            if (monitor.waNumber && isWaAllowed) {
              let waMsg = "";
              if (isOutgate) {
                const wasOb = isOb || monitor.status.includes("(OB)");
                waMsg = wasOb
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
              } else if (isOb && !monitor.status.includes("(OB)")) {
                waMsg = whatsappMessage.changedToOb(
                  monitor.containerNo,
                  monitor.port,
                  result.status || "UNKNOWN",
                  result.ob,
                  result.obName
                );
              } else if (isYard && !wasYard) {
                waMsg = whatsappMessage.statusChangedToGNSTK(
                  monitor.containerNo,
                  monitor.port,
                  result.time || "-",
                  newStatus
                );
              } else {
                waMsg = whatsappMessage.statusChanged(
                  monitor.containerNo,
                  monitor.port,
                  monitor.status,
                  newStatus,
                  result.time || "-"
                );
              }

              try {
                waSent = await sendWhatsappMessage(monitor.waNumber, waMsg);
              } catch (e) {
                console.error(`WhatsApp dispatch failed for container ${monitor.containerNo}:`, e);
                waSent = false;
              }
            }

            if (isYard && !wasYard) {
              const telegramMsg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>${monitor.port.toUpperCase()}</b> has received a yard allocation!\nStatus: <b>${newStatus}</b>\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
              await sendTelegramMessage(telegramMsg).catch((e) =>
                console.error("Telegram error in cron:", e)
              );
            }

            // Update database status ONLY if notification sending succeeded (or if no WA number is set / subscription not allowed)
            if (waSent || !monitor.waNumber || !isWaAllowed) {
              await prisma.terminalMonitor.update({
                where: { id: monitor.id },
                data: {
                  status: newStatus,
                  isActive: !isOutgate,
                  updatedAt: new Date(),
                },
              });

              return {
                type: "container",
                containerNo: monitor.containerNo,
                port: monitor.port,
                status: `Updated to ${newStatus} (isActive: ${!isOutgate})`,
              };
            } else {
              console.warn(
                `[Container Cron] Notification failed for ${monitor.containerNo}. Retaining status in DB to retry on next cron cycle.`
              );
              return {
                type: "container",
                containerNo: monitor.containerNo,
                port: monitor.port,
                status: `Pending notification retry for ${newStatus}`,
              };
            }
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
          // Handle unscheduled vessel monitoring across all 5 ports
          if (vMonitor.port === "all") {
            const multiRes = await searchVesselAllPorts(vMonitor.vesselName);
            const targetVoyage = (vMonitor.voyageIn || vMonitor.voyageOut || "").trim();
            let bestSchedule: VesselScheduleItem | null = null;

            if (targetVoyage) {
              if (multiRes?.vessels && multiRes.vessels.length > 0) {
                bestSchedule =
                  multiRes.vessels.find((item) =>
                    isVoyageMatch(targetVoyage, item.voyIn, item.voyOut)
                  ) || null;
              }
            } else {
              bestSchedule = multiRes?.vessels?.[0] || null;
            }

            if (bestSchedule) {
              const s = bestSchedule;
              const foundPort = (s.port || "npct1").toLowerCase().trim();

              const newOpenStackDate = parseVesselDate(s.openStacking);
              const newEtbDate = parseVesselDate(s.etb);
              const newAtaDate = parseVesselDate(s.ata);
              const newEtdDate = parseVesselDate(s.etd);
              const newAtdDate = parseVesselDate(s.atd);
              const newClosingDocDate = parseVesselDate(s.closingDoc);
              const newClosingPhysicDate = parseVesselDate(s.closingPhysic);

              const isSailingOrCompleted = isVesselSailingOrCompleted(s.status, s.etd);

              await prisma.vesselMonitor.update({
                where: { id: vMonitor.id },
                data: {
                  port: foundPort,
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

              // Dispatch Telegram Alert
              const currentVoy = s.voyIn || s.voyOut || targetVoyage || "N/A";
              const teleMsg = `🚢 <b>KAPAL DITEMUKAN DI ${foundPort.toUpperCase()}!</b> 🚢\n\nVessel: <b>${vMonitor.vesselName}</b>\nVoyage: <b>${currentVoy}</b>\nPort: <b>${foundPort.toUpperCase()}</b>\nStatus: <b>${s.status}</b>\nOpen Stacking: <b>${s.openStacking || "Belum Tersedia"}</b>\nETA: ${s.eta || s.etb || "N/A"}\nETB: ${s.etb || "N/A"}\nETD: ${s.etd || "N/A"}\n\nJadwal kapal yang sebelumnya belum terdaftar kini telah ditemukan dan otomatis aktif dipantau!`;
              await sendTelegramMessage(teleMsg).catch((e) =>
                console.error("Telegram error in multi-port vessel cron:", e)
              );

              // Dispatch WhatsApp Alert
              if (vMonitor.waNumber) {
                const subCheck = await checkWaSubscription(vMonitor.waNumber, 0);
                if (subCheck.allowed) {
                  const waMsg = `🚢 *KAPAL DITEMUKAN DI ${foundPort.toUpperCase()}!* 🚢\n\nKapal: *${vMonitor.vesselName}*\nVoyage: *${currentVoy}*\nPelabuhan: *${foundPort.toUpperCase()}*\nStatus: *${s.status}*\nOpen Stacking: *${s.openStacking || "Belum Tersedia"}*\nETA: *${s.eta || s.etb || "-"}*\nETB: *${s.etb || "-"}*\nETD: *${s.etd || "-"}*\n\nJadwal kapal yang Anda pantau kini telah terdaftar di ${foundPort.toUpperCase()} dan otomatis aktif dipantau oleh sistem CS Eksim Tracker!`;
                  await sendWhatsappMessage(vMonitor.waNumber, waMsg).catch((e) =>
                    console.error("WhatsApp error in multi-port vessel cron:", e)
                  );
                }
              }

              return {
                type: "vessel",
                vesselName: vMonitor.vesselName,
                port: foundPort,
                status: `Discovered schedule at ${foundPort.toUpperCase()} (${s.status}, Voyage: ${currentVoy})`,
              };
            }

            return {
              type: "vessel",
              vesselName: vMonitor.vesselName,
              port: "all",
              status: targetVoyage
                ? `Searching 5 ports (schedule for voyage ${targetVoyage} unconfirmed)`
                : "Searching 5 ports (schedule unconfirmed)",
            };
          }

          const result = await fetchScheduleCached(vMonitor.port, vMonitor.vesselName);
          const targetVoyage = (vMonitor.voyageIn || vMonitor.voyageOut || "").trim();

          let s: VesselScheduleItem | null = null;
          if (result.success && result.schedules && result.schedules.length > 0) {
            if (targetVoyage) {
              s =
                result.schedules.find((item) =>
                  isVoyageMatch(targetVoyage, item.voyIn, item.voyOut)
                ) || null;
            } else {
              s = result.selectedSchedule;
            }
          }

          if (s) {
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
              s.status && (vMonitor.status || "").trim().toUpperCase() !== s.status.trim().toUpperCase()
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

              const currentVoyIn = s.voyIn || vMonitor.voyageIn || "-";
              const currentVoyOut = s.voyOut || vMonitor.voyageOut || "-";
              const voyDisplay = currentVoyIn !== "-" ? currentVoyIn : currentVoyOut;
              const etaDisplay = s.eta || s.etb || "-";
              const etbDisplay = s.etb || "-";
              const etdDisplay = s.etd || "-";
              const openStackDisplay = s.openStacking || "TERSEDIA";

              // RULE: Notifikasi WA & Telegram HANYA dikirim jika ada perubahan Open Stacking
              // (Jika perubahan hanya ETA, ETB, ETD, ATA, ATD, atau Status tanpa perubahan Open Stack, DB diupdate tanpa notif)
              const isOpenStackChange = Boolean(hasNewOpenStack || openStackChanged);

              if (isOpenStackChange) {
                // Send Telegram Alert (lengkap dengan ETA, ETB, ETD, dan Open Stacking)
                const teleHeader = hasNewOpenStack
                  ? `🚢 <b>OPEN STACK TERSEDIA (${vMonitor.port.toUpperCase()})</b> 🚢`
                  : `🚢 <b>OPEN STACK BERUBAH (${vMonitor.port.toUpperCase()})</b> 🚢`;

                const teleMsg = `${teleHeader}\n\nVessel: <b>${vMonitor.vesselName}</b>\nVoyage: <b>${voyDisplay}</b>\nPort: <b>${vMonitor.port.toUpperCase()}</b>\nStatus: <b>${s.status}</b>\n\n📅 <b>Open Stacking:</b> <b>${openStackDisplay}</b>\n🕒 <b>ETA:</b> ${etaDisplay}\n🕒 <b>ETB:</b> ${etbDisplay}\n🕒 <b>ETD:</b> ${etdDisplay}${s.closingPhysic ? `\n⏰ <b>Closing:</b> ${s.closingPhysic}` : ""}`;

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
                          openStackDisplay,
                          etbDisplay,
                          etdDisplay,
                          s.status,
                          vMonitor.port,
                          currentVoyIn,
                          currentVoyOut,
                          etaDisplay,
                          s.closingPhysic || undefined,
                        )
                      : whatsappMessage.openStackUpdatedAlert(
                          vMonitor.vesselName,
                          vMonitor.port,
                          s.status,
                          openStackDisplay,
                          etaDisplay,
                          etbDisplay,
                          etdDisplay,
                          currentVoyIn,
                          currentVoyOut,
                          s.closingPhysic || undefined,
                        );

                    await sendWhatsappMessage(vMonitor.waNumber, waMsg).catch((e) =>
                      console.error("WhatsApp error in vessel cron:", e)
                    );
                  } else {
                    console.log(
                      `Skipping WhatsApp notification for ${vMonitor.waNumber}: subscription expired or suspended`
                    );
                  }
                }
              }

              return {
                type: "vessel",
                vesselName: vMonitor.vesselName,
                port: vMonitor.port,
                status: `Updated (${changesSummary.join(", ")}) [Voyage: ${voyDisplay}]`,
              };
            }

            return {
              type: "vessel",
              vesselName: vMonitor.vesselName,
              port: vMonitor.port,
              status: "Unchanged",
            };
          }

          // Handles case where schedule for this voyage is not listed / cleared / departed
          const currentVoy = targetVoyage || vMonitor.voyageIn || vMonitor.voyageOut || "-";
          const isEtdPast = isVesselSailingOrCompleted(vMonitor.status, vMonitor.etd);

          if (isEtdPast) {
            await prisma.vesselMonitor.update({
              where: { id: vMonitor.id },
              data: {
                status: "SAILED",
                isActive: false,
                updatedAt: new Date(),
              },
            });

            // Dispatch Telegram completion alert
            const teleMsg = `🚢 <b>VESSEL DEPARTED / MONITORING CLOSED (${vMonitor.port.toUpperCase()})</b> 🚢\n\nVessel: <b>${vMonitor.vesselName}</b>\nVoyage: <b>${currentVoy}</b>\nStatus: <b>SAILED / DEPARTED</b>\nJadwal kapal telah selesai dan bertolak dari terminal. Auto-monitoring otomatis dinonaktifkan.`;
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
                  "-",
                  vMonitor.voyageIn || "-",
                  vMonitor.voyageOut || "-"
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
              status: `Deactivated (SAILED / Schedule completed for voyage ${currentVoy})`,
            };
          }

          if (!result.success) {
            return {
              type: "vessel",
              vesselName: vMonitor.vesselName,
              port: vMonitor.port,
              status: `Transient error: ${result.error}`,
            };
          }

          return {
            type: "vessel",
            vesselName: vMonitor.vesselName,
            port: vMonitor.port,
            status: targetVoyage
              ? `Unchanged (Schedule for voyage ${targetVoyage} not listed, retaining active monitoring)`
              : "Unchanged (Schedule unconfirmed, retaining active monitoring)",
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
