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

  // Find the port index (jict, npct1, koja, tmal)
  const knownPorts = ["jict", "npct1", "koja", "tmal"];
  let portIndex = -1;
  for (let i = 1; i < args.length; i++) {
    if (knownPorts.includes(args[i].toLowerCase().replace(/,/g, ""))) {
      portIndex = i;
      break;
    }
  }

  if (portIndex === -1 || portIndex === 1) {
    console.log("-> Error: Port not found or no containers specified");
    await sendWhatsappMessage(sender, whatsappMessage.invalidCommand());
    return;
  }

  // Parse containers (everything between "track" and the port)
  // Join them by space, then split by comma or space to get individual container numbers
  const containerString = args.slice(1, portIndex).join(" ");
  const containers = containerString
    .split(/[\s,]+/)
    .map(c => c.trim().toUpperCase())
    .filter(c => c.length > 0);

  const port = args[portIndex].toLowerCase().replace(/,/g, "");
  const vesselName = args[portIndex + 1]?.toUpperCase();
  const voyageNo = args[portIndex + 2]?.toUpperCase();

  // Check NPCT1 requirements
  if (port === "npct1" && (!vesselName || !voyageNo)) {
    console.log("-> Error: NPCT1 missing vessel/voyage");
    await sendWhatsappMessage(sender, whatsappMessage.npctMissingData());
    return;
  }

  // Send initial message
  if (containers.length > 1) {
    console.log(`-> Sending initial 'Sedang memeriksa ${containers.length} kontainer' message...`);
    await sendWhatsappMessage(sender, whatsappMessage.trackingMultiStarted(containers.length, port));
  } else {
    console.log("-> Sending initial 'Sedang memeriksa' message...");
    await sendWhatsappMessage(sender, whatsappMessage.trackingStarted(containers[0], port));
  }

  // Process all containers sequentially or concurrently
  for (const containerNo of containers) {
    console.log(`-> Calling trackTerminalContainer for ${containerNo}...`);
    const result = await trackTerminalContainer(port, containerNo, vesselName, voyageNo);
    console.log(`-> trackTerminalContainer result for ${containerNo}:`, result);

    if (!result.success || !result.status) {
      console.log(`-> Error: Tracking failed for ${containerNo}`);
      await sendWhatsappMessage(
        sender,
        whatsappMessage.trackingFailed(containerNo, port, result.error || "Unknown")
      );
      continue;
    }

    // Check if it's already outgate
    const isOutgate = ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some(s => result.status?.toUpperCase().includes(s));
    if (isOutgate) {
      console.log(`-> Status is already OUTGATE for ${containerNo}. Replying and skipping monitor...`);
      await sendWhatsappMessage(
        sender,
        whatsappMessage.outgate(result.containerNo, result.port, result.time || "-")
      );
      continue;
    }

    // Enable Monitoring
    console.log(`-> Enabling monitor for ${containerNo} via ${sender}`);
    const monitorRes = await enableTerminalMonitoring(
      result.containerNo,
      result.port,
      result.status,
      sender,
      vesselName,
      voyageNo
    );
    console.log(`-> enableTerminalMonitoring result for ${containerNo}:`, monitorRes);

    if (!monitorRes.success) {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.monitoringFailed(result.containerNo, result.port, result.status, monitorRes.error || "Unknown error")
      );
    }
  }
}
