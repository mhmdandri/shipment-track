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
   - **Simpan & Kembalikan Raw Status Asli**: Jangan meng-override status asli dari pelabuhan menjadi string buatan (kecuali terminal TMAL yang dinormalisasi ke `ONVSL`/`GNSTK`/`OUTGT` karena TMAL hanya mengembalikan string tanggal bongkar).
   - Gunakan helper terpusat `isOutgateStatus(status)` dan `isYardStatus(status)` dari `actions/tracking/utils.ts` untuk pengecekan status keluar pelabuhan maupun alokasi yard.
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

## 7. Cara Membuat Database Migration (WAJIB)

> [!IMPORTANT]
> **ATURAN WAJIB MIGRATION**: Setiap ada penambahan atau perubahan schema di `prisma/schema.prisma`, **WAJIB MENGGUNAKAN `npx prisma migrate dev`**. **DILARANG MENGGUNAKAN `npx prisma db push`** agar histori file SQL migrasi di folder `prisma/migrations/` selalu konsisten.

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

1. **Monitoring Single / Batch Kontainer**:
   - Untuk 1 kontainer: Panggil server action `enableTerminalMonitoring(containerNo, port, initialStatus, waNumber, vesselName, voyageNo)`.
   - Untuk banyak kontainer sekaligus: Panggil server action `enableBatchTerminalMonitoring(items, waNumber)`.
2. **WhatsApp Target Selector (Grup WA & Personal)**:
   - Web UI mendukung pengiriman notifikasi baik ke nomor WhatsApp personal (`628...@c.us`) maupun ke **Grup WhatsApp** (`120363...@g.us`).
   - Web UI mengambil daftar grup terdaftar menggunakan `getActiveSubscriptionsAction` dari `@/actions/subscription-action`.
3. **Verifikasi Otorisasi & Kuota**:
   - Server action secara otomatis melakukan verifikasi langganan WhatsApp (`checkWaSubscription`) untuk total kontainer yang didaftarkan. Jika target tidak terdaftar, di-suspend, kadaluarsa, atau kuota kontainer aktif telah penuh, pendaftaran dibatalkan dan mengembalikan pesan error terstruktur.
4. **Pendaftaran Database**:
   - Kontainer yang memenuhi syarat dimasukkan/diperbarui ke tabel `TerminalMonitor` dengan `isActive = true`.
5. **Siklus Cron Monitoring**:
   - Siklus cron `/api/cron/monitor` otomatis mendeteksi baris baru ini pada eksekusi interval berikutnya dan mengirimkan notifikasi ke target yang dipilih (Grup WA / Personal).

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
   - Sistem secara otomatis menormalisasi target WhatsApp yang diinput admin maupun sistem (`normalizeWaTargetId`):
     - Nomor HP personal (`08123456789`, `+628123456789`) -> `628123456789@c.us`.
     - Group JID (`120363428254459304@g.us`, `120363428254459304`, atau legacy `62812...-16123...`) -> `... @g.us`.
     - Meta LID (`145844254802166@lid` atau 14+ digit bukan 62/120363) -> `... @lid`.
   - **Penting**: Domain eksplisit (`@g.us`, `@lid`, `@c.us`) dan prefix grup `120363` selalu diprioritaskan utama sebelum pemeriksaan panjang karakter LID.
4. **Ekstensi & Suspend Manual**:
   - Gunakan tombol quick extend (`+1 Mo` / `+1 Yr`) untuk memperpanjang masa aktif dalam 1 klik.
   - Gunakan tombol power/suspend untuk memblokir sementara pengakses tanpa menghapus data.
5. **Prisma Database Migration**:
   - Setiap penambahan model Prisma baru wajib dieksekusi via `npx prisma migrate dev --name <deskripsi>` agar file migrasi SQL dibuat di `prisma/migrations/` dan diterapkan ke PostgreSQL.

---

## 17. Cara Mengelola Authentication & User Session

### Langkah-langkah:

1. **Manajemen User Initial/Seeding**:
   - Akun admin dibuat/di-seed melalui script `scripts/seed-user.ts` dengan menyuplai variabel lingkungan:
     - `SEED_USERNAME`, `SEED_PASSWORD`, `SEED_NAME`, `SEED_ROLE`
   - Tidak ada kredensial default ter-hardcode atau auto-seed otomatis pada runtime login.
2. **Kredensial Password**:
   - Selalu gunakan helper `hashPassword(password)` dari `@/lib/auth` untuk menyimpan password baru.
   - Gunakan `comparePassword(plain, hashed)` untuk memvalidasi login.
3. **JWT Security & Token Verification**:
   - Panggil `signJWT(payload)` untuk menghasilkan token JWT 7 hari.
   - Di Server Components atau Server Actions, gunakan `getCurrentUser()` dari `@/lib/auth` untuk mendapatkan user terautentikasi.
   - Untuk hit API eksternal/client, kirim header `Authorization: Bearer <token>` atau manfaatkan HttpOnly cookie `auth_token`.
4. **Proteksi Route via `proxy.ts` (Next.js 16 Proxy Convention)**:
   - Tambahkan path ke `PUBLIC_PATHS` di `proxy.ts` jika route baru diizinkan diakses tanpa login (seperti tracker publik).

---

## 18. Cara Pengecekan & Auto-Monitoring Vessel Open Stack (Multi-Port: NPCT1, JICT)

### Langkah-langkah:

1. **Scraping Real-Time Vessel Schedule (Multi-Port Engine)**:
   - Panggil `trackVesselSchedule(port, vesselName, line)` dari `@/actions/tracking/vessel`.
   - **Pemilihan Voyage Utama (`selectSingleBestSchedule`)**: Seluruh tracker terminal menggunakan `selectSingleBestSchedule` untuk memilih pelayaran mendatang paling awal (*earliest active upcoming voyage*, e.g. Voyage `0002S` sebelum `0003S`) dan secara otomatis mengesampingkan jadwal pelayaran lama yang sudah selesai (*SAILING/COMPLETE*).
   - **Multi-Format Date Parsing (`parseVesselDateMs`)**: Seluruh konversi string tanggal jadwal kapal (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`) menggunakan helper terpusat `parseVesselDateMs` untuk menghindari kegagalan parsing Date di JavaScript.
   - **NPCT1 (`actions/tracking/vessel/ports/npct1.ts`)**:
     Engine mengambil CSRF token & cookie session, melakukan POST request ke `https://www.npct1.co.id/req/vessel`, mendownload HTML redirect, dan memparse `#idTableVesselSchedule`.
   - **JICT (`actions/tracking/vessel/ports/jict.ts`)**:
     Engine mendownload HTML dari `https://www.jict.co.id/vessel-schedule`, memparse tabel `.working-vessel-table`, mencocokkan kapal (e.g. `SKY PRIDE 2606N`), dan menormalisasi format tanggal `DD/MM/YYYY HH:mm` ke `YYYY-MM-DD HH:mm:ss`.
2. **Pendaftaran Monitoring & Otorisasi SaaS**:
   - Panggil `enableVesselMonitoringAction(vesselName, port, waNumber)` dari `@/actions/vessel-action`.
   - Jika `waNumber` diberikan, sistem memverifikasi langganan WhatsApp via `checkWaSubscription`.
   - Data disimpan/diperbarui di tabel Prisma `VesselMonitor` dengan `isActive = true` dan `port = port`.
3. **Pemberitahuan via WhatsApp Command**:
   - Pengguna WhatsApp dapat mengirim perintah `/openstack <Nama Kapal> [Terminal]` (misal `/openstack SKY PRIDE jict`).
   - Bot membalas dengan status Open Stacking terbaru dan mendaftarkan pemantauan otomatis secara bersamaan.
4. **Cron Job Alerting & Multi-Field Change Detection**:
   - Endpoint `/api/cron/monitor` memeriksa seluruh kapal di `VesselMonitor` secara berkala (30 menit) menggunakan pemrosesan paralel berbasis chunk (`chunkSize = 5`) dan in-memory request caching.
   - **Multi-Field Change Detection**: Cron membandingkan seluruh field jadwal dan status (`openStacking`, `status`, `etb`, `ata`, `etd`, `atd`, `closingDoc`, `closingPhysic`).
   - Jika terdapat perubahan apapun pada tanggal jadwal atau status kapal, DB diperbarui dan notifikasi Telegram & WhatsApp (`vesselScheduleUpdatedAlert` / `npct1OpenStackAvailableAlert`) dikirimkan secara instan yang merinci seluruh daftar perubahan.
   - Sebelum mengirim WhatsApp, cron secara ketat memverifikasi status langganan via `checkWaSubscription`.
   - Pengecekan status kapal yang sudah berlayar / bertolak / selesai menggunakan helper terpusat `isVesselSailingOrCompleted(status)` dari `@/actions/tracking/vessel`.
5. **Deaktivasi Auto-Monitoring Kapal**:
   - Panggil `disableVesselMonitoringAction(vesselName, port)` dari `@/actions/vessel-action` untuk mematikan pemantauan (`isActive = false`).
   - Pada Web UI (`VesselTrackerTab.tsx`), sediakan tombol `Stop` dengan penanganan `router.refresh()` agar UI langsung tersinkronisasi tanpa manual reload.

---

## 19. Best Practice Server Action Security Guards & Batch Database Querying

### Langkah-langkah & Aturan:

1. **Proteksi Autentikasi Server Action (`requireAuth`)**:
   - Seluruh Server Action yang melakukan modifikasi data (*create/update/delete*) wajib memanggil `await requireAuth()` dari `@/lib/auth` pada awal eksekusi.
   - Panggilan `requireAuth()` secara otomatis membaca cookie `auth_token` atau header `Authorization: Bearer <token>` dan melempar `UnauthorizedError` jika token tidak ditemukan atau telah kedaluwarsa.
2. **Pencarian / Agregasi Batch DB (Menghindari N+1 Query)**:
   - Hindari pemanggilan query Prisma di dalam loop `map()` sekuensial (misal: `subs.map(async (s) => await count(s.id))`).
   - Gunakan query batch tunggal (`findMany({ where: { isActive: true } })` atau `groupBy`) lalu lakukan pencocokan di memori (*in-memory Set/Map matching*) untuk performa optimal.
3. **Validasi Payload Server Action via Zod Schema**:
   - Semua input parameter dari UI atau API wajib divalidasi menggunakan schema Zod (`lib/validator.ts`) sebelum diproses ke layer database.

---

## 20. Cara Memprovisi Akun Member & Subscription Sekaligus (Simultaneous Provisioning)

### Langkah-langkah & Aturan:

1. **Pembuatan Akun Member via Admin Dashboard (`/subscriptions`)**:
   - Admin/Owner membuka menu **Subscriptions & Member Accounts** (`/subscriptions`) lalu memilih tab **Member Accounts**.
   - Klik **+ Tambah Akun Member** untuk mengaktifkan modal `AddMemberModal`.
   - Isi kredensial user: Nama Lengkap (`name`), Username (`username`), Password (`password`), dan Role (`MEMBER` / `CS`).
2. **Opsi Provisioning WhatsApp Subscription**:
   - **Mode Buat Subscription Baru (`new`)**: Admin mengisi Target ID WhatsApp (`@c.us`, `@g.us`, atau `@lid`), Nama Klien, Paket (`STARTER`, `BUSINESS`, `ENTERPRISE`, `UNLIMITED`), dan Tanggal Kadaluarsa. Server Action `createMemberUserAction` secara otomatis membuat paket `WaSubscription` baru dan langsung menautkannya ke field `User.subscriptionId` dalam 1 transaksi.
   - **Mode Pilih Subscription Yang Ada (`existing`)**: Admin memilih paket subscription terdaftar dari dropdown. User member langsung dikaitkan ke ID subscription tersebut.
3. **Penanganan Otomatis pada Web UI Tracking (`TerminalTrackerClient`)**:
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
   - Sistem secara otomatis menormalisasi target WhatsApp yang diinput admin maupun sistem (`normalizeWaTargetId`):
     - Nomor HP personal (`08123456789`, `+628123456789`) -> `628123456789@c.us`.
     - Group JID (`120363428254459304@g.us`, `120363428254459304`, atau legacy `62812...-16123...`) -> `... @g.us`.
     - Meta LID (`145844254802166@lid` atau 14+ digit bukan 62/120363) -> `... @lid`.
   - **Penting**: Domain eksplisit (`@g.us`, `@lid`, `@c.us`) dan prefix grup `120363` selalu diprioritaskan utama sebelum pemeriksaan panjang karakter LID.
4. **Ekstensi & Suspend Manual**:
   - Gunakan tombol quick extend (`+1 Mo` / `+1 Yr`) untuk memperpanjang masa aktif dalam 1 klik.
   - Gunakan tombol power/suspend untuk memblokir sementara pengakses tanpa menghapus data.
5. **Prisma Database Migration**:
   - Setiap penambahan model Prisma baru wajib dieksekusi via `npx prisma migrate dev --name <deskripsi>` agar file migrasi SQL dibuat di `prisma/migrations/` dan diterapkan ke PostgreSQL.

---

## 17. Cara Mengelola Authentication & User Session

### Langkah-langkah:

1. **Manajemen User Initial/Seeding**:
   - Akun admin dibuat/di-seed melalui script `scripts/seed-user.ts` dengan menyuplai variabel lingkungan:
     - `SEED_USERNAME`, `SEED_PASSWORD`, `SEED_NAME`, `SEED_ROLE`
   - Tidak ada kredensial default ter-hardcode atau auto-seed otomatis pada runtime login.
2. **Kredensial Password**:
   - Selalu gunakan helper `hashPassword(password)` dari `@/lib/auth` untuk menyimpan password baru.
   - Gunakan `comparePassword(plain, hashed)` untuk memvalidasi login.
3. **JWT Security & Token Verification**:
   - Panggil `signJWT(payload)` untuk menghasilkan token JWT 7 hari.
   - Di Server Components atau Server Actions, gunakan `getCurrentUser()` dari `@/lib/auth` untuk mendapatkan user terautentikasi.
   - Untuk hit API eksternal/client, kirim header `Authorization: Bearer <token>` atau manfaatkan HttpOnly cookie `auth_token`.
4. **Proteksi Route via `proxy.ts` (Next.js 16 Proxy Convention)**:
   - Tambahkan path ke `PUBLIC_PATHS` di `proxy.ts` jika route baru diizinkan diakses tanpa login (seperti tracker publik).

---

## 18. Cara Pengecekan & Auto-Monitoring Vessel Open Stack (Multi-Port: NPCT1, JICT)

### Langkah-langkah:

1. **Scraping Real-Time Vessel Schedule (Multi-Port Engine)**:
   - Panggil `trackVesselSchedule(port, vesselName, line)` dari `@/actions/tracking/vessel`.
   - **Pemilihan Voyage Utama (`selectSingleBestSchedule`)**: Seluruh tracker terminal menggunakan `selectSingleBestSchedule` untuk memilih pelayaran mendatang paling awal (*earliest active upcoming voyage*, e.g. Voyage `0002S` sebelum `0003S`) dan secara otomatis mengesampingkan jadwal pelayaran lama yang sudah selesai (*SAILING/COMPLETE*).
   - **Multi-Format Date Parsing (`parseVesselDateMs`)**: Seluruh konversi string tanggal jadwal kapal (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`) menggunakan helper terpusat `parseVesselDateMs` untuk menghindari kegagalan parsing Date di JavaScript.
   - **NPCT1 (`actions/tracking/vessel/ports/npct1.ts`)**:
     Engine mengambil CSRF token & cookie session, melakukan POST request ke `https://www.npct1.co.id/req/vessel`, mendownload HTML redirect, dan memparse `#idTableVesselSchedule`.
   - **JICT (`actions/tracking/vessel/ports/jict.ts`)**:
     Engine mendownload HTML dari `https://www.jict.co.id/vessel-schedule`, memparse tabel `.working-vessel-table`, mencocokkan kapal (e.g. `SKY PRIDE 2606N`), dan menormalisasi format tanggal `DD/MM/YYYY HH:mm` ke `YYYY-MM-DD HH:mm:ss`.
2. **Pendaftaran Monitoring & Otorisasi SaaS**:
   - Panggil `enableVesselMonitoringAction(vesselName, port, waNumber)` dari `@/actions/vessel-action`.
   - Jika `waNumber` diberikan, sistem memverifikasi langganan WhatsApp via `checkWaSubscription`.
   - Data disimpan/diperbarui di tabel Prisma `VesselMonitor` dengan `isActive = true` dan `port = port`.
3. **Pemberitahuan via WhatsApp Command**:
   - Pengguna WhatsApp dapat mengirim perintah `/openstack <Nama Kapal> [Terminal]` (misal `/openstack SKY PRIDE jict`).
   - Bot membalas dengan status Open Stacking terbaru dan mendaftarkan pemantauan otomatis secara bersamaan.
4. **Cron Job Alerting & Multi-Field Change Detection**:
   - Endpoint `/api/cron/monitor` memeriksa seluruh kapal di `VesselMonitor` secara berkala (30 menit) menggunakan pemrosesan paralel berbasis chunk (`chunkSize = 5`) dan in-memory request caching.
   - **Multi-Field Change Detection**: Cron membandingkan seluruh field jadwal dan status (`openStacking`, `status`, `etb`, `ata`, `etd`, `atd`, `closingDoc`, `closingPhysic`).
   - Jika terdapat perubahan apapun pada tanggal jadwal atau status kapal, DB diperbarui dan notifikasi Telegram & WhatsApp (`vesselScheduleUpdatedAlert` / `npct1OpenStackAvailableAlert`) dikirimkan secara instan yang merinci seluruh daftar perubahan.
   - Sebelum mengirim WhatsApp, cron secara ketat memverifikasi status langganan via `checkWaSubscription`.
   - Pengecekan status kapal yang sudah berlayar / bertolak / selesai menggunakan helper terpusat `isVesselSailingOrCompleted(status)` dari `@/actions/tracking/vessel`.
5. **Deaktivasi Auto-Monitoring Kapal**:
   - Panggil `disableVesselMonitoringAction(vesselName, port)` dari `@/actions/vessel-action` untuk mematikan pemantauan (`isActive = false`).
   - Pada Web UI (`VesselTrackerTab.tsx`), sediakan tombol `Stop` dengan penanganan `router.refresh()` agar UI langsung tersinkronisasi tanpa manual reload.

---

## 19. Best Practice Server Action Security Guards & Batch Database Querying

### Langkah-langkah & Aturan:

1. **Proteksi Autentikasi Server Action (`requireAuth`)**:
   - Seluruh Server Action yang melakukan modifikasi data (*create/update/delete*) wajib memanggil `await requireAuth()` dari `@/lib/auth` pada awal eksekusi.
   - Panggilan `requireAuth()` secara otomatis membaca cookie `auth_token` atau header `Authorization: Bearer <token>` dan melempar `UnauthorizedError` jika token tidak ditemukan atau telah kedaluwarsa.
2. **Pencarian / Agregasi Batch DB (Menghindari N+1 Query)**:
   - Hindari pemanggilan query Prisma di dalam loop `map()` sekuensial (misal: `subs.map(async (s) => await count(s.id))`).
   - Gunakan query batch tunggal (`findMany({ where: { isActive: true } })` atau `groupBy`) lalu lakukan pencocokan di memori (*in-memory Set/Map matching*) untuk performa optimal.
3. **Validasi Payload Server Action via Zod Schema**:
   - Semua input parameter dari UI atau API wajib divalidasi menggunakan schema Zod (`lib/validator.ts`) sebelum diproses ke layer database.

---

## 20. Cara Memprovisi Akun Member & Subscription Sekaligus (Simultaneous Provisioning)

### Langkah-langkah & Aturan:

1. **Pembuatan Akun Member via Admin Dashboard (`/subscriptions`)**:
   - Admin/Owner membuka menu **Subscriptions & Member Accounts** (`/subscriptions`) lalu memilih tab **Member Accounts**.
   - Klik **+ Tambah Akun Member** untuk mengaktifkan modal `AddMemberModal`.
   - Isi kredensial user: Nama Lengkap (`name`), Username (`username`), Password (`password`), dan Role (`MEMBER` / `CS`).
2. **Opsi Provisioning WhatsApp Subscription**:
   - **Mode Buat Subscription Baru (`new`)**: Admin mengisi Target ID WhatsApp (`@c.us`, `@g.us`, atau `@lid`), Nama Klien, Paket (`STARTER`, `BUSINESS`, `ENTERPRISE`, `UNLIMITED`), dan Tanggal Kadaluarsa. Server Action `createMemberUserAction` secara otomatis membuat paket `WaSubscription` baru dan langsung menautkannya ke field `User.subscriptionId` dalam 1 transaksi.
   - **Mode Pilih Subscription Yang Ada (`existing`)**: Admin memilih paket subscription terdaftar dari dropdown. User member langsung dikaitkan ke ID subscription tersebut.
3. **Penanganan Otomatis pada Web UI Tracking (`TerminalTrackerClient`)**:
   - Saat user member login dan membuka `/terminal-tracker`, `getCurrentUserAction()` mengembalikan `user.subscriptionTargetId`.
   - Sistem secara otomatis mengunci dan menyetel target notifikasi ke `subscriptionTargetId` akun member tersebut.
   - User member dapat langsung menekan tombol **Track & Auto-Monitor** tanpa perlu memilih atau mengingat ID subscription WhatsApp.

---

## 21. Standar UI/UX Container Tracker & Penayangan Nama Subscription (Masking ID)

### Langkah-langkah & Aturan UX:

1. **Grid Sejajar & Scroll Area Internal**:
   - Kartu Input Form (Kiri) dan Kartu Output Tracking Result (Kanan) disusun **sejajar/equal height (`items-stretch`)**.
   - Output tracking dilengkapi **scroll area internal (`max-h-[460px] overflow-y-auto`)** agar kontainer berstatus panjang tetap rapi tanpa membuat halaman ter-scroll.
2. **Penyembunyian ID Murni WhatsApp (Group JID / Phone Number / LID)**:
   - Komponen UI `TerminalTrackerClient` **hanya menampilkan Nama Subscription (`sub.name` / `subscriptionName`)** (contoh: **PT Logistics Indonesia**).
   - Dilarang menampilkan string mentah seperti `120363428254459304@g.us` atau `628123456789@c.us` di antarmuka pengguna demi kenyamanan dan estetika.
3. **Metric Summary Cards & Scrollable Batch Table**:
   - Hasil batch tracking multi-kontainer dilengkapi kartu statistik di bagian atas (Total, Stacking Yard, Outgate, Fail/Unknown) serta tabel ber-scroll area.ontainer.
