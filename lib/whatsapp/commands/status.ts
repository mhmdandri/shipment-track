import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { isOutgateStatus, isYardStatus, isObType } from "@/actions/tracking/utils";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { checkWaSubscription } from "@/lib/whatsapp/subscription";
import { WhatsappCommandContext } from "../types";

export async function handleStatusCommand(context: WhatsappCommandContext) {
  const { sender, alternateSender, args } = context;

  // Extract all container numbers (split by whitespace, comma, newline, or semicolon)
  const rawInput = args.slice(1).join(" ");
  const containerNos = Array.from(
    new Set(
      rawInput
        .split(/[\s,;\n]+/)
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length >= 4 && c.length <= 15)
    )
  );

  if (containerNos.length === 0) {
    console.log("-> Error /status: Container number missing");
    await sendWhatsappMessage(sender, whatsappMessage.invalidStatusCommand());
    return;
  }

  // Check subscription before proceeding
  const subCheck = await checkWaSubscription(sender, 0, alternateSender);
  if (!subCheck.allowed) {
    if (subCheck.status === "NOT_FOUND") {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.subscriptionRequired(sender)
      );
    } else if (subCheck.status === "EXPIRED" && subCheck.subscription) {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.subscriptionExpired(subCheck.subscription.expiredAt)
      );
    } else if (subCheck.status === "SUSPENDED") {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.subscriptionSuspended()
      );
    }
    return;
  }

  // ----------------------------------------------------
  // Single Container Flow
  // ----------------------------------------------------
  if (containerNos.length === 1) {
    const containerNo = containerNos[0];
    try {
      const monitor = await prisma.terminalMonitor.findUnique({
        where: { containerNo },
      });

      if (!monitor) {
        console.log(`-> Info /status: Container ${containerNo} not found in TerminalMonitor`);
        await sendWhatsappMessage(
          sender,
          whatsappMessage.containerNotFoundForStatus(containerNo)
        );
        return;
      }

      console.log(
        `-> Fetching realtime status for ${containerNo} at port ${monitor.port}...`
      );

      const result = await trackTerminalContainer(
        monitor.port,
        monitor.containerNo,
        monitor.vesselName || undefined,
        monitor.voyageNo || undefined
      );

      if (!result.success || !result.status) {
        console.log(`-> Error /status: Realtime fetch failed for ${containerNo}`);
        await sendWhatsappMessage(
          sender,
          whatsappMessage.statusFetchFailed(
            monitor.containerNo,
            monitor.port,
            monitor.status,
            result.error || "Gagal menghubungi server terminal"
          )
        );
        return;
      }

      const isOb = isObType(result.ob);
      let newStatus = result.status;
      if (isOb && !newStatus.includes("(OB)")) {
        newStatus = `${newStatus} (OB)`;
      }

      const isOutgate = isOutgateStatus(newStatus);
      let currentIsActive = monitor.isActive;
      if (isOutgate && currentIsActive) {
        currentIsActive = false;
      }

      if (newStatus !== monitor.status || currentIsActive !== monitor.isActive) {
        await prisma.terminalMonitor.update({
          where: { id: monitor.id },
          data: {
            status: newStatus,
            isActive: currentIsActive,
            updatedAt: new Date(),
          },
        });
      }

      const checkTime = result.timeOut || result.time || new Date().toLocaleString("id-ID");

      const message = whatsappMessage.statusRealtime(
        monitor.containerNo,
        monitor.port,
        newStatus,
        checkTime,
        currentIsActive,
        monitor.vesselName || undefined,
        monitor.voyageNo || undefined,
        result.obName || result.ob
      );

      await sendWhatsappMessage(sender, message);
    } catch (error) {
      console.error(`-> Exception in /status command for ${containerNo}:`, error);
      await sendWhatsappMessage(
        sender,
        `❌ *Error Status Check*\n\nTerjadi kesalahan saat memeriksa status kontainer *${containerNo}*.`
      );
    }
    return;
  }

  // ----------------------------------------------------
  // Multi Container Flow
  // ----------------------------------------------------
  const MAX_MULTI = 10;
  const targetContainers = containerNos.slice(0, MAX_MULTI);

  await sendWhatsappMessage(
    sender,
    `🔍 *Mengecek Status Realtime ${targetContainers.length} Kontainer...*\n\n` +
      (containerNos.length > MAX_MULTI
        ? `⚠️ *Catatan:* Maksimal ${MAX_MULTI} kontainer per pengecekan.`
        : "")
  );

  try {
    const fetchResults = await Promise.allSettled(
      targetContainers.map(async (containerNo) => {
        const monitor = await prisma.terminalMonitor.findUnique({
          where: { containerNo },
        });

        if (!monitor) {
          return {
            containerNo,
            found: false,
            error: "Belum terdaftar di watchlist",
          };
        }

        const result = await trackTerminalContainer(
          monitor.port,
          monitor.containerNo,
          monitor.vesselName || undefined,
          monitor.voyageNo || undefined
        );

        if (!result.success || !result.status) {
          return {
            containerNo,
            found: true,
            port: monitor.port,
            lastStatus: monitor.status,
            error: result.error || "Gagal query server terminal",
            isFetchFailed: true,
          };
        }

        const isOb = isObType(result.ob);
        let newStatus = result.status;
        if (isOb && !newStatus.includes("(OB)")) {
          newStatus = `${newStatus} (OB)`;
        }

        const isOutgate = isOutgateStatus(newStatus);
        let currentIsActive = monitor.isActive;
        if (isOutgate && currentIsActive) {
          currentIsActive = false;
        }

        if (newStatus !== monitor.status || currentIsActive !== monitor.isActive) {
          await prisma.terminalMonitor.update({
            where: { id: monitor.id },
            data: {
              status: newStatus,
              isActive: currentIsActive,
              updatedAt: new Date(),
            },
          });
        }

        const checkTime =
          result.timeOut || result.time || new Date().toLocaleString("id-ID");

        return {
          containerNo,
          found: true,
          port: monitor.port,
          status: newStatus,
          time: checkTime,
          isActive: currentIsActive,
          vesselName: monitor.vesselName || undefined,
          voyageNo: monitor.voyageNo || undefined,
          obName: result.obName || result.ob,
        };
      })
    );

    let reportMsg = `📊 *HASIL CEK STATUS KONTAINER* (${targetContainers.length} Kontainer)\n\n`;

    fetchResults.forEach((res, index) => {
      if (res.status === "fulfilled") {
        const data = res.value;
        reportMsg += `*${index + 1}. 📦 ${data.containerNo}*\n`;
        if (!data.found) {
          reportMsg += `❌ Status: *Belum terdaftar di watchlist*\n`;
          reportMsg += `_Ketik \`/track ${data.containerNo} <terminal>\` untuk mendaftar_\n\n`;
        } else if (data.isFetchFailed) {
          reportMsg += `📍 Terminal: *${(data.port || "").toUpperCase()}*\n`;
          reportMsg += `⚠️ Status Terakhir: *${data.lastStatus || "-"}*\n`;
          reportMsg += `❗ Detail: ${data.error}\n\n`;
        } else {
          let emoji = "🟡";
          if (isYardStatus(data.status!)) emoji = "🟢";
          if (isOutgateStatus(data.status!)) emoji = "🏁";
          if ((data.status! || "").toUpperCase().includes("(OB)")) emoji = "🚨";

          reportMsg += `📍 Terminal: *${(data.port || "").toUpperCase()}*\n`;
          if (data.vesselName) {
            reportMsg += `🚢 Vessel: ${data.vesselName}${data.voyageNo ? ` (${data.voyageNo})` : ""}\n`;
          }
          if (data.obName) {
            reportMsg += `🏢 Gudang OB: ${data.obName}\n`;
          }
          reportMsg += `📊 Status: ${emoji} *${data.status}*\n`;
          reportMsg += `🕒 Waktu: ${data.time}\n`;
          reportMsg += `📌 Monitor: ${data.isActive ? "✅ *Aktif*" : "⚪ *Selesai / Non-aktif*"}\n\n`;
        }
      } else {
        reportMsg += `*${index + 1}. 📦 ${targetContainers[index]}*\n`;
        reportMsg += `❌ Error: Terjadi kesalahan saat memeriksa status.\n\n`;
      }
    });

    await sendWhatsappMessage(sender, reportMsg.trim());
  } catch (error) {
    console.error("-> Exception in multi /status command:", error);
    await sendWhatsappMessage(
      sender,
      `❌ *Error Status Check*\n\nTerjadi kesalahan saat memeriksa status multi kontainer.`
    );
  }
}

