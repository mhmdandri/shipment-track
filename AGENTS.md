# AGENT.md - Master Project Memory & System Architecture

Dokumen ini adalah **source of truth** dan **memory utama** untuk project **CS Eksim Tracker (shipment-track)**. Semua informasi didasarkan pada hasil analisa mendalam source code secara langsung (line-by-line).

---

## 1. Project Overview

### Tujuan Project
CS Eksim Tracker (`shipment-track`) adalah sistem dashboard operasional freight forwarding (Import & Export Customer Service Suite). Sistem ini memfasilitasi monitoring pengiriman barang (shipments), otomatisasi checklist workflow 18 langkah (Import) / 8 langkah (Export), manajemen pengingat (reminders), tugas harian (daily todos), serta penelusuran status kontainer secara real-time pada berbagai terminal pelabuhan (JICT, KOJA, NPCT1, TMAL, TER3/PARAMA) dan shipping lines (ONE Line, Evergreen).

### Business Flow
1. **Pipeline Provisioning (`/shipments/create`)**: CS menginput data shipment baru (Job No, B/L No, Shipper, Consignee, Vessel, POL, POD, ETD, ETA, dll). System secara otomatis membangkitkan:
   - 17/18 task workflow sekuensial (`ShipmentTask`).
   - 5 pengingat otomatis berorientasi waktu (`Reminder`) relatif terhadap ETA/ETD/Open CY.
2. **Operational Dashboard & Checklist Management (`/` & `/shipments/[id]`)**: CS memantau KPI (Total Active, Need Action Today, Overdue, ETA This Week), mengeksekusi quick resolve reminder, memperbarui status task checklist, dan menambahkan catatan operasional.
3. **Live Container & Terminal Tracking (`/tracker` & `/terminal-tracker`)**:
   - Tracking Shipping Line (ONE, Evergreen) untuk melihat histori pergerakan kontainer global.
   - Tracking Terminal Port (JICT, KOJA, NPCT1, TMAL, TER3) untuk mengetahui posisi yard (`GNSTK`), outgate (`OUTGT`), atau status vessel (`ONVSL`).
4. **Auto-Monitoring & Alerting Flow**: Kontainer yang didaftarkan ke auto-monitoring akan secara otomatis di-poll setiap 30 menit (via Cron). Apabila kontainer mendapatkan alokasi yard (`GNSTK`) atau keluar pelabuhan (`OUTGT`), sistem akan mengirimkan notifikasi instan via Telegram Bot dan WhatsApp (WAHA API).

### Arsitektur & Teknologi
- **Framework**: Next.js 16 (App Router, Server Actions, Dynamic Routes)
- **Language**: TypeScript (Strict type checking, no `any`)
- **Database & ORM**: PostgreSQL via Prisma ORM v7 (dengan `@prisma/adapter-pg` & `pg` connection pool)
- **Database Migration Rule (WAJIB)**: Setiap kali ada penambahan atau perubahan schema Prisma (`prisma/schema.prisma`), **WAJIB MENGGUNAKAN `npx prisma migrate dev --name <deskripsi>`**. **SANGAT DILARANG / TIDAK BOLEH MENGGUNAKAN `npx prisma db push`** agar histori migrasi terawat dan aman untuk staging/production.
- **Scraping & HTML Parsing**: Cheerio v1.2.0, Native `fetch` API, Node.js `tls` socket module
- **Validation**: Zod (Form validation & API payloads)
- **Styling**: Tailwind CSS v4, Shadcn UI, Radix UI, Lucide Icons, tw-animate-css
- **Messaging & Notifications**: Telegram Bot API (HTML parse mode), WAHA (WhatsApp HTTP API) REST & Webhooks
- **Cron / Scheduler**: Next.js API Route `/api/cron/monitor` (Vercel Cron / External Cron Service) & Standalone `node-cron` script (`scripts/monitor-terminals.ts`)

### Dependency Utama
- `@prisma/client` & `@prisma/adapter-pg`: Database ORM & Driver
- `zod`: Schema definition & validation
- `cheerio`: HTML parsing untuk terminal scraper (KOJA, NPCT1, TMAL, JICT OB)
- `node-cron`: Cron scheduler di standalone script
- `date-fns`: Manipulasi tanggal & kalkulasi SLA
- `@bprogress/next`: NProgress indicator pada App Router transitions

---

## 2. Folder Structure

```
shipment-track/
├── .agents/                 # Workspace Agent Rules & AGENTS.md
├── actions/                 # Next.js Server Actions
│   ├── tracking/            # Core Port Tracking Engines & Interfaces
│   │   └── ports/           # Specific Port Scrapers (jict, koja, npct1, ter3, tmal)
│   ├── daily-todo-action.ts # CRUD Server Actions untuk Daily Todo
│   ├── monitor-action.ts    # Server Action pendaftaran Auto-Monitoring
│   ├── shipment-action.ts   # Server Actions untuk Shipment, Workflow Tasks, Reminders
│   ├── terminal-track-action.ts # Server Action Wrapper Port Tracking
│   ├── todo-action.ts       # Server Actions untuk Shipment-specific Todos
│   └── track-action.ts      # Server Action Shipping Line Tracking (ONE, Evergreen)
├── app/                     # Next.js App Router (Pages, Layouts, API Routes)
│   ├── api/
│   │   ├── cron/monitor/    # Cron Endpoint Auto-Monitoring (/api/cron/monitor)
│   │   └── webhook/waha/    # Webhook Receiver WhatsApp WAHA (/api/webhook/waha)
│   ├── generated/prisma/    # Custom Prisma Client output build location
│   ├── shipments/           # Pages: List (/shipments), Detail (/shipments/[id]), Create (/shipments/create)
│   ├── terminal-tracker/    # Page: Terminal Container Tracking & Active Monitors Dashboard
│   ├── todos/               # Page: Standalone Daily Todos
│   ├── tracker/             # Page: Shipping Line Live Tracker
│   ├── globals.css          # Styling tokens & Tailwind directives
│   ├── layout.tsx           # Main Root Layout (Sidebar + Provider)
│   └── page.tsx             # Command Dashboard (`/`)
├── components/              # Shared UI & Layout Components
│   ├── layout/              # AppSidebar, Providers
│   └── ui/                  # Shadcn UI primitives (button, card, dialog, table, badge, input, dll)
├── features/                # Domain-Driven UI Feature Modules
│   ├── dashboard/           # Dashboard Cards, Action Board, ETA Pipeline, Incomplete Tasks
│   ├── shipments/           # Shipment Table, Workflow Checklist, Forms, Modals, Info Cards
│   ├── todos/               # TodoList component & forms
│   └── tracker/             # Tracker forms, terminal client, container rows, route visualization
├── hooks/                   # Custom React Hooks (use-app-transition)
├── lib/                     # Utilities, Services, Configuration, Helpers
│   ├── whatsapp/            # WAHA Command Dispatcher & Handlers (/track, /list, /help)
│   ├── env.ts               # Zod Environment validation
│   ├── errors.ts            # Standardized Custom Error Classes (AppError, ValidationError, dll)
│   ├── fetch-with-retry.ts  # HTTP Fetch wrapper dengan auto-retry & timeout
│   ├── prisma.ts            # Singleton Prisma Client Instance
│   ├── telegram.ts          # Telegram notification sender
│   ├── validator.ts         # Zod schemas (shipmentSchema, updateShipmentDatesSchema)
│   ├── whatsapp.ts          # WhatsApp WAHA notification sender
│   ├── whatsapp-message.ts  # Formatter template pesan WhatsApp
│   └── workflow.ts          # Templates workflow steps (Import/Export) & Reminders
├── prisma/                  # Database Schema & Migrations
│   ├── migrations/          # PostgreSQL Prisma Migration Files
│   └── schema.prisma        # Prisma Schema Definition
├── repositories/            # Data Access Layer
│   └── shipment-repository.ts # Encapsulated Prisma Queries untuk Shipment, Task, Reminder, Log
├── scripts/                 # Standalone Node.js Scripts
│   └── monitor-terminals.ts # Standalone Cron Script (node-cron)
└── service/                 # Business Logic Layer
    ├── dashboard-service.ts # Agregasi data KPI & Action Board Dashboard
    └── shipment-service.ts  # Business Logic pembuatan shipment, sinkronisasi task & reminder
```

---

## 3. Module Breakdown

### 1. Shipment Module
- **Fungsi**: Pengelolaan data shipment dari registrasi, pembaruan jadwal (ETA/ETD/Open CY/Close CY/Close SI), eksekusi checklist task 18 langkah, penambahan catatan, hingga pembatalan/pengarsipan otomatis.
- **File Kunci**: `service/shipment-service.ts`, `repositories/shipment-repository.ts`, `actions/shipment-action.ts`, `features/shipments/*`.

### 2. Tracking Module (Shipping Lines)
- **Fungsi**: Pelacakan posisi kontainer pada shipping lines global (ONE Line & Evergreen EMC) melalui API eksternal dan HTML scraping.
- **File Kunci**: `actions/track-action.ts`, `app/tracker/page.tsx`, `features/tracker/*`.

### 3. Terminal Tracking Module (Port Terminals & Vessel Schedules)
- **Fungsi**: Scraping dan query data real-time ke terminal pelabuhan domestik (JICT, KOJA, NPCT1, TMAL, TER3/PARAMA) untuk mengetahui posisi kontainer (ONVSL, GNSTK, OUTGT, OB) serta jadwal Open Stacking kapal (NPCT1, JICT).
- **File Kunci**: `actions/tracking/index.ts`, `actions/tracking/vessel/index.ts`, `actions/tracking/vessel/ports/*`, `actions/vessel-action.ts`, `app/terminal-tracker/page.tsx`.

### 4. Auto-Monitoring Module
- **Fungsi**: Pendaftaran kontainer aktif ke watchlist `TerminalMonitor` dan kapal aktif ke watchlist `VesselMonitor`. Cron job memeriksa kontainer (`OUTGT`) dan jadwal Open Stacking kapal secara berkala. Kapal yang berstatus `SAILING` atau `COMPLETED` di-deaktivasi otomatis (`isActive: false`).
- **File Kunci**: `actions/monitor-action.ts`, `actions/vessel-action.ts`, `service/cron-monitor-service.ts`, `app/api/cron/monitor/route.ts`, `scripts/monitor-terminals.ts`.

### 5. WhatsApp Integration Module (WAHA)
- **Fungsi**: Penerimaan webhook dari WAHA HTTP API (`/api/webhook/waha`), dispatching command (`/track`, `/openstack`, `/status`, `/list`, `/cekid`, `/help`), serta pengiriman alert status kontainer dan Open Stacking kapal multi-port.
- **File Kunci**: `app/api/webhook/waha/route.ts`, `lib/whatsapp/dispatcher.ts`, `lib/whatsapp/commands/*`, `lib/whatsapp.ts`, `lib/whatsapp-message.ts`.

### 6. Telegram Notification Module
- **Fungsi**: Pengiriman alert prioritas tinggi (misalnya penentuan alokasi yard `GNSTK` & ketersediaan Open Stack kapal) ke grup/channel Telegram via Telegram Bot API (HTML format).
- **File Kunci**: `lib/telegram.ts`.

### 7. Cron & Scheduler Module
- **Fungsi**: Menjalankan pengecekan periodik status kontainer & jadwal kapal setiap 30 menit via service `cron-monitor-service.ts` melalui HTTP endpoint (`/api/cron/monitor`) atau daemon script (`scripts/monitor-terminals.ts`).
- **File Kunci**: `service/cron-monitor-service.ts`, `app/api/cron/monitor/route.ts`, `scripts/monitor-terminals.ts`.

### 8. Authentication Module
- **Fungsi**:
  - Validasi Cron request via `CRON_SECRET` Bearer Token.
  - Sesi otomatis & login token management ke PARAMA Pelindo (TER3) yang disimpan di tabel `SystemConfig`.
- **File Kunci**: `actions/tracking/ports/ter3.ts`, `app/api/cron/monitor/route.ts`.

### 9. Dashboard Module
- **Fungsi**: Perhitungan real-time metric KPI (Total Active, Need Action Today, Overdue, ETA This Week), penyusunan Action Board (Overdue, Today, Upcoming 15), dan quick action resolve.
- **File Kunci**: `service/dashboard-service.ts`, `app/page.tsx`, `features/dashboard/*`.

### 10. Todos Module (Daily & Shipment Todos)
- **Fungsi**: Catatan tugas harian independen (`DailyTodo`) dan catatan tugas khusus shipment (`Todo`).
- **File Kunci**: `actions/daily-todo-action.ts`, `actions/todo-action.ts`, `app/todos/page.tsx`, `features/todos/*`.

### 11. Subscription & Access Control Module
- **Fungsi**: Manajemen otorisasi akses bot WhatsApp per nomor HP / ID Grup (`WaSubscription`) dengan prinsip **Strict 100% Zero-Trust Access Control**, pembatasan kuota monitor aktif bersama (Shared Quota Pool: Kontainer + Kapal; STARTER: 10, BUSINESS: 25, ENTERPRISE/UNLIMITED: 0), batas tanggal kadaluarsa (`expiredAt`), saklar aktif/suspend manual, serta penghitungan kuota aktif serba fleksibel (`countActiveContainersForTarget`) yang menjumlahkan `TerminalMonitor` dan `VesselMonitor` aktif untuk berbagai format ID pengirim (`@lid`, `@c.us`, `@g.us`, clean numeric ID). Seluruh pendaftaran notifikasi WA baik via Web UI maupun Chat Bot wajib terdaftar aktif di database.
- **File Kunci**: `prisma/schema.prisma`, `lib/whatsapp/subscription.ts`, `actions/subscription-action.ts`, `app/subscriptions/page.tsx`, `features/subscriptions/*`.

---

## 4. Database Architecture (Prisma Schema)

### Enum Definitions
- `ShipmentStatus`: `ACTIVE`, `COMPLETED`, `CANCELLED`
- `ShipmentType`: `IMPORT`, `EXPORT`
- `Priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### Model & Relasi

```mermaid
erDiagram
    Shipment ||--o{ ShipmentTask : "has tasks"
    Shipment ||--o{ Reminder : "has reminders"
    Shipment ||--o{ ActivityLog : "has activity logs"
    Shipment ||--o{ Todo : "has todos"

    Shipment {
        String id PK "UUID"
        String jobNo UK "Unique Job Number"
        String blNo "Bill of Lading"
        String consignee "Consignee Name"
        String shipper "Shipper Name"
        String vessel "Vessel Name / Voyage"
        String portOfLoading "POL"
        String portOfDischarge "POD"
        DateTime eta "Estimated Time of Arrival"
        DateTime etd "Estimated Time of Departure"
        DateTime etb "Estimated Time of Berthing (Optional)"
        DateTime openCy "Open CY Date (Optional)"
        DateTime closeSi "Close SI Date (Optional)"
        DateTime closeCy "Close CY Date (Optional)"
        ShipmentType type "IMPORT | EXPORT"
        Int currentStep "Index step aktif"
        String nextAction "Judul aksi selanjutnya"
        ShipmentStatus status "ACTIVE | COMPLETED | CANCELLED"
        DateTime createdAt
        DateTime updatedAt
    }

    ActivityLog {
        String id PK "UUID"
        String shipmentId FK "Shipment References"
        String message "Log Entry Text"
        DateTime createdAt
    }

    ShipmentTask {
        String id PK "UUID"
        String shipmentId FK "Shipment References"
        String title "Task Title"
        Int stepOrder "Index Sekuensial (0..N)"
        Boolean completed "Status Selesai"
        DateTime completedAt "Waktu Penyelesaian"
        String notes "Catatan Tambahan"
        DateTime createdAt
        DateTime updatedAt
    }

    Reminder {
        String id PK "UUID"
        String shipmentId FK "Shipment References"
        String title "Reminder Title"
        DateTime dueDate "Target Tanggal Selesai"
        Boolean completed "Status Selesai"
        Priority priority "LOW | MEDIUM | HIGH | URGENT"
        DateTime createdAt
        DateTime updatedAt
    }

    Todo {
        String id PK "UUID"
        String shipmentId FK "Shipment References"
        String text "Todo Content"
        Boolean isDone "Status Selesai"
        DateTime createdAt
        DateTime updatedAt
    }

    DailyTodo {
        String id PK "UUID"
        String text "Daily Todo Content"
        Boolean isDone "Status Selesai"
        DateTime createdAt
        DateTime updatedAt
    }

    TerminalMonitor {
        String id PK "UUID"
        String containerNo UK "Unique Container Number"
        String waNumber "WhatsApp Sender Target (Optional)"
        String vesselName "Vessel Code / Name (Optional)"
        String voyageNo "Voyage Number (Optional)"
        String port "Port Code (jict|koja|npct1|tmal|ter3|parama)"
        String status "Last Known Status (ONVSL, GNSTK, OUTGT, dll)"
        Boolean isActive "Status Aktif Monitoring"
        DateTime createdAt
        DateTime updatedAt
    }

    VesselMonitor {
        String id PK "UUID"
        String vesselName "Vessel Code / Name"
        String port "Port Code (npct1|jict|koja|tmal|ter3)"
        String line "Carrier / Line Name"
        String voyageIn "Voyage In"
        String voyageOut "Voyage Out"
        String service "Service Name"
        String status "REGISTER | ACTIVE"
        DateTime etb "Estimated Time of Berthing"
        DateTime ata "Actual Time of Arrival"
        DateTime etd "Estimated Time of Departure"
        DateTime atd "Actual Time of Departure"
        DateTime openStacking "Jadwal Open Stacking"
        DateTime closingDoc "Closing Document Time"
        DateTime closingPhysic "Closing Physic Time"
        String waNumber "WhatsApp Target (Optional)"
        Boolean isActive "Status Monitoring"
        DateTime createdAt
        DateTime updatedAt
    }

    WaSubscription {
        String id PK "UUID"
        String targetId UK "Unique WA Target (Number or Group ID)"
        String name "Client / Group Name"
        String plan "STARTER | BUSINESS | ENTERPRISE | UNLIMITED"
        Int maxContainers "Max active containers allowed (0 = Unlimited)"
        DateTime expiredAt "Subscription expiration timestamp"
        Boolean isActive "Active / Suspended Toggle"
        DateTime createdAt
        DateTime updatedAt
    }

    SystemConfig {
        String key PK "Key Identifikasi (misal: TER3_SESSION)"
        String value "JSON Stringified Data"
        DateTime updatedAt
    }
```

### Constraints & Indexes
- `Shipment.jobNo`: `@unique`
- `Shipment`: `@@index([status])`, `@@index([eta])`, `@@index([jobNo])`
- `ActivityLog`: `@@index([shipmentId])`, `@@index([createdAt])`
- `ShipmentTask`: `@@unique([shipmentId, stepOrder])`, `@@index([shipmentId])`
- `Reminder`: `@@index([shipmentId])`, `@@index([completed, dueDate])`
- `Todo`: `@@index([shipmentId])`
- `TerminalMonitor`: `@unique([containerNo])`, `@@index([isActive])`
- `VesselMonitor`: `@@unique([vesselName, port])`, `@@index([isActive])`
- `WaSubscription`: `@unique([targetId])`, `@@index([isActive, expiredAt])`

---

## 5. API Endpoints Specification

### 1. Cron Monitoring Endpoint
- **URL**: `/api/cron/monitor`
- **Method**: `GET`
- **Authentication**: Optional Bearer Token (`Authorization: Bearer <CRON_SECRET>`). Diskusikan validasi header jika `CRON_SECRET` terpasang di `.env`.
- **Request**: None (Query parameters ignored).
- **Response**:
  ```json
  {
    "success": true,
    "message": "Cron job executed successfully.",
    "details": [
      { "type": "container", "containerNo": "EMCU6137410", "status": "Updated to GNSTK (isActive: true)" },
      { "type": "vessel", "vesselName": "JOSEPHINE MAERSK", "port": "npct1", "status": "OpenStack updated: 2026-07-25 01:00:00" }
    ]
  }
  ```
- **Flow**:
  1. Ambil semua baris `TerminalMonitor` dan `VesselMonitor` di mana `isActive = true`.
  2. Untuk kontainer, panggil `trackTerminalContainer`. Jika status berubah/GNSTK/OUTGT, kirim notifikasi & update DB.
  3. Untuk kapal, panggil `trackVesselSchedule(port, vesselName)`. Jika jadwal Open Stacking tersedia / berubah, update DB `VesselMonitor` dan kirim notifikasi instan WhatsApp & Telegram.

### 2. WhatsApp WAHA Webhook Endpoint
- **URL**: `/api/webhook/waha`
- **Method**: `POST`
- **Authentication**: Non-authenticated (Public webhook destination untuk WAHA container).
- **Request Payload**:
  ```json
  {
    "event": "message",
    "payload": {
      "from": "628123456789@c.us",
      "fromMe": false,
      "body": "/openstack JOSEPHINE MAERSK NPCT1"
    }
  }
  ```
- **Response**: `{ "success": true, "message": "Command dispatched successfully" }`

---

## 6. Server Actions Inventory

| File | Exported Function | Parameter | Response | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `actions/shipment-action.ts` | `createShipmentAction` | `formData: unknown` | `ActionResponse<ShipmentWithRelations>` | Validasi schema `shipmentSchema` & buat shipment baru + tasks + reminders. |
| `actions/shipment-action.ts` | `updateShipmentDatesAction` | `id: string, formData: unknown` | `ActionResponse` | Validasi `updateShipmentDatesSchema` & update tanggal ETA/ETD/Open CY/Close CY. |
| `actions/shipment-action.ts` | `toggleTaskAction` | `taskId, shipmentId, completed, notes?` | `ActionResponse` | Update status task sekuensial & re-kalkulasi status shipment / reminder terkait. |
| `actions/shipment-action.ts` | `updateTaskNoteAction` | `taskId, shipmentId, notes` | `ActionResponse` | Simpan catatan tambahan pada task tertentu & catat `ActivityLog`. |
| `actions/shipment-action.ts` | `toggleReminderAction` | `id, completed, shipmentId?` | `ActionResponse` | Update status reminder & sync otomatis ke matching task title jika ada. |
| `actions/shipment-action.ts` | `getShipmentQuickViewAction` | `id: string` | `ActionResponse<unknown>` | Ambil detail singkat shipment untuk modal quick view (log terbaru & pending todos). |
| `actions/monitor-action.ts` | `enableTerminalMonitoring` | `containerNo, port, status, waNumber?, vesselName?, voyageNo?` | `ActionResponse<{message: string}>` | Pendaftaran kontainer ke tabel `TerminalMonitor` (upsert) & notifikasi awal. |
| `actions/vessel-action.ts` | `searchVesselScheduleAction` | `port, vesselName, line?` | `ActionResponse<VesselTrackingResult>` | Scrape & return real-time vessel schedule & open stacking data untuk terminal terkait. |
| `actions/vessel-action.ts` | `enableVesselMonitoringAction` | `vesselName, port?, waNumber?` | `ActionResponse<{message: string}>` | Pendaftaran auto-monitoring open stack kapal ke tabel `VesselMonitor`. |
| `actions/terminal-track-action.ts` | `trackTerminalContainer` | `port, containerNo, vesselName?, voyageNo?` | `TerminalTrackingResult` | Wrapper server action untuk memanggil port tracker terpilih. |
| `actions/track-action.ts` | `trackShipmentAction` | `carrier, searchType, searchText` | `UnifiedTrackingResult` | Track live shipping lines (ONE Line / Evergreen EMC). |
| `actions/todo-action.ts` | `addTodoAction` | `shipmentId, text` | `{ success: boolean, error?: string }` | Menambahkan todo khusus shipment. |
| `actions/todo-action.ts` | `toggleTodoAction` | `id, isDone, shipmentId` | `{ success: boolean, error?: string }` | Centang/uncentang todo khusus shipment. |
| `actions/todo-action.ts` | `deleteTodoAction` | `id, shipmentId` | `{ success: boolean, error?: string }` | Hapus todo khusus shipment. |
| `actions/daily-todo-action.ts` | `getDailyTodosAction` | - | `{ success: boolean, data?: DailyTodo[], error?: string }` | Ambil semua daily todo. |
| `actions/daily-todo-action.ts` | `createDailyTodoAction` | `text: string` | `{ success: boolean, data?: DailyTodo, error?: string }` | Buat daily todo baru. |
| `actions/daily-todo-action.ts` | `toggleDailyTodoAction` | `id: string, isDone: boolean` | `{ success: boolean, data?: DailyTodo, error?: string }` | Toggle daily todo. |
| `actions/daily-todo-action.ts` | `deleteDailyTodoAction` | `id: string` | `{ success: boolean, error?: string }` | Hapus daily todo. |


---

## 7. Services Specifications

### `ShipmentService` (`service/shipment-service.ts`)
- `createShipment(values: ShipmentFormValues)`:
  - Mengatur `workflowSteps` (17 steps Import / 8 steps Export).
  - Menghitung `dueDate` untuk 5 template pengingat (`baseDate - daysBeforeEta`).
  - Menginisialisasi `currentStep = 0`, `nextAction = workflowSteps[1]`, `status = ACTIVE`.
  - Mengirim query ke repository via transaction (`prisma.shipment.create` include `tasks`, `reminders`, `activityLogs`).
- `toggleTaskProgress(taskId, shipmentId, completed, notes?, skipReminderUpdate?)`:
  - Mengubah status task & tanggal `completedAt`.
  - Menulis log ke `ActivityLog`.
  - Menghitung index task terakhir yang `completed`.
  - Jika task terakhir selesai, set status shipment ke `COMPLETED` dan `nextAction = "Archive Complete"`.
  - Sinkronisasi otomatis ke `Reminder` yang judulnya sesuai.
- `toggleReminderProgress(reminderId, completed)`:
  - Mengubah status reminder.
  - Memeta judul reminder ke judul task (misal: "Check Draft PIB" -> "Draft PIB") dan meng-update status task terkait jika ada.
- `updateShipmentDates(id, values)`:
  - Memperbarui atribut tanggal jadwal shipment & menulis entry `ActivityLog`.

### `DashboardService` (`service/dashboard-service.ts`)
- `getMetrics()`: Mengkalkulasi 4 nilai statistik KPI secara paralel via `Promise.all()`:
  1. `totalActive`: Shipment dengan `status = "ACTIVE"`.
  2. `needActionToday`: Reminder `completed = false` & `dueDate` di rentang hari ini (`startOfDay` s/d `endOfDay`).
  3. `overdueReminders`: Reminder `completed = false` & `dueDate < startOfDay(now)`.
  4. `etaThisWeek`: Shipment active dengan `eta` antara hari ini s/d akhir minggu (`endOfWeek`).
- `getActionBoard()`: Mengambil 3 list reminder beserta relasi `shipment`:
  1. `overdue`: Reminder `completed = false` & `dueDate < startOfDay(now)` (Urut `dueDate asc`).
  2. `today`: Reminder `completed = false` & `dueDate` hari ini (Urut `priority desc`).
  3. `upcoming`: Reminder `completed = false` & `dueDate > endOfDay(now)` (Take 15, urut `dueDate asc`).
- `getActiveShipments()`: Mengambil semua shipment aktif beserta task yang belum selesai (urut `eta asc`).

---

## 8. Utilities & Helpers

- `lib/prisma.ts`: Export singleton PrismaClient instance menggunakan `@prisma/adapter-pg` & global node connection caching.
- `lib/env.ts`: Parsing dan validasi variabel `.env` dengan schema Zod saat aplikasi booting.
- `lib/errors.ts`: Modul standar custom errors (`AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `DatabaseError`).
- `lib/fetch-with-retry.ts`: Helper `fetchWithRetry(url, options)` dengan dukungan `retries`, `retryDelayMs`, dan `timeoutMs` (AbortController). Hanya melempar exception/retry jika status `>= 500` atau network error.
- `lib/telegram.ts`: Helper `sendTelegramMessage(text)` untuk mengirim pesan HTML ke Telegram Bot.
- `lib/whatsapp.ts`: Helper `sendWhatsappMessage(phone, text)` untuk mengirim pesan teks ke WAHA WhatsApp Gateway (auto format `@c.us`).
- `lib/whatsapp-message.ts`: Objek formatter pesan balasan WhatsApp standar (`trackingStarted`, `trackingFailed`, `monitoringEnabled`, `statusChangedToGNSTK`, `outgate`, `changedToOb`, `listTrack`, dll).
- `lib/workflow.ts`: Definisi array konstanta langkah-langkah workflow dan template reminder untuk IMPORT dan EXPORT.
- `lib/validator.ts`: Zod schema `shipmentSchema` dan `updateShipmentDatesSchema`.
- `actions/tracking/utils.ts`: Helper `getCheerio(html)` untuk dinamik import Cheerio, `isGateOut(status)` untuk pengecekan status keluar, dan `parseDate(dateStr)`.

---

## 9. Middleware & Control Flow (`proxy.ts`)

Next.js 16+ menggunakan konvensi `proxy.ts` di root project untuk menggantikan `middleware.ts`. Kontrol alur dan perlindungan API dikelola melalui:
1. **Request Interception (`proxy.ts`)**: Memeriksa token JWT (`auth_token` cookie / Bearer header) untuk memproteksi halaman dashboard dan API internal, serta mengizinkan akses ke halaman publik.
2. **Dynamic Directive `export const dynamic = "force-dynamic"`**: Digunakan pada route `/api/cron/monitor` dan halaman-halaman dashboard real-time (`/terminal-tracker`, `/tracker`, `/shipments`) untuk mencegah Next.js caching static ISR.
3. **Cron Bearer Authentication**: Verifikasi token `Authorization: Bearer <CRON_SECRET>` langsung pada handler `GET` di `/api/cron/monitor/route.ts`.
4. **Zod Validation Input**: Pintu masuk Server Actions (`shipment-action.ts`, `monitor-action.ts`, `track-action.ts`) divalidasi ketat oleh Zod schema sebelum menyentuh layer Service/Database.

---

## 10. Authentication Flow

1. **User Credentials & JWT Authentication System**:
   - **Credentials**: Autentikasi berbasis Username & Password. Password dienkripsi menggunakan `bcryptjs`.
   - **Security**: Token JWT disign & diverifikasi menggunakan library Edge-compatible `jose`. Token disimpan dalam cookie HttpOnly `auth_token` dan didukung via `Authorization: Bearer <token>` header untuk request API langsung.
   - **Proteksi Halaman & Intercept Proxy (`proxy.ts`)**:
     - **Public Routes**: `/terminal-tracker` (Track Container), `/tracker` (Carrier Live Track), `/auth/login`, `/api/cron/*`, `/api/webhook/*`.
     - **Protected Routes**: Seluruh halaman operasional (`/`, `/shipments/*`, `/todos*`, `/subscriptions*`) serta internal API endpoints. Pengakses tanpa token valid otomatis di-redirect ke `/auth/login?redirect=<path>`.
   - **Default Admin Seed**: Sistem secara otomatis menginisialisasi user admin default (`admin` / `Muhamad Andri`) jika tabel `User` masih kosong.
   - **UI Footer Sidebar**: Footer sidebar menampilkan inisial avatar & nama user terautentikasi (contoh: `MA (Muhamad Andri)`). Klik pada footer membuka modal profile user dan tombol logout.

2. **Cron Authentication**:
   - Request luar (Vercel Cron / cron-job.org) mengirim header `Authorization: Bearer <CRON_SECRET>`.
   - Endpoint `/api/cron/monitor` membandingkan nilai header tersebut dengan `process.env.CRON_SECRET`. Jika tidak cocok, melempar HTTP 401 Unauthorized.

3. **External Port Authentication (TER3 / PARAMA Pelindo)**:
   - Scraper `ter3.ts` memerlukan sesi terautentikasi ke server Pelindo (`https://parama.pelindo.co.id:8031/api/login`).
   - Kredensial disimpan di `.env` (`PARAMA_USERNAME` & `PARAMA_PASSWORD`).
   - Sesi terautentikasi (`sessionId`, `cookieStr`, dll) disimpan secara presisten ke PostgreSQL pada tabel `SystemConfig` dengan key `"TER3_SESSION"`.
   - Ketika request tracking TER3 gagal atau expired (HTTP status bukan `code: "1"`), sistem secara otomatis melakukan re-login, memperbarui cookie & token baru ke database, lalu mengulang request.

---

## 11. Scheduler & Cron Inventory

### 1. External Cron Endpoint (`/api/cron/monitor`)
- **Invoker**: Cron Service Eksternal (Vercel Cron / cron-job.org)
- **Interval**: Setiap 30 menit (`*/30 * * * *`)
- **Tujuan**: Memeriksa seluruh kontainer aktif di `TerminalMonitor`, mengambil status terbaru dari port pelabuhan, meng-update status database, serta memicu pesan alert (Telegram & WhatsApp) jika posisi kontainer berubah menjadi `GNSTK`, `OB`, atau `OUTGT`.

### 2. Standalone Cron Daemon (`scripts/monitor-terminals.ts`)
- **Invoker**: Node process (`npm run monitor` / `tsx scripts/monitor-terminals.ts`)
- **Interval**: Setiap 30 menit via package `node-cron`
- **Tujuan**: Menjalankan fungsi polling otomatis yang sama dengan endpoint API untuk deployment server non-Vercel (misalnya VM / VPS independen).

---

## 12. Monitoring Container End-to-End Flow

```
[User / WhatsApp / Form]
           │
           ▼
1. Track Container Request ──► [trackTerminalContainer()]
           │
           ▼
2. Fetch Current Port Status (JICT / KOJA / NPCT1 / TMAL / TER3)
           │
           ├───────────────► Status = OUTGATE? ──► Selesai (Tidak Di-monitor)
           │
           ▼
3. Register to Watchlist ──► [enableTerminalMonitoring()]
           │
           ├───────────────► Check WhatsApp Target Subscription (`checkWaSubscription`)
           │                 ├── Not Subscribed / Expired / Suspended / Quota Exceeded ──► Return Error (STOP)
           │                 └── Allowed / No WA Number ──► Continue
           ▼
4. Database Entry Created/Updated (TerminalMonitor: isActive = true, status = 'ONVSL'/'INITIAL')
           │
           ▼
5. Cron Job Triggered (Every 30 Mins via /api/cron/monitor or node-cron)
           │
           ▼
6. Re-Fetch Status from Terminal Engine
           │
           ▼
7. Status Changed?
    ├── NO  ──► Lanjut ke kontainer berikutnya
    └── YES ──► Update DB (TerminalMonitor.status = newStatus)
                 │
                 ├── Status == 'GNSTK'? ──► Send Telegram & WhatsApp Alert
                 ├── Status == 'OB'?    ──► Send WhatsApp OB Alert
                 └── Status == 'OUTGT'? ──► Send Outgate Alert & Set isActive = false (STOP MONITORING)
```

---

## 13. Port Tracking Implementations & Differences

| Terminal | Engine | Strategy / Protocol | Auth Requirements | Identifikasi Status GNSTK | Identifikasi Status OUTGATE |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JICT** | API JSON & TLS Socket | Form POST `jict.co.id/container-tracking-search` + TLS Socket ke `bcondemand.jict.co.id` untuk cek OB | None | Array `data[20]` memuat `GNSTK` | Array `data[20]` memuat `OUTGATE` / `GATE OUT` |
| **KOJA** | HTML Parsing (Cheerio) | Form POST `tpkkoja.co.id/online-consignee-container-tracking/` | None | Field "In Time / Stack CY" terisi tanggal valid & Location bukan `ONVSL` | Location memuat `GATE OUT` / `DELIVERED` atau field "Out Time" terisi |
| **NPCT1** | HTML & Redirect Flow | CSRF Cookie Fetch `npct1.co.id/` ──► POST `/req/container` ──► Redirect GET Result Page | CSRF Token & Cookies | Text `.status-desc` memuat `STACKING YARD` (didi-normalize ke `GNSTK`) | Text `.status-desc` memuat `GATEOUT TERMINAL` |
| **TMAL** | HTML Parsing (Cheerio) | Form POST `malt300.com/Layanan/statusImpor` + GET Detail URL | None | "Tanggal Bongkar" terisi & status bukan `ON VESSEL` | Detail page memuat match `"Tanggal Keluar"` |
| **TER3 / PARAMA**| JSON REST API | POST `parama.pelindo.co.id:8031/gateway-8021/api/parama/getContainerDetail` | Login Session (`sessionId` & Cookie) | Field `activity` / `statusCode` memuat `YARD STACK` (didi-normalize ke `GNSTK`) | Field `activity` / `statusCode` memuat `GATE OUT` |

---

## 14. Notification Engines & Flow

### 1. WhatsApp Engine (WAHA API)
- **Konfigurasi ENV**: `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION` (default: `"default"`).
- **Format Target**: Telepon otomatis ditambah suffix `@c.us` jika belum memiliki `@`.
- **Trigger Points**:
  - Pendaftaran auto-monitoring berhasil/gagal (`monitoringEnabled`, `monitoringFailed`).
  - Update status kontainer berubah ke `GNSTK`, `OB`, atau `OUTGT` via Cron.
  - Eksekusi command balasan `/track`, `/list`, `/help` via webhook dispatcher.

### 2. Telegram Engine
- **Konfigurasi ENV**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- **API Target**: `https://api.telegram.org/bot<TOKEN>/sendMessage` (dengan `parse_mode: "HTML"`).
- **Trigger Points**:
  - Ketika kontainer pertama kali ditambahkan ke watchlist (`MONITORING STARTED`).
  - Ketika kontainer mendapatkan alokasi yard (`GNSTK`) untuk pertama kali (`YARD ALLOCATION UPDATE`).

---

## 15. Environment Variables Inventory

| Variable Name | Required | Default / Sample Value | Fungsi / Peruntukan |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Ya** | `postgres://postgres:postgres@localhost:15432/shipment_track` | Connection string PostgreSQL database (Prisma adapter) |
| `TELEGRAM_BOT_TOKEN` | Optional | `8911272453:AAEKatHe...` | Authentication token Telegram Bot API |
| `TELEGRAM_CHAT_ID` | Optional | `7204464066` | Target Chat/Group ID pengiriman notifikasi Telegram |
| `CRON_SECRET` | Optional | `KMASLDKMNOINFNK...` | Secret key penjamin otentikasi request `/api/cron/monitor` |
| `WAHA_URL` | Optional | `https://wa.mohaproject.tech` | Base URL server instance WAHA WhatsApp Gateway |
| `WAHA_API_KEY` | Optional | `Lollipop5.0qwerty244` | Header `X-Api-Key` untuk otentikasi API WAHA |
| `WAHA_SESSION` | Optional | `default` | Nama session active pada WAHA WhatsApp instance |
| `PARAMA_USERNAME` | Optional | `Solichin80` | Username login portal TER3 PARAMA Pelindo |
| `PARAMA_PASSWORD` | Optional | `Arnesya@27` | Password login portal TER3 PARAMA Pelindo |

---

## 16. External API Integrations

1. **ONE Line Track & Trace API**: `POST https://ecomm.one-line.com/api/v2/edh/containers/track-and-trace/search`
2. **Evergreen EMC Shipping Link**: `POST https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do`
3. **JICT Container Tracking**: `POST https://www.jict.co.id/container-tracking-search` & TLS `bcondemand.jict.co.id:443`
4. **TPK KOJA Online Tracking**: `POST https://www.tpkkoja.co.id/online-consignee-container-tracking/`
5. **NPCT1 Portal Tracking**: `POST https://www.npct1.co.id/req/container`
6. **TMAL MALT300 Tracking**: `POST https://malt300.com/Layanan/statusImpor`
7. **PARAMA Pelindo TER3 Portal API**: `POST https://parama.pelindo.co.id:8031/api/login` & `/gateway-8021/api/parama/getContainerDetail`
8. **Telegram Bot API**: `POST https://api.telegram.org/bot<TOKEN>/sendMessage`
9. **WAHA WhatsApp Gateway**: `POST <WAHA_URL>/api/sendText`

---

## 17. Known Issues & Architectural Edge Cases

1. **NPCT1 Voyage Number Length**: Scraper NPCT1 memotong 4 karakter terakhir voyage (`voyageNo.slice(-4)`). Jika format voyage pelayaran kurang dari 4 karakter atau mengandung format non-standar, server NPCT1 dapat mengembalikan `redirectUrl` null.
2. **PARAMA TER3 Session Expiration**: Meskipun sesi TER3 disimpan di DB (`SystemConfig`), token dapat kadaluarsa di sisi Pelindo tanpa pemberitahuan HTTP 401 (mengembalikan `code != "1"`). Handler telah menangani ini dengan re-login otomatis, namun memerlukan 2x HTTP roundtrip.
3. **Chunked Encoding Fallback pada JICT TLS Socket**: Socket kustom pada `jict.ts` melakukan parsing manual HTTP chunked response. Jika server JICT mengubah format response menjadi non-chunked, parser jatuh ke fallback raw string.

---

## 18. Planned Improvements

1. **Global Rate-Limiting & Queueing for Scrapers**: Mengimplementasikan queue (misal BullMQ atau in-memory throttle) untuk scraping terminal agar IP tidak terblokir saat request berbarengan.
2. **Error Boundary & Retry Metrics**: Menambahkan logging performa response time untuk masing-masing port tracking ke tabel `SystemConfig` atau telemetry log.

---

## 19. Codebase TODOs Inventory

- **NPCT1 ONVESSEL Status Mapping**: Menambahkan sample data rincian status NPCT1 untuk membedakan kontainer yang masih di atas kapal vs sudah stacking.
- **Shipment Quick View Additional Details**: Menambahkan preview item todo yang tertunda pada komponen dialog modal Quick View.

---

## 20. Coding Conventions

- **Shadcn UI First**: Wajib menggunakan komponen Shadcn (`@/components/ui/*`) daripada elemen HTML polos.
- **Design Tokens & Tailwind CSS**: Selalu gunakan warna Tailwind token (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) tanpa hardcode hex color `#333` atau `gray-500`.
- **Strict TypeScript**: Tidak boleh menggunakan `any`. Exception caught harus di-cast ke `unknown` lalu difilter `error instanceof Error`.
- **Server Action Responses**: Selalu mengembalikan objek berskema `ActionResponse<T>` (`{ success: true, data: T }` atau `{ success: false, error: string, code?: string }`).
- **Input Validation**: Menggunakan Zod `safeParse` / `parse` di Server Actions & Form hooks.
