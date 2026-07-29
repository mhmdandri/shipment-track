import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { trackVesselSchedule, parseVesselDateMs } from "@/actions/tracking/vessel";
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

/**
 * Processes active vessel schedule & open stack monitors across all ports (NPCT1, JICT, etc.).
 * Checks open stack date availability, updates DB & dispatches alerts.
 */
export async function processVesselMonitors(): Promise<CronProcessingResult[]> {
  const activeVesselMonitors = await prisma.vesselMonitor.findMany({
    where: { isActive: true },
  });

  const results: CronProcessingResult[] = [];
  const chunkSize = 5;

  const parseDate = (dStr: string | null | undefined): Date | null => {
    const ms = parseVesselDateMs(dStr);
    return ms > 0 ? new Date(ms) : null;
  };

  for (let i = 0; i < activeVesselMonitors.length; i += chunkSize) {
    const chunk = activeVesselMonitors.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (vMonitor): Promise<CronProcessingResult> => {
        try {
          const result = await trackVesselSchedule(vMonitor.port, vMonitor.vesselName);
          if (result.success && result.selectedSchedule) {
            const s = result.selectedSchedule;
            const oldOpenStackStr = vMonitor.openStacking
              ? vMonitor.openStacking.toISOString()
              : null;

            const newOpenStackDate = parseDate(s.openStacking);
            const newOpenStackStr = newOpenStackDate
              ? newOpenStackDate.toISOString()
              : null;

            const hasNewOpenStack = Boolean(!oldOpenStackStr && newOpenStackStr);
            const openStackChanged = Boolean(
              oldOpenStackStr &&
                newOpenStackStr &&
                oldOpenStackStr !== newOpenStackStr
            );

            const statusUpper = s.status.trim().toUpperCase();
            const isSailingOrCompleted = [
              "SAILING",
              "SAILED",
              "COMPLETE",
              "COMPLETED",
              "FINISH",
              "FINISHED",
              "DEPARTED",
              "DEPARTURE",
              "LEAVING",
              "OUTGT",
            ].some((keyword) => statusUpper.includes(keyword));

            if (
              hasNewOpenStack ||
              openStackChanged ||
              s.status !== vMonitor.status ||
              isSailingOrCompleted
            ) {
              await prisma.vesselMonitor.update({
                where: { id: vMonitor.id },
                data: {
                  status: s.status,
                  line: s.line || vMonitor.line,
                  voyageIn: s.voyIn || vMonitor.voyageIn,
                  voyageOut: s.voyOut || vMonitor.voyageOut,
                  service: s.service || vMonitor.service,
                  etb: parseDate(s.etb),
                  ata: parseDate(s.ata),
                  etd: parseDate(s.etd),
                  atd: parseDate(s.atd),
                  openStacking: newOpenStackDate,
                  closingDoc: parseDate(s.closingDoc),
                  closingPhysic: parseDate(s.closingPhysic),
                  isActive: !isSailingOrCompleted,
                  updatedAt: new Date(),
                },
              });

              if (hasNewOpenStack || openStackChanged) {
                const teleMsg = `🚢 <b>OPEN STACK AVAILABLE (${vMonitor.port.toUpperCase()})</b> 🚢\n\nVessel: <b>${vMonitor.vesselName}</b>\nOpen Stacking: <b>${s.openStacking}</b>\nETB: ${s.etb || "N/A"}\nETD: ${s.etd || "N/A"}`;
                await sendTelegramMessage(teleMsg).catch((e) =>
                  console.error("Telegram error in vessel cron:", e)
                );

                if (vMonitor.waNumber) {
                  const waMsg = whatsappMessage.npct1OpenStackAvailableAlert(
                    vMonitor.vesselName,
                    s.openStacking || "TERSEDIA",
                    s.etb || "-",
                    s.etd || "-",
                    s.status,
                    vMonitor.port
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
                status: `OpenStack updated: ${s.openStacking || "N/A"}`,
              };
            }

            return {
              type: "vessel",
              vesselName: vMonitor.vesselName,
              port: vMonitor.port,
              status: "Unchanged",
            };
          }

          return {
            type: "vessel",
            vesselName: vMonitor.vesselName,
            port: vMonitor.port,
            status: "No schedule found",
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
