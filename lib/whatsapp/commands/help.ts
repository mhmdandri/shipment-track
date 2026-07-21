import { WhatsappCommandContext } from "../types";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";

export async function handleHelpCommand(context: WhatsappCommandContext) {
  const { sender } = context;
  await sendWhatsappMessage(sender, whatsappMessage.help());
}
