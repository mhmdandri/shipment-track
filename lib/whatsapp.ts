import dotenv from "dotenv";
dotenv.config();

import { fetchWithRetry } from "./fetch-with-retry";
import { normalizeWaTargetId } from "./whatsapp/subscription";

export async function sendWhatsappMessage(phone: string, text: string): Promise<boolean> {
  const WAHA_URL = process.env.WAHA_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;
  const WAHA_SESSION = process.env.WAHA_SESSION || "default";

  if (!WAHA_URL) {
    console.error("Missing WAHA_URL configuration in .env");
    return false;
  }

  // Ensure target ID is normalized with proper suffix (@c.us, @g.us, or @lid)
  const chatId = normalizeWaTargetId(phone);
  if (!chatId) {
    console.error("Invalid or empty WhatsApp target ID:", phone);
    return false;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (WAHA_API_KEY) {
      headers["X-Api-Key"] = WAHA_API_KEY;
    }

    const response = await fetchWithRetry(`${WAHA_URL}/api/sendText`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chatId,
        text,
        session: WAHA_SESSION,
      }),
      retries: 1,
      timeoutMs: 4000,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown response body");
      console.error(
        `WhatsApp API error for chatId ${chatId}: HTTP ${response.status} - ${errText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `Failed to send WhatsApp message to ${chatId}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
