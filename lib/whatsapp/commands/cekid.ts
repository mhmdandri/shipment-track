import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { WhatsappCommandContext } from "../types";

export async function handleCekIdCommand(context: WhatsappCommandContext) {
  const { sender } = context;
  console.log(`-> /cekid requested by ${sender}`);
  await sendWhatsappMessage(sender, whatsappMessage.cekId(sender));
}
