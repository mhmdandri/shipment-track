import { searchVesselAllPorts } from "@/actions/tracking/vessel";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import { checkWaSubscription } from "@/lib/whatsapp/subscription";
import { WhatsappCommandContext } from "../types";

export async function handleCekPortCommand(context: WhatsappCommandContext) {
  const { sender, alternateSender, args } = context;

  // Expected format: /cekport <vesselName> or /port <vesselName>
  if (args.length < 2) {
    console.log("-> Error: /cekport missing vessel name");
    await sendWhatsappMessage(
      sender,
      `❌ *Format Perintah Salah*\n\nGunakan format:\n/cekport <Nama Kapal>\n\nContoh:\n/cekport SKY PRIDE`,
    );
    return;
  }

  const vesselName = args.slice(1).join(" ").trim().toUpperCase();
  if (!vesselName) {
    await sendWhatsappMessage(
      sender,
      `❌ *Format Perintah Salah*\n\nMohon sertakan nama kapal.`,
    );
    return;
  }

  if (vesselName.length > 100) {
    await sendWhatsappMessage(
      sender,
      `❌ *Format Perintah Salah*\n\nNama kapal terlalu panjang (maksimal 100 karakter).`,
    );
    return;
  }

  // Check subscription before proceeding
  const subCheck = await checkWaSubscription(sender, 0, alternateSender);
  if (!subCheck.allowed) {
    if (subCheck.status === "NOT_FOUND") {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.subscriptionRequired(sender),
      );
    } else if (subCheck.status === "EXPIRED" && subCheck.subscription) {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.subscriptionExpired(subCheck.subscription.expiredAt),
      );
    } else if (subCheck.status === "SUSPENDED") {
      await sendWhatsappMessage(
        sender,
        whatsappMessage.subscriptionSuspended(),
      );
    }
    return;
  }

  await sendWhatsappMessage(
    sender,
    `🔍 *Mencari Jadwal Kapal "${vesselName}"*\n\nSedang mengecek di JICT, NPCT1, KOJA, TMAL, dan TER3...`,
  );

  try {
    const result = await searchVesselAllPorts(vesselName);
    const message = whatsappMessage.vesselMultiPortResult(
      result.vesselNameQuery,
      result.vessels,
    );
    await sendWhatsappMessage(sender, message);
  } catch (error) {
    console.error("Error handling /cekport command:", error);
    await sendWhatsappMessage(
      sender,
      `❌ Gagal mencari jadwal kapal "${vesselName}". Terjadi kesalahan server.`,
    );
  }
}
