import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { checkWaSubscription } from "@/lib/whatsapp/subscription";
import { WhatsappCommandContext } from "../types";

export async function handleStatusCommand(context: WhatsappCommandContext) {
  const { sender, args } = context;

  if (args.length < 2 || !args[1]) {
    console.log("-> Error /status: Container number missing");
    await sendWhatsappMessage(sender, whatsappMessage.invalidStatusCommand());
    return;
  }

  const containerNo = args[1].trim().toUpperCase();

  // Check subscription before proceeding
  const subCheck = await checkWaSubscription(sender, 0);
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

    const isOb =
      (result.ob?.length ?? 0) > 0 &&
      ((result.ob?.toUpperCase().includes("PLP") ||
        result.ob?.toUpperCase().includes("OBX")) ??
        false);

    let newStatus = result.status;
    if (isOb && !newStatus.includes("(OB)")) {
      newStatus = `${newStatus} (OB)`;
    }

    const upperStatus = newStatus.toUpperCase();
    const isOutgate =
      ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some((s) =>
        upperStatus.includes(s)
      ) && !upperStatus.includes("PLANNING");

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
}
