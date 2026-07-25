# SKILL.md - Project Implementation Playbooks & Guides

Dokumen ini berisi panduan langkah-demi-langkah (step-by-step) teknis untuk menambah, memperbarui, dan memelihara fitur pada project **CS Eksim Tracker (shipment-track)** sesuai dengan standar arsitektur dan pola coding yang berlaku di codebase.

---

## 1. Cara Membuat API Route Baru

### Langkah-langkah:

1. Buat folder baru di bawah `app/api/<route-name>/`.
2. Buat file `route.ts` di dalam folder tersebut.
3. Import `NextResponse` dari `"next/server"` dan database client `prisma` dari `@/lib/prisma`.
4. Jika API route tidak boleh di-cache oleh Next.js (misalnya data real-time atau webhook), tambahkan `export const dynamic = "force-dynamic";`.
5. Ekspor async function sesuai HTTP Method (`GET`, `POST`, `PUT`, `DELETE`).
6. Lakukan validasi request payload menggunakan Zod.
7. Wrap logic ke dalam blok `try...catch` dan kembalikan error terstruktur.

### Contoh Implementasi:

```typescript
// app/api/example/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  title: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 },
      );
    }

    // Logic bisnis / query Prisma
    return NextResponse.json({ success: true, data: parsed.data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
```

---

## 2. Cara Membuat Server Action Baru

### Langkah-langkah:

1. Buat atau buka file action di folder `actions/` (misal: `actions/shipment-action.ts`).
2. Pastikan file diawali directive `"use server";` di baris pertama.
3. Import `revalidatePath` dari `"next/cache"` jika action mengubah data yang perlu mereferensi ulang UI Next.js.
4. Buat type Response menggunakan interface standard `ActionResponse<T>` dari `@/lib`.
5. Gunakan schema Zod untuk memvalidasi input parameter.
6. Panggil service/repository layer dan revalidate path terkait.

### Contoh Implementasi:

```typescript
// actions/example-action.ts
"use server";

import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/lib";
import { z } from "zod";

const inputSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
});

export async function updateExampleAction(
  id: string,
  status: string,
): Promise<ActionResponse<{ updated: boolean }>> {
  try {
    const validated = inputSchema.parse({ id, status });

    // Panggil Service atau Repository
    // await service.updateStatus(validated.id, validated.status);

    revalidatePath("/");
    return { success: true, data: { updated: true } };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
```

---

## 3. Cara Membuat & Menambah Port Tracking Baru

### Langkah-langkah:

1. **Analisa Respon Terminal Target**: Tentukan apakah terminal mengembalikan format JSON API atau HTML Web Scrape.
2. **Buat File Scraper Baru**:
   - Buat file baru di `actions/tracking/ports/<nama-port>.ts` (misal: `actions/tracking/ports/parama.ts`).
   - Implementasikan interface `PortTracker` dari `actions/tracking/types.ts`.
3. **Tulis Logic Tracking & Parser Status**:
   - Gunakan `fetch` atau `getCheerio(html)` dari `actions/tracking/utils.ts`.
   - Normalisasikan status alokasi yard ke `"GNSTK"` dan status keluar pelabuhan ke `"OUTGT"`.
4. **Register Provider Baru ke Tracking Registry**:
   - Buka `actions/tracking/index.ts`.
   - Import tracker baru dan tambahkan entry ke objek `trackers`:
     ```typescript
     export const trackers: Record<string, PortTracker> = {
       jict: jictTracker,
       tmal: tmalTracker,
       koja: kojaTracker,
       npct1: npct1Tracker,
       ter3: ter3Tracker,
       namaportbaru: namaPortTracker, // <-- Tambahkan di sini
     };
     ```
5. **Update Daftar Port WhatsApp Command**:
   - Buka `lib/whatsapp/commands/track.ts` dan tambahkan string port baru ke array `knownPorts`.

---

## 4. Cara Membuat Cron Job Baru

### Langkah-langkah:

1. **Membuat Cron Endpoint**:
   - Buat file `app/api/cron/<nama-cron>/route.ts`.
   - Tambahkan validasi header `Authorization: Bearer process.env.CRON_SECRET`.
   - Tulis logic pekerjaan berkala (misal: penyiapan email reminder atau polling status).
2. **Mengatur Cron Schedule di Vercel (Produksi)**:
   - Tambahkan konfigurasi di `vercel.json`:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron/<nama-cron>",
           "schedule": "*/30 * * * *"
         }
       ]
     }
     ```
3. **Mengatur Cron di Daemon Standalone (Development / Local)**:
   - Edit atau buat script di `scripts/<cron-script>.ts`.
   - Gunakan package `node-cron`:
     ```typescript
     import cron from "node-cron";
     cron.schedule("*/30 * * * *", async () => {
       // Panggil handler cron
     });
     ```

---

## 5. Cara Membuat & Menambah Trigger Notifikasi Baru

### Langkah-langkah:

1. **Notifikasi WhatsApp**:
   - Buka `lib/whatsapp-message.ts` dan buat function formatter template baru.
   - Panggil `sendWhatsappMessage(phone, formattedMessage)` dari `@/lib/whatsapp`.
2. **Notifikasi Telegram**:
   - Panggil `sendTelegramMessage(htmlFormattedText)` dari `@/lib/telegram`.
3. **Eksekusi Asinkronus / Paralel**:
   - Saat mengirim notifikasi di latar belakang, manfaatkan `Promise.all()` agar tidak saling mengunci (non-blocking).

---

## 6. Cara Menambah Prisma Model Baru

### Langkah-langkah:

1. Buka file `prisma/schema.prisma`.
2. Tambahkan deklarasi `model NamaModel { ... }` beserta field, tipe data, default value, dan relasinya.
3. Tambahkan `@id @default(uuid())` pada primary key.
4. Tambahkan index `@@index([...])` pada field yang sering di-query (seperti status, foreign key, atau tanggal).
5. Jalankan `npx prisma format` untuk meriwayatkan format file schema.

---

## 7. Cara Membuat Database Migration

### Langkah-langkah:

1. Setelah mengubah `prisma/schema.prisma`, buka terminal di root project.
2. Jalankan perintah migration dev:
   ```bash
   npx prisma migrate dev --name <nama_deskripsi_migrasi>
   ```
3. Prisma akan secara otomatis membuat file SQL baru di `prisma/migrations/` dan memperbarui tipe TypeScript client di `app/generated/prisma`.
4. Jika bekerja di lingkungan produksi atau server CI/CD, jalankan:
   ```bash
   npx prisma migrate deploy
   ```

---

## 8. Cara Membuat Scheduler Task Baru

### Langkah-langkah:

1. Tentukan frekuensi interval pekerjaan (misalnya hourly, daily, atau setiap 15 menit).
2. Daftarkan tugas scheduler ke dalam script `scripts/monitor-terminals.ts` atau buat file baru di `scripts/`.
3. Pastikan penanganan koneksi Prisma di script standalone menginisialisasi `PrismaPg` pool dengan benar dari `.env`.

---

## 9. Cara Membuat Auto-Monitoring Kontainer Baru

### Langkah-langkah:

1. Panggil server action `enableTerminalMonitoring` dari client component atau WhatsApp command handler:
   ```typescript
   await enableTerminalMonitoring(
     containerNo,
     port,
     initialStatus,
     waNumber,
     vesselName,
     voyageNo,
   );
   ```
2. Server action `enableTerminalMonitoring` secara otomatis melakukan verifikasi langganan WhatsApp (`checkWaSubscription`) jika `waNumber` diberikan. Jika nomor tidak terdaftar, di-suspend, kadaluarsa, atau kuota kontainer aktif telah penuh, pendaftaran dibatalkan dan mengembalikan pesan error terstruktur.
3. Kontainer yang memenuhi syarat dimasukkan/diperbarui ke tabel `TerminalMonitor` dengan `isActive = true`.
4. Siklus cron `/api/cron/monitor` otomatis mendeteksi baris baru ini pada eksekusi interval berikutnya.

---

## 10. Cara Menambah WhatsApp Command Baru

### Langkah-langkah:

1. **Buat Command Handler**:
   - Buat file handler di `lib/whatsapp/commands/<command-name>.ts` (misal: `lib/whatsapp/commands/status.ts`).
   - Eksport async function `handle<Name>Command(context: WhatsappCommandContext)`.
2. **Export Handler**:
   - Buka `lib/whatsapp/commands/index.ts` dan re-export handler baru (`export * from "./status";`).
3. **Register ke Command Dispatcher**:
   - Buka `lib/whatsapp/dispatcher.ts`.
   - Tambahkan `case "<command>":` (misal: `case "status":`) pada switch statement `commandWord`.

---

## 11. Best Practice Navigasi Sidebar Mobile

### Prinsip:

1. Semua item navigasi di sidebar mobile harus memanggil satu helper penutup yang sama, misalnya `closeSidebar`.
2. Overlay click, tombol close, dan semua `Link` di mobile harus berbagi perilaku yang konsisten.
3. Hindari ada satu item menu yang tidak menutup sidebar, karena itu membuat UX tidak konsisten dan mudah lolos saat testing manual.

---

## 12. Cara Menjalankan Project

### Development Mode:

```bash
# 1. Pastikan PostgreSQL berjalan dan terkonfigurasi di .env
# 2. Install dependensi
pnpm install

# 3. Generate Prisma Client & Sync Database
npx prisma generate
npx prisma db push

# 4. Jalankan Server Next.js Development
pnpm dev
```

---

## 13. Cara Testing

### Type Checking & Linting Standard:

```bash
# Jalankan TypeScript Compiler tanpa membuat output
pnpm tsc --noEmit

# Jalankan ESLint untuk mengecek kebersihan kode
npx eslint .
```

---

## 13. Cara Debugging & Logging

### Aturan Logging Codebase:

1. **Error Tracing**: Gunakan `console.error("Context Error Description:", error)` di dalam blok `catch`.
2. **Operational Tracking**: Gunakan `console.log("-> Action Description", data)` untuk menelusuri eksekusi cron atau WhatsApp dispatcher.
3. **Verifikasi Stack Trace**: Jika terjadi error runtime, buka log terminal un-truncated untuk melihat exact line number dan root cause sebelum mengubah kode.

---

## 14. Cara Deploy Project

### Deployment ke Vercel:

1. Pastikan script `build` di `package.json` menyertakan `prisma generate && prisma migrate deploy && next build`.
2. Konfigurasikan seluruh variabel lingkungan di Vercel Environment Variables (`DATABASE_URL`, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `WAHA_URL`, dll).
3. Push perubahan ke branch `main` / `master` repository GitHub.

---

## 15. Cara Menambah Environment Variable Baru

### Langkah-langkah:

1. Tambahkan variabel baru di file `.env`.
2. Buka `lib/env.ts`.
3. Tambahkan skema validasi Zod untuk variabel baru pada `envSchema`:
   ```typescript
   const envSchema = z.object({
     DATABASE_URL: z.string().url(),
     NEW_ENV_VAR: z.string().min(1).optional(), // <-- Tambahkan di sini
   });
   ```
4. Eksport dan gunakan via `env.NEW_ENV_VAR` atau `process.env.NEW_ENV_VAR`.

---

## 16. Cara Mengelola SaaS Subscriptions & Access Control

### Langkah-langkah:

1. **Pendaftaran Klien via Dashboard UI**:
   - Buka menu **Bot Subscriptions** (`/subscriptions`).
   - Klik **Add Subscriber**.
   - Isi Target WhatsApp ID (`628123456789@c.us` untuk nomor personal atau `120363...@g.us` untuk grup WA).
   - Tentukan paket (`STARTER`, `BUSINESS`, `ENTERPRISE`, atau `UNLIMITED`) & kuota kontainer.
   - Atur tanggal kadaluarsa (`expiredAt`).
2. **Aturan Otorisasi Ketat 100% (Strict Zero-Trust)**:
   - Seluruh request notifikasi WhatsApp (baik via Web UI Terminal Tracker maupun Command Bot WhatsApp) wajib terdaftar aktif pada tabel `WaSubscription`.
   - Jika nomor WhatsApp pengirim/target tidak terdaftar, di-suspend, kadaluarsa, atau melebihi kuota kontainer aktif, sistem akan langsung menolak pendaftaran dan mengembalikan pesan error.
3. **Normalisasi Target ID**:
   - Sistem secara otomatis menormalisasi nomor HP yang diinput admin (contoh `08123456789` atau `+628123456789`) menjadi format standar WAHA (`628123456789@c.us`).
4. **Ekstensi & Suspend Manual**:
   - Gunakan tombol quick extend (`+1 Mo` / `+1 Yr`) untuk memperpanjang masa aktif dalam 1 klik.
   - Gunakan tombol power/suspend untuk memblokir sementara pengakses tanpa menghapus data.
5. **Prisma Database Migration**:
   - Setiap penambahan model Prisma baru wajib dieksekusi via `npx prisma migrate dev --name <deskripsi>` agar file migrasi SQL dibuat di `prisma/migrations/` dan diterapkan ke PostgreSQL.

---

## 17. Cara Mengelola Authentication & User Session

### Langkah-langkah:

1. **User Credentials Default**:
   - User default diinisialisasi otomatis saat pertama kali login:
     - **Username**: `admin`
     - **Password**: `adminpassword`
     - **Nama**: `Muhamad Andri`
     - **Role**: `ADMIN`
2. **Kredensial Password**:
   - Selalu gunakan helper `hashPassword(password)` dari `@/lib/auth` untuk menyimpan password baru.
   - Gunakan `comparePassword(plain, hashed)` untuk memvalidasi login.
3. **JWT Security & Token Verification**:
   - Panggil `signJWT(payload)` untuk menghasilkan token JWT 7 hari.
   - Di Server Components atau Server Actions, gunakan `getCurrentUser()` dari `@/lib/auth` untuk mendapatkan user terautentikasi.
   - Untuk hit API eksternal/client, kirim header `Authorization: Bearer <token>` atau manfaatkan HttpOnly cookie `auth_token`.
4. **Proteksi Route via `proxy.ts` (Next.js 16 Proxy Convention)**:
   - Tambahkan path ke `PUBLIC_PATHS` di `proxy.ts` jika route baru diizinkan diakses tanpa login (seperti tracker publik).

