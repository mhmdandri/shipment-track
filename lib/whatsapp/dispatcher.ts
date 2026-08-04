import { WhatsappCommandContext } from "./types";
import {
  handleTrackCommand,
  handleListCommand,
  handleHelpCommand,
  handleStatusCommand,
  handleCekIdCommand,
  handleOpenStackCommand,
  handleCekPortCommand,
} from "@/lib/whatsapp/commands";
import { sendWhatsappMessage } from "../whatsapp";
import { whatsappMessage } from "../whatsapp-message";

export async function dispatchWhatsappCommand(context: WhatsappCommandContext): Promise<void> {
  const { sender, args } = context;
  const rawArgs = args && args.length > 0 ? args : context.text.trim().split(/\s+/);
  if (rawArgs.length === 0 || !rawArgs[0]) return;

  // Require commands to start with "/"
  if (!rawArgs[0].startsWith("/")) return;

  // Normalize command: remove leading '/', lowercase it
  const commandWord = rawArgs[0].replace(/^\//, "").toLowerCase();

  // Route command
  switch (commandWord) {
    case "track":
      await handleTrackCommand(context);
      break;
    case "openstack":
      await handleOpenStackCommand(context);
      break;
    case "vessel":
    case "cekport":
    case "port": {
      const knownPorts = ["npct1", "jict", "koja", "tmal", "ter3", "parama"];
      const lastArg = rawArgs[rawArgs.length - 1]?.toLowerCase();
      if (rawArgs.length > 2 && knownPorts.includes(lastArg)) {
        await handleOpenStackCommand(context);
      } else {
        await handleCekPortCommand(context);
      }
      break;
    }
    case "status":
      await handleStatusCommand(context);
      break;
    case "list":
      await handleListCommand(context);
      break;
    case "cekid":
    case "id":
      await handleCekIdCommand(context);
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
