import { NextResponse } from "next/server";
import { WhatsappCommandContext } from "@/lib/whatsapp/types";
import { dispatchWhatsappCommand } from "@/lib/whatsapp/dispatcher";
import { safeCompare } from "@/lib/security";

let hasWarnedMissingSecret = false;

export async function POST(request: Request) {
  try {
    // 0. Verify WAHA Webhook Secret if configured (timing-safe)
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET?.trim();
    if (webhookSecret) {
      const apiKeyHeader = request.headers.get("x-api-key");
      const wahaSecretHeader = request.headers.get("x-waha-secret");
      const authHeader = request.headers.get("authorization");

      const isValid =
        safeCompare(apiKeyHeader, webhookSecret) ||
        safeCompare(wahaSecretHeader, webhookSecret) ||
        safeCompare(authHeader, webhookSecret) ||
        safeCompare(authHeader, `Bearer ${webhookSecret}`);

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Webhook secret mismatch" },
          { status: 401 },
        );
      }
    } else if (!hasWarnedMissingSecret) {
      hasWarnedMissingSecret = true;
      console.warn(
        "[WAHA] WAHA_WEBHOOK_SECRET is not set. Webhook accepts unauthenticated requests — set it in production.",
      );
    }

    const body = await request.json();

    // 1. Ensure the event is a message event
    const isMessageEvent = body?.event && String(body.event).startsWith("message");
    if (!isMessageEvent || !body?.payload) {
      return NextResponse.json({ success: true, message: "Ignored non-message event" });
    }

    const payload = body.payload;

    // 2. Ignore messages sent by the bot itself to prevent infinite loops
    const isFromMe =
      payload.fromMe === true ||
      payload.fromMe === "true" ||
      Boolean(payload.id?.fromMe) ||
      Boolean(payload._data?.id?.fromMe);

    if (isFromMe) {
      return NextResponse.json({ success: true, message: "Ignored self message" });
    }

    const text = payload.body || "";
    const sender = payload.from || "";

    if (!text || !sender) {
      return NextResponse.json({ success: true, message: "Ignored empty message" });
    }

    // 3. Extract alternate sender identity (e.g. phone number vs LID)
    let alternateSender: string | undefined = undefined;
    const candidate =
      payload._data?.author ||
      payload.author ||
      payload._data?.fromNumber ||
      payload.participant;

    if (candidate && typeof candidate === "string" && candidate !== sender) {
      alternateSender = candidate;
    }

    // 4. Construct context and dispatch command safely
    const context: WhatsappCommandContext = {
      sender,
      alternateSender,
      payload,
      text,
      args: text.trim().split(/\s+/),
    };

    try {
      await dispatchWhatsappCommand(context);
    } catch (cmdError) {
      console.error("WAHA Command Dispatch Error:", cmdError);
    }

    // Always respond with 200 OK to WAHA so WAHA acknowledges receipt and does not retry delivery
    return NextResponse.json({ success: true, message: "Command processed" });
  } catch (error) {
    console.error("WAHA Webhook Error:", error);
    // Return status 200 to prevent WAHA from indefinitely retrying failed webhooks in loops
    return NextResponse.json(
      { success: false, error: "Internal Server Error handled" },
      { status: 200 }
    );
  }
}
