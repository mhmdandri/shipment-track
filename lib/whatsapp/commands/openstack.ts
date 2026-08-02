import { trackVesselSchedule } from "@/actions/tracking/vessel";
import { enableVesselMonitoringAction } from "@/actions/vessel-action";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { checkWaSubscription } from "@/lib/whatsapp/subscription";
import { WhatsappCommandContext } from "../types";

export async function handleOpenStackCommand(context: WhatsappCommandContext) {
  const { sender, alternateSender, args } = context;

  // Expected format: /openstack <vesselName> [port] or /vessel <vesselName> [port]
  if (args.length < 2) {
    console.log("-> Error: OpenStack missing vessel name");
    await sendWhatsappMessage(
      sender,
      `❌ *Format Perintah Salah*\n\nGunakan format:\n/openstack <Nama Kapal> [Terminal]\n\nContoh:\n/openstack JOSEPHINE MAERSK NPCT1`
    );
    return;
  }

  const knownPorts = ["npct1", "jict", "koja", "tmal", "ter3", "parama"];
  let vesselWords = args.slice(1);

  const lastArg = vesselWords[vesselWords.length - 1]?.toLowerCase();
  if (!lastArg || !knownPorts.includes(lastArg)) {
    await sendWhatsappMessage(
      sender,
      `❌ *Format Perintah Salah*\n\nMohon sertakan nama terminal pelabuhan.\n\nFormat:\n/openstack <Nama Kapal> <Terminal>\n\nTerminal yang didukung:\n• JICT\n• NPCT1\n• KOJA\n• TMAL\n• TER3\n\nContoh:\n/openstack JOSEPHINE MAERSK NPCT1\n/openstack SKY PRIDE JICT`
    );
    return;
  }

  const port = lastArg === "parama" ? "ter3" : lastArg;
  vesselWords = vesselWords.slice(0, -1);

  const vesselName = vesselWords.join(" ").trim().replace(/\s+/g, " ").toUpperCase();
  if (!vesselName) {
    await sendWhatsappMessage(
      sender,
      `❌ *Format Perintah Salah*\n\nMohon sertakan nama kapal.`
    );
    return;
  }

  // Strict Subscription Check
  const subCheck = await checkWaSubscription(sender, 1, alternateSender);
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
      await sendWhatsappMessage(sender, whatsappMessage.subscriptionSuspended());
    } else if (
      subCheck.status === "QUOTA_EXCEEDED" &&
      subCheck.activeContainersCount !== undefined &&
      subCheck.maxContainers !== undefined
    ) {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.quotaExceeded(
          subCheck.activeContainersCount,
          subCheck.maxContainers
        )
      );
    }
    return;
  }

  await sendWhatsappMessage(
    sender,
    `🔍 *Mengecek Open Stack ${port.toUpperCase()}*\n\nSedang mencari jadwal kapal *${vesselName}*...`
  );

  const result = await trackVesselSchedule(port, vesselName);

  if (!result.success || !result.selectedSchedule) {
    await sendWhatsappMessage(
      sender,
      `❌ *Jadwal Kapal Tidak Ditemukan*\n\nKapal: *${vesselName}*\nTerminal: *${port.toUpperCase()}*\n\nDetail:\n${
        result.error || `Data tidak ditemukan di vessel schedule ${port.toUpperCase()}.`
      }`
    );
    return;
  }

  const s = result.selectedSchedule;
  const replyMsg = whatsappMessage.npct1OpenStackResult(
    s.vessel,
    s.line,
    s.voyIn,
    s.voyOut,
    s.status,
    s.openStacking || "BELUM TERSEDIA",
    s.etb || "-",
    s.etd || "-",
    s.closingPhysic || "-",
    port
  );

  await sendWhatsappMessage(sender, replyMsg);

  // Auto-enable monitoring for this vessel
  await enableVesselMonitoringAction(vesselName, port, sender);
}
