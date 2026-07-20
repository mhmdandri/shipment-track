import dotenv from "dotenv";
dotenv.config();

import { fetchWithRetry } from "./fetch-with-retry";

export async function sendTelegramMessage(text: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing Telegram configuration in .env");
    return false;
  }

  try {
    const response = await fetchWithRetry(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
      retries: 2,
      timeoutMs: 10000,
    });

    if (!response.ok) {
      console.error(`Telegram API error: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}
