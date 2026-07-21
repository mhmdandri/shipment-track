import prisma from "@/lib/prisma";
import { WhatsappCommandContext } from "../types";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";

export async function handleStopCommand(context: WhatsappCommandContext) {
  const { sender, args } = context;

  if (args.length < 2) {
    await sendWhatsappMessage(sender, whatsappMessage.invalidCommand());
    return;
  }

  const containerNo = args[1].toUpperCase();

  try {
    // Find active monitor that belongs to this sender
    const monitor = await prisma.terminalMonitor.findFirst({
      where: {
        containerNo,
        waNumber: sender,
        isActive: true,
      },
    });

    if (!monitor) {
      await sendWhatsappMessage(sender, whatsappMessage.stopFailed());
      return;
    }

    // Set to inactive
    await prisma.terminalMonitor.update({
      where: { id: monitor.id },
      data: { isActive: false },
    });

    await sendWhatsappMessage(sender, whatsappMessage.stopSuccess());
  } catch (error) {
    console.error("Error stopping monitor:", error);
    await sendWhatsappMessage(sender, "❌ Error processing stop command.");
  }
}
