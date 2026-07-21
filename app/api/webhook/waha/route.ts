import { NextResponse } from "next/server";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { enableTerminalMonitoring } from "@/actions/monitor-action";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // DEBUG LOG: Print incoming webhook payload to Vercel logs
    console.log("==== INCOMING WAHA WEBHOOK ====");
    console.log(JSON.stringify(body, null, 2));

    // 1. Ensure the event is a message event
    // WAHA uses event names like "message", "message.any"
    const isMessageEvent = body?.event && String(body.event).startsWith("message");
    if (!isMessageEvent || !body?.payload) {
      console.log("-> Ignored: Not a message event");
      return NextResponse.json({ success: true, message: "Ignored non-message event" });
    }

    const payload = body.payload;

    // 2. Ignore messages sent by the bot itself to prevent infinite loops
    if (payload.fromMe === true) {
      console.log("-> Ignored: fromMe is true (self message)");
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
      console.log("-> Ignored: First word is not 'track'. It is:", args[0]);
      return NextResponse.json({ success: true, message: "Not a track command" });
    }

    console.log("-> Command recognized:", args);

    if (args.length < 3) {
      console.log("-> Error: Invalid format (less than 3 args)");
      await sendWhatsappMessage(
        sender,
        whatsappMessage.invalidCommand()
      );
      return NextResponse.json({ success: true, message: "Invalid format" });
    }

    const containerNo = args[1].toUpperCase();
    const port = args[2].toLowerCase();
    const vesselName = args[3]?.toUpperCase();
    const voyageNo = args[4]?.toUpperCase();

    // 4. Check NPCT1 requirements
    if (port === "npct1" && (!vesselName || !voyageNo)) {
      console.log("-> Error: NPCT1 missing vessel/voyage");
      await sendWhatsappMessage(
        sender,
        whatsappMessage.npctMissingData()
      );
      return NextResponse.json({ success: true, message: "NPCT1 missing args" });
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
      return NextResponse.json({ success: true, message: "Tracking failed" });
    }

    // Check if it's already GNSTK
    if (result.status === "GNSTK") {
      console.log("-> Status is already GNSTK. Replying and skipping monitor...");
      await sendWhatsappMessage(
        sender,
        whatsappMessage.alreadyGNSTK(result.containerNo, result.port, result.time || "-")
      );
      return NextResponse.json({ success: true, message: "Already GNSTK" });
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

    console.log("==== WAHA WEBHOOK FINISHED ====");
    return NextResponse.json({ success: true, message: "Command processed successfully" });
  } catch (error) {
    console.error("WAHA Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
