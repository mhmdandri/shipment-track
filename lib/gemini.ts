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

export async function askGeminiAI(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "⚠️ GEMINI_API_KEY belum diatur pada environment server.";
  }

  try {
    if (!aiClient) {
      aiClient = new GoogleGenAI({ apiKey });
    }

    const interaction = await aiClient.interactions.create({
      model: "gemini-3.6-flash",
      input: userPrompt,
      system_instruction: `Anda adalah moha, AI Assistant cerdas dan serba bisa yang dikembangkan oleh mohaproject.

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
   • /help`,
    });

    const rawOutput =
      interaction.output_text ||
      "Maaf, saya belum dapat memberikan balasan untuk pertanyaan tersebut.";

    return formatWhatsappMarkdown(rawOutput);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Maaf, terjadi kendala saat menghubungkan pesan ke AI Service.";
  }
}
