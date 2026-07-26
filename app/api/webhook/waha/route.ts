import { NextResponse } from "next/server";
import { WhatsappCommandContext } from "@/lib/whatsapp/types";
import { dispatchWhatsappCommand } from "@/lib/whatsapp/dispatcher";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Ensure the event is a message event
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

    // 4. Construct context and dispatch
    const context: WhatsappCommandContext = {
      sender,
      alternateSender,
      payload,
      text,
      args: text.trim().split(/\s+/),
    };

    await dispatchWhatsappCommand(context);

    return NextResponse.json({ success: true, message: "Command dispatched successfully" });
  } catch (error) {
    console.error("WAHA Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
