import prisma from "@/lib/prisma";
import { WhatsappCommandContext } from "../types";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";

export async function handleListCommand(context: WhatsappCommandContext) {
  const { sender } = context;

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
