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
import { checkWaSubscription } from "./subscription";
import { askGeminiAI } from "@/lib/gemini";

export async function dispatchWhatsappCommand(context: WhatsappCommandContext) {
  const { text, sender, alternateSender, payload } = context;

  const rawArgs = text.trim().split(/\s+/);
  if (rawArgs.length === 0 || !rawArgs[0]) return;

  // 1. Process slash commands (/track, /status, /openstack, etc.)
  if (rawArgs[0].startsWith("/")) {
    const commandWord = rawArgs[0].replace(/^\//, "").toLowerCase();

    switch (commandWord) {
      case "track":
        await handleTrackCommand(context);
        return;
      case "openstack":
        await handleOpenStackCommand(context);
        return;
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
        return;
      }
      case "status":
        await handleStatusCommand(context);
        return;
      case "list":
        await handleListCommand(context);
        return;
      case "cekid":
      case "id":
        await handleCekIdCommand(context);
        return;
      case "help":
        await handleHelpCommand(context);
        return;
      default:
        console.log(`-> Unknown Command: ${commandWord}`);
        await sendWhatsappMessage(sender, whatsappMessage.unknownCommand());
        return;
    }
  }

  // 2. Handle Non-Command Messages via Gemini AI (Personal Chat or Bot Tagged in Group)
  const isPersonal = sender.endsWith("@c.us");
  const isGroup = sender.endsWith("@g.us");

  const rawPayload = payload as Record<string, unknown> | undefined;
  const rawData = rawPayload?._data as Record<string, unknown> | undefined;
  const mentionedJidList = (rawPayload?.mentionedJidList || rawData?.mentionedJidList) as
    | string[]
    | undefined;

  const isBotTaggedInGroup =
    isGroup &&
    ((Array.isArray(mentionedJidList) && mentionedJidList.length > 0) ||
      text.includes("@"));

  if (isPersonal || isBotTaggedInGroup) {
    // Verify WhatsApp Subscription access
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

    // Clean @mentions from prompt string if tagged in group
    const cleanPrompt = text.replace(/@\d+(@c\.us)?/g, "").trim();
    if (!cleanPrompt) return;

    console.log(`-> Routing prompt to Gemini AI from ${sender}: "${cleanPrompt}"`);
    const aiResponse = await askGeminiAI(cleanPrompt);
    await sendWhatsappMessage(sender, aiResponse);
  }
}
