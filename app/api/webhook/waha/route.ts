import { NextResponse } from "next/server";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { enableTerminalMonitoring } from "@/actions/monitor-action";
import { sendWhatsappMessage } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Ensure the event is a message event
    // WAHA uses event names like "message", "message.any"
    const isMessageEvent = body?.event && String(body.event).startsWith("message");
    if (!isMessageEvent || !body?.payload) {
      return NextResponse.json({ success: true, message: "Ignored non-message event" });
    }

    const payload = body.payload;

    // 2. Ignore messages sent by the bot itself to prevent infinite loops
    if (payload.fromMe === true) {
      return NextResponse.json({ success: true, message: "Ignored self message" });
    }

    const text = payload.body || "";
    const sender = payload.from || "";

    if (!text || !sender) {
      return NextResponse.json({ success: true, message: "Ignored empty message" });
    }

    // 3. Command format: track <ContainerNo> <Port> [VesselCode] [VoyageNo]
    const args = text.trim().split(/\s+/);
    if (args[0].toLowerCase() !== "track") {
      // Not a track command, just ignore
      return NextResponse.json({ success: true, message: "Not a track command" });
    }

    if (args.length < 3) {
      await sendWhatsappMessage(
        sender,
        "❌ *Format Salah*\n\nGunakan format:\n`track <NoContainer> <Port>`\n\nContoh: `track EMCU6137410 JICT`\n\nUntuk NPCT1:\n`track <NoContainer> NPCT1 <VesselCode> <VoyageNo>`"
      );
      return NextResponse.json({ success: true, message: "Invalid format" });
    }

    const containerNo = args[1].toUpperCase();
    const port = args[2].toLowerCase();
    const vesselName = args[3]?.toUpperCase();
    const voyageNo = args[4]?.toUpperCase();

    // 4. Check NPCT1 requirements
    if (port === "npct1" && (!vesselName || !voyageNo)) {
      await sendWhatsappMessage(
        sender,
        "❌ *NPCT1 Butuh Data Kapal*\n\nUntuk port NPCT1, mohon sertakan Vessel Code dan Voyage No.\n\nContoh:\n`track EMCU6137410 NPCT1 EVBIT 080B`"
      );
      return NextResponse.json({ success: true, message: "NPCT1 missing args" });
    }

    // Inform user that tracking has started processing
    await sendWhatsappMessage(sender, `🔍 Sedang memeriksa status kontainer *${containerNo}* di *${port.toUpperCase()}*...`);

    // 5. Call the tracking function
    const result = await trackTerminalContainer(port, containerNo, vesselName, voyageNo);

    if (!result.success || !result.status) {
      await sendWhatsappMessage(
        sender,
        `❌ *Gagal Melacak*\n\nKontainer *${containerNo}* tidak ditemukan atau terjadi kesalahan.\nError: ${result.error || "Unknown"}`
      );
      return NextResponse.json({ success: true, message: "Tracking failed" });
    }

    // Check if it's already GNSTK
    if (result.status === "GNSTK") {
      await sendWhatsappMessage(
        sender,
        `✅ *Kontainer Sudah Tersedia (GNSTK)*\n\nKontainer *${result.containerNo}* di *${result.port.toUpperCase()}* sudah mendapatkan lokasi yard.\nWaktu: ${result.time || "-"}\n\nTidak perlu dimasukkan ke auto-monitor.`
      );
      return NextResponse.json({ success: true, message: "Already GNSTK" });
    }

    // Extract raw phone number from sender (e.g., "62812...@c.us" -> "62812...")
    let waNumber = sender.replace(/\D/g, "");
    if (waNumber.startsWith("0")) {
      waNumber = "62" + waNumber.substring(1);
    }

    // 6. Enable Monitoring
    const monitorRes = await enableTerminalMonitoring(
      result.containerNo,
      result.port,
      result.status,
      waNumber,
      vesselName,
      voyageNo
    );

    if (monitorRes.success) {
      if (monitorRes.message === "Container is already being monitored.") {
        await sendWhatsappMessage(
          sender,
          `✅ Kontainer *${result.containerNo}* sudah dalam daftar pantauan aktif. Anda akan dikabari saat status berubah menjadi GNSTK!`
        );
      } else {
        // If it's a new monitor, enableTerminalMonitoring will automatically send a confirmation message.
        // We only append the current status here.
        await sendWhatsappMessage(
          sender,
          `ℹ️ Status awal saat ini: *${result.status}*`
        );
      }
    } else {
      await sendWhatsappMessage(
        sender,
        `⚠️ *Peringatan*\n\nStatus saat ini: *${result.status}*, tapi gagal menambahkan ke sistem auto-monitor.\nError: ${monitorRes.error}`
      );
    }

    return NextResponse.json({ success: true, message: "Command processed successfully" });
  } catch (error) {
    console.error("WAHA Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
