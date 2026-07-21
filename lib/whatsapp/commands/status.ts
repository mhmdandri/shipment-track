import { WhatsappCommandContext } from "../types";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { trackTerminalContainer } from "@/actions/terminal-track-action";

export async function handleStatusCommand(context: WhatsappCommandContext) {
  const { sender, args } = context;

  if (args.length < 3) {
    await sendWhatsappMessage(sender, whatsappMessage.invalidCommand());
    return;
  }

  const containerNo = args[1].toUpperCase();
  const port = args[2].toLowerCase();
  const vesselName = args[3]?.toUpperCase();
  const voyageNo = args[4]?.toUpperCase();

  if (port === "npct1" && (!vesselName || !voyageNo)) {
    await sendWhatsappMessage(sender, whatsappMessage.npctMissingData());
    return;
  }

  await sendWhatsappMessage(sender, "Memeriksa status saat ini...");

  const result = await trackTerminalContainer(port, containerNo, vesselName, voyageNo);

  if (!result.success || !result.status) {
    await sendWhatsappMessage(
      sender,
      `❌ Gagal memeriksa status: ${result.error || "Unknown"}`
    );
    return;
  }

  await sendWhatsappMessage(
    sender,
    whatsappMessage.statusResult(result.containerNo, result.port, result.status, result.time || "-")
  );
}
