import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { enableTerminalMonitoring } from "@/actions/monitor-action";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { WhatsappCommandContext } from "../types";

export async function handleTrackCommand(context: WhatsappCommandContext) {
  const { sender, args } = context;

  if (args.length < 3) {
    console.log("-> Error: Invalid format (less than 3 args)");
    await sendWhatsappMessage(sender, whatsappMessage.invalidCommand());
    return;
  }

  const containerNo = args[1].toUpperCase();
  const port = args[2].toLowerCase();
  const vesselName = args[3]?.toUpperCase();
  const voyageNo = args[4]?.toUpperCase();

  // 4. Check NPCT1 requirements
  if (port === "npct1" && (!vesselName || !voyageNo)) {
    console.log("-> Error: NPCT1 missing vessel/voyage");
    await sendWhatsappMessage(sender, whatsappMessage.npctMissingData());
    return;
  }

  // Inform user that tracking has started processing
  console.log("-> Sending initial 'Sedang memeriksa' message...");
  const sentInitial = await sendWhatsappMessage(sender, whatsappMessage.trackingStarted(containerNo, port));
  console.log("-> Initial message sent result:", sentInitial);

  // 5. Call the tracking function
  console.log("-> Calling trackTerminalContainer...");
  const result = await trackTerminalContainer(port, containerNo, vesselName, voyageNo);
  console.log("-> trackTerminalContainer result:", result);

  if (!result.success || !result.status) {
    console.log("-> Error: Tracking failed or status empty");
    await sendWhatsappMessage(
      sender,
      whatsappMessage.trackingFailed(containerNo, port, result.error || "Unknown")
    );
    return;
  }

  // Check if it's already outgate
  const isOutgate = ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some(s => result.status?.toUpperCase().includes(s));
  if (isOutgate) {
    console.log("-> Status is already OUTGATE. Replying and skipping monitor...");
    await sendWhatsappMessage(
      sender,
      whatsappMessage.outgate(result.containerNo, result.port, result.time || "-")
    );
    return;
  }

  // Keep the exact sender ID (which includes @c.us or @g.us)
  // so it can reply to groups or individuals properly.
  const waNumber = sender;

  // 6. Enable Monitoring
  console.log("-> Enabling monitor for", waNumber);
  const monitorRes = await enableTerminalMonitoring(
    result.containerNo,
    result.port,
    result.status,
    waNumber,
    vesselName,
    voyageNo
  );
  console.log("-> enableTerminalMonitoring result:", monitorRes);

  if (monitorRes.success) {
    if (monitorRes.data?.message === "Container is already being monitored.") {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.alreadyMonitoring(result.containerNo, result.port)
      );
    } else {
      // If it's a new monitor, enableTerminalMonitoring will automatically send a confirmation message.
      // We only append the current status here.
      await sendWhatsappMessage(
        sender,
        whatsappMessage.currentStatus(result.containerNo, result.port, result.status)
      );
    }
  } else {
    await sendWhatsappMessage(
      sender,
      whatsappMessage.monitoringFailed(result.containerNo, result.port, result.status, monitorRes.error || "Unknown error")
    );
  }
}
