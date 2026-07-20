import dotenv from "dotenv";
dotenv.config();

import { fetchWithRetry } from "./fetch-with-retry";
export async function sendWhatsappMessage(phone: string, text: string) {
  const WAHA_URL = process.env.WAHA_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;

  if (!WAHA_URL) {
    console.error("Missing WAHA_URL configuration in .env");
    return false;
  }

  // Ensure phone number has a valid WhatsApp suffix (@c.us or @s.whatsapp.net for groups/individuals)
  let chatId = phone;
  if (!chatId.includes("@")) {
    chatId = `${phone}@c.us`;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (WAHA_API_KEY) {
      headers["X-Api-Key"] = WAHA_API_KEY;
    }

    const response = await fetchWithRetry(`${WAHA_URL}/api/sendText`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chatId: chatId,
        text,
        session: "default",
      }),
      retries: 2,
      timeoutMs: 10000,
    });

    if (!response.ok) {
      console.error(`WhatsApp API error: ${response.status} - ${await response.text()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}
