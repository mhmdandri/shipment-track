import prisma from "@/lib/prisma";
import { WhatsappCommandContext } from "../types";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { checkWaSubscription } from "@/lib/whatsapp/subscription";

export async function handleListCommand(context: WhatsappCommandContext) {
  const { sender } = context;

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
    const monitors = await prisma.terminalMonitor.findMany({
      where: {
        waNumber: sender,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const mappedItems = monitors.map((m) => ({
      containerNo: m.containerNo,
      port: m.port,
      status: m.status,
    }));

    const message = whatsappMessage.listTrack(monitors.length, mappedItems);
    await sendWhatsappMessage(sender, message);
  } catch (error) {
    console.error("Error fetching list:", error);
    await sendWhatsappMessage(sender, "❌ Error retrieving list.");
  }
}
