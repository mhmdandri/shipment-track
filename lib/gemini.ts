import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function formatWhatsappMarkdown(text: string): string {
  if (!text) return "";
  return (
    text
      // Convert markdown double asterisks **text** to single asterisk *text* so WhatsApp renders it as bold
      .replace(/\*\*(.*?)\*\*/g, "*$1*")
      // Convert markdown headers # Header to bold *Header*
      .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
  );
}

const systemInstructionText = `Anda adalah moha, AI Assistant cerdas dan serba bisa yang dikembangkan oleh mohaproject.

Karakter & Gaya Komunikasi:
- Ramah, komunikatif, solutif, dan menggunakan Bahasa Indonesia yang nyaman (tidak kaku).
- Gunakan format WhatsApp yang rapi. Untuk menebalkan kata, gunakan bintang tunggal *teks bold* (jangan gunakan bintang ganda **teks** agar tidak muncul sebagai karakter mentah di WhatsApp).

Kemampuan:
1. Anda adalah AI serba bisa yang siap membantu menjawab berbagai pertanyaan umum, ilmu pengetahuan, bisnis, analisis, bantuan penulisan, maupun diskusi bebas secara fleksibel.
2. Anda paham konteks istilah ekspor-impor & logistik pelabuhan (JICT, KOJA, NPCT1, TMAL, TER3, Open Stack, Gate Out, Gudang OB/PLP).
3. Jika pengguna secara khusus menanyakan atau ingin melacak kontainer/kapal pada sistem CS Eksim Tracker, bantu berikan panduan perintah bot yang siap di-copy:
   • track <container> <pelabuhan> (Contoh: track EMCU6137410 JICT)
   • /status <container>
   • /openstack <vessel> <pelabuhan>
   • /cekport <vessel>
   • /help`;

export async function askGeminiAI(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "⚠️ GEMINI_API_KEY belum diatur pada environment server.";
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  // List of high-performance & unlimited tier candidate models
  const candidateModels = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-3.5-flash-lite",
  ];

  let lastErrorMsg = "";

  for (const modelName of candidateModels) {
    try {
      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstructionText,
        },
      });

      if (response.text) {
        return formatWhatsappMarkdown(response.text);
      }
    } catch (error: unknown) {
      lastErrorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Gemini Model (${modelName}) warning:`, lastErrorMsg);
    }
  }

  if (
    lastErrorMsg.includes("RESOURCE_EXHAUSTED") ||
    lastErrorMsg.includes("429")
  ) {
    return "⏳ *AI Sedang Sibuk*: Batas kuota gratis per menit (15 request/menit) telah tercapai. Silakan coba kembali dalam 15 - 20 detik.";
  }

  if (lastErrorMsg.includes("User location is not supported")) {
    return "⚠️ *Gemini AI Error*: IP VPS Anda diblokir oleh Google. Silakan jalankan `warp-cli connect` di VPS Anda.";
  }

  return "Maaf, terjadi kendala saat menghubungkan pesan ke AI Service.";
}
