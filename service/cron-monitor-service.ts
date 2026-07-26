import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { trackVesselSchedule } from "@/actions/tracking/vessel";
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
 * Checks yard allocation (GNSTK) and Outgate status, updates DB & dispatches alerts.
 */
export async function processContainerMonitors(): Promise<CronProcessingResult[]> {
  const activeMonitors = await prisma.terminalMonitor.findMany({
    where: { isActive: true },
  });

  const results: CronProcessingResult[] = [];

  for (const monitor of activeMonitors) {
    const result = await trackTerminalContainer(
      monitor.port,
      monitor.containerNo,
      monitor.vesselName || undefined,
      monitor.voyageNo || undefined
    );

    const isOb =
      (result.ob?.length ?? 0) > 0 &&
      ((result.ob?.toUpperCase().includes("PLP") ||
        result.ob?.toUpperCase().includes("OBX")) ??
        false);
    let newStatus = result.status || "UNKNOWN";

    if (isOb && !newStatus.includes("(OB)")) {
      newStatus = `${newStatus} (OB)`;
    }

    if (
      result.success &&
      newStatus !== monitor.status &&
      newStatus !== "UNKNOWN"
    ) {
      const upperStatus = newStatus.toUpperCase();
      const isOutgate =
        ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some((s) =>
          upperStatus.includes(s)
        ) && !upperStatus.includes("PLANNING");

      await prisma.terminalMonitor.update({
        where: { id: monitor.id },
        data: {
          status: newStatus,
          isActive: !isOutgate,
          updatedAt: new Date(),
        },
      });

      if (
        newStatus.startsWith("GNSTK") &&
        !monitor.status.startsWith("GNSTK")
      ) {
        const telegramMsg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>${monitor.port.toUpperCase()}</b> has received a yard allocation!\nStatus: <b>${newStatus}</b>\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
        await sendTelegramMessage(telegramMsg);
      }

      const hasil = isOutgate ? result.timeOut || "-" : result.time || "-";
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
          await sendWhatsappMessage(monitor.waNumber, waMsg);
        } else if (isOb) {
          const waMsg = whatsappMessage.changedToOb(
            monitor.containerNo,
            monitor.port,
            result.status || "UNKNOWN",
            result.ob,
            result.obName
          );
          await sendWhatsappMessage(monitor.waNumber, waMsg);
        } else if (newStatus.startsWith("GNSTK")) {
          const waMsg = whatsappMessage.statusChangedToGNSTK(
            monitor.containerNo,
            monitor.port,
            result.time || "-"
          );
          await sendWhatsappMessage(monitor.waNumber, waMsg);
        } else {
          const waMsg = whatsappMessage.statusChanged(
            monitor.containerNo,
            monitor.port,
            monitor.status,
            newStatus,
            result.time || "-"
          );
          await sendWhatsappMessage(monitor.waNumber, waMsg);
        }
      }

      results.push({
        type: "container",
        containerNo: monitor.containerNo,
        port: monitor.port,
        status: `Updated to ${newStatus} (isActive: ${!isOutgate})`,
      });
    } else {
      results.push({
        type: "container",
        containerNo: monitor.containerNo,
        port: monitor.port,
        status: result.status || "Unchanged",
      });
    }
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

  for (const vMonitor of activeVesselMonitors) {
    const result = await trackVesselSchedule(vMonitor.port, vMonitor.vesselName);
    if (result.success && result.selectedSchedule) {
      const s = result.selectedSchedule;
      const oldOpenStackStr = vMonitor.openStacking
        ? vMonitor.openStacking.toISOString()
        : null;

      const parseDate = (dStr: string | null | undefined) => {
        if (!dStr) return null;
        const d = new Date(dStr.replace(/-/g, "/"));
        return isNaN(d.getTime()) ? null : d;
      };

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
          await sendTelegramMessage(teleMsg);

          if (vMonitor.waNumber) {
            const waMsg = whatsappMessage.npct1OpenStackAvailableAlert(
              vMonitor.vesselName,
              s.openStacking || "TERSEDIA",
              s.etb || "-",
              s.etd || "-",
              s.status,
              vMonitor.port
            );
            await sendWhatsappMessage(vMonitor.waNumber, waMsg);
          }
        }

        results.push({
          type: "vessel",
          vesselName: vMonitor.vesselName,
          port: vMonitor.port,
          status: `OpenStack updated: ${s.openStacking || "N/A"}`,
        });
      } else {
        results.push({
          type: "vessel",
          vesselName: vMonitor.vesselName,
          port: vMonitor.port,
          status: "Unchanged",
        });
      }
    }
  }

  return results;
}
