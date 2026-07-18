import dotenv from "dotenv";
dotenv.config();

export async function sendWhatsappMessage(phone: string, text: string) {
  const WAHA_URL = process.env.WAHA_URL;
  const WAHA_API_KEY = process.env.WAHA_API_KEY;

  if (!WAHA_URL) {
    console.error("Missing WAHA_URL configuration in .env");
    return false;
  }

  // Ensure phone number has @c.us suffix
  const chatId = phone.includes("@c.us") ? phone : `${phone}@c.us`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (WAHA_API_KEY) {
      headers["X-Api-Key"] = WAHA_API_KEY;
    }

    const response = await fetch(`${WAHA_URL}/api/sendText`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chatId: chatId,
        text,
        session: "default",
      }),
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
