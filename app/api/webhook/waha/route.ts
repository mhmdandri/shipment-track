import { NextResponse } from "next/server";
import { WhatsappCommandContext } from "@/lib/whatsapp/types";
import { dispatchWhatsappCommand } from "@/lib/whatsapp/dispatcher";
import { safeCompare } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json(
        { success: false, error: "Webhook authentication is not configured" },
        { status: 503 },
      );
    }

    const secretHeader =
      request.headers.get("x-waha-secret") ??
      request.headers.get("x-api-key") ??
      request.headers.get("authorization");
    const isValid =
      safeCompare(secretHeader, webhookSecret) ||
      safeCompare(secretHeader, `Bearer ${webhookSecret}`);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Webhook secret mismatch" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const isMessageEvent =
      typeof body?.event === "string" && body.event.startsWith("message");
    if (!isMessageEvent || !body?.payload) {
      return NextResponse.json({ success: true, message: "Ignored non-message event" });
    }

    const payload = body.payload;
    const isFromMe =
      payload.fromMe === true ||
      payload.fromMe === "true" ||
      Boolean(payload.id?.fromMe) ||
      Boolean(payload._data?.id?.fromMe);
    if (isFromMe) {
      return NextResponse.json({ success: true, message: "Ignored self message" });
    }

    const text = typeof payload.body === "string" ? payload.body : "";
    const sender = typeof payload.from === "string" ? payload.from : "";
    if (!text || !sender) {
      return NextResponse.json({ success: true, message: "Ignored empty message" });
    }

    const candidate =
      payload._data?.author ||
      payload.author ||
      payload._data?.fromNumber ||
      payload.participant;
    const alternateSender =
      typeof candidate === "string" && candidate !== sender ? candidate : undefined;

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

    return NextResponse.json({ success: true, message: "Command processed" });
  } catch (error) {
    console.error("WAHA Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error handled" },
      { status: 200 },
    );
  }
}
