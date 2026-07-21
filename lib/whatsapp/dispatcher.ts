import { WhatsappCommandContext } from "./types";
import {
  handleTrackCommand,
  handleListCommand,
  handleHelpCommand,
} from "@/lib/whatsapp/commands";
import { sendWhatsappMessage } from "../whatsapp";
import { whatsappMessage } from "../whatsapp-message";

export async function dispatchWhatsappCommand(context: WhatsappCommandContext) {
  const { text, sender } = context;

  // Split by whitespace
  const rawArgs = text.trim().split(/\s+/);
  if (rawArgs.length === 0 || !rawArgs[0]) return;

  // Normalize command: remove leading '/', lowercase it
  const commandWord = rawArgs[0].replace(/^\//, "").toLowerCase();

  // Route command
  switch (commandWord) {
    case "track":
      await handleTrackCommand(context);
      break;
    case "list":
      await handleListCommand(context);
      break;
    case "help":
      await handleHelpCommand(context);
      break;
    default:
      console.log(`-> Unknown Command: ${commandWord}`);
      await sendWhatsappMessage(sender, whatsappMessage.unknownCommand());
      break;
  }
}
