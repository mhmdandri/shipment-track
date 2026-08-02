import { isOutgateStatus, isYardStatus } from "@/actions/tracking/utils";

export const whatsappMessage = {
  trackingStarted: (container: string, port: string) => `🔍 *Pengecekan Dimulai*

Sedang memeriksa status kontainer.

📦 Container : *${container}*
🏢 Terminal   : *${port.toUpperCase()}*

Automonitoring aktif. Mohon tunggu jika ada update...`,

  trackingMultiStarted: (
    count: number,
    port: string,
  ) => `🔍 *Pengecekan Dimulai*

Sedang memeriksa status *${count} kontainer* sekaligus.

🏢 Terminal   : *${port.toUpperCase()}*

Automonitoring aktif. Mohon tunggu jika ada update...`,

  invalidCommand: () => `❌ *Format Perintah Salah*

Gunakan format berikut:

track <Container> <Terminal>

Contoh:

track EMCU6137410 JICT

Untuk NPCT1:

track EMCU6137410 NPCT1 EVBIT 080B`,

  npctMissingData: () => `❌ *Data Belum Lengkap*

Terminal *NPCT1* memerlukan:

• Vessel Code
• Voyage No

Contoh:

track EMCU6137410 NPCT1 EVBIT 080B`,

  trackingFailed: (
    container: string,
    port: string,
    error: string,
  ) => `❌ *Kontainer Tidak Ditemukan*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Silakan pastikan:

• Nomor container benar
• Terminal sesuai
• Data tersedia di website terminal

Detail:

${error}`,

  monitoringEnabled: (
    container: string,
    port: string,
    status: string,
  ) => {
    let emoji = "🟡";
    if (isYardStatus(status)) emoji = "🟢";
    if (isOutgateStatus(status)) emoji = "🏁";
    if (status.includes("(OB)")) emoji = "🚨";
    return `✅ *Auto Monitoring Aktif*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status saat ini

${emoji} *${status}*

Sistem akan melakukan pengecekan otomatis secara berkala.`;
  },

  monitoringFailed: (
    container: string,
    port: string,
    status: string,
    error: string,
  ) => {
    let emoji = "🟡";
    if (isYardStatus(status)) emoji = "🟢";
    if (isOutgateStatus(status)) emoji = "🏁";
    if (status.includes("(OB)")) emoji = "🚨";
    return `⚠️ *Monitoring Gagal Diaktifkan*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status saat ini

${emoji} *${status}*

Namun terjadi kesalahan saat mengaktifkan auto monitoring.

Detail

${error}`;
  },

  alreadyMonitored: (
    container: string,
    port: string,
    status: string,
  ) => {
    let emoji = "🟡";
    if (isYardStatus(status)) emoji = "🟢";
    if (isOutgateStatus(status)) emoji = "🏁";
    if (status.includes("(OB)")) emoji = "🚨";
    return `ℹ️ *Kontainer Sudah Dipantau*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status saat ini

${emoji} *${status}*

Kontainer ini sudah masuk dalam daftar auto monitoring aktif.`;
  },

  statusChangedToGNSTK: (
    container: string,
    port: string,
    time: string,
    status?: string,
  ) => `🎉 *Update Status Kontainer*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status terbaru

🟢 *${status || "GNSTK"}*

Waktu

🕒 ${time}

Kontainer telah dibongkar / memperoleh lokasi yard.`,

  statusChanged: (
    container: string,
    port: string,
    oldStatus: string,
    newStatus: string,
    time: string,
  ) => {
    let emoji = "🟡";
    if (isYardStatus(newStatus)) emoji = "🟢";
    if (isOutgateStatus(newStatus)) emoji = "🏁";
    if (newStatus.includes("(OB)")) emoji = "🚨";
    return `🔄 *Update Status Kontainer*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status berubah dari *${oldStatus}* menjadi:
${emoji} *${newStatus}*

Waktu
🕒 ${time}`;
  },

  outgate: (
    container: string,
    port: string,
    time: string,
    customer: string,
  ) => `🚚 *Kontainer OUTGATE*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status terbaru
🏁 *OUTGATE* to *${customer}*

Waktu Keluar
🕒 ${time}

Monitoring selesai`,

  pulledToOb: (
    container: string,
    port: string,
    time: string,
    obName: string,
  ) => `🚚 *Kontainer Ditarik ke Gudang OB*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*
🏢 Gudang     : *${obName}*

Status terbaru
🏁 *OUTGATE* to *${obName}*

Waktu Keluar
🕒 ${time}

Monitoring selesai`,

  unknownCommand: () => `❌ *Unknown Command*

Type

/help

to see available commands.`,

  help: () => `*Available Commands*

/track <container> <terminal>

/track <container> NPCT1 <Vessel> <Voyage>

/status <container>

/cekport <VESSEL NAME>

/openstack <VESSEL NAME> <TERMINAL>

/list

/cekid

/help`,

  cekId: (sender: string) => {
    const isGroup = sender.toLowerCase().endsWith("@g.us");
    const cleanId = sender.split("@")[0].trim();

    let msg = `🆔 *INFO ID WHATSAPP*\n\n`;
    msg += `📍 *ID Target* : *${cleanId}*\n`;
    msg += `👥 *Tipe*      : *${isGroup ? "Grup WhatsApp" : "Nomor Personal"}*\n\n`;
    msg += `_Salin ID di atas untuk pendaftaran langganan di Web Dashboard._`;
    return msg;
  },

  invalidStatusCommand: () => `❌ *Format Perintah Salah*

Gunakan format berikut:
/status <no_container>
atau multi kontainer:
/status <no_container_1> <no_container_2>

Contoh Single:
/status EMCU6137410

Contoh Multi:
/status EMCU6137410 TCKU1234567 TEMU9876543`,

  subscriptionRequired: (sender: string) => {
    const cleanId = sender.split("@")[0].trim();
    return `⚠️ *Akses Langganan Diperlukan*

Nomor / Grup WhatsApp Anda (*${cleanId}*) belum terdaftar dalam paket langganan Bot Container Tracker.

Gunakan perintah /cekid untuk mendapatkan ID Anda, lalu hubungi Admin untuk mendaftarkan akun langganan Anda.`;
  },

  subscriptionExpired: (expiredAt: Date) => `❌ *Masa Langganan Berakhir*

Masa langganan Bot Container Tracker Anda telah berakhir pada *${new Date(expiredAt).toLocaleDateString("id-ID")}*.

Silakan lakukan perpanjangan langganan melalui Admin untuk mengaktifkan kembali layanan.`,

  subscriptionSuspended: () => `🚫 *Akses Langganan Dinonaktifkan*

Akun langganan Anda saat ini sedang dalam status dinonaktifkan / suspend.

Silakan hubungi Admin untuk informasi lebih lanjut.`,

  quotaExceeded: (
    currentCount: number,
    maxAllowed: number,
  ) => `⚠️ *Kuota Kontainer Terpenuhi*

Jumlah kontainer aktif Anda telah mencapai batas maksimal paket langganan:

📦 Kontainer Aktif : *${currentCount}* dari *${maxAllowed}*

Silakan upgrade paket langganan atau tunggu hingga kontainer yang ada selesai (OUTGATE) untuk mendaftarkan kontainer baru.`,

  containerNotFoundForStatus: (
    container: string,
  ) => `❌ *Kontainer Tidak Ditemukan*

Kontainer *${container}* tidak ditemukan dalam sistem monitoring aktif.

Gunakan perintah berikut untuk mendaftarkan kontainer:

/track ${container} <terminal>`,

  statusFetchFailed: (
    container: string,
    port: string,
    lastStatus: string,
    error: string,
  ) => `⚠️ *Gagal Fetch Realtime Status*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status Terakhir:
🟡 *${lastStatus}*

Detail Error:
${error}`,

  statusRealtime: (
    container: string,
    port: string,
    status: string,
    time: string,
    isMonitored: boolean,
    vessel?: string,
    voyage?: string,
    obName?: string,
  ) => {
    const upper = status.toUpperCase();
    let emoji = "🟡";
    if (isYardStatus(status)) emoji = "🟢";
    if (isOutgateStatus(status)) {
      emoji = "🏁";
    }
    if (upper.includes("(OB)") || upper.includes("OB ")) emoji = "🚨";

    let msg = `📊 *Status Kontainer*\n\n`;
    msg += `📦 Container : *${container}*\n`;
    msg += `🏗️ Terminal   : *${port.toUpperCase()}*\n`;
    if (vessel) msg += `🚢 Vessel     : *${vessel}*\n`;
    if (voyage) msg += `⛵ Voyage     : *${voyage}*\n`;
    if (obName) msg += `🏢 Gudang OB  : *${obName}*\n`;
    msg += `\nStatus Terbaru:\n${emoji} *${status}*\n`;
    msg += `\nWaktu Update:\n🕒 ${time}\n`;
    msg += `\nMonitoring:\n${isMonitored ? "✅ *Aktif*" : "⚪ *Selesai / Non-aktif*"}`;
    return msg;
  },
  changedToOb: (
    container: string,
    port: string,
    status: string,
    ob?: string,
    obName?: string,
  ) => `🚨 *CONTAINER OB* 🚨

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*
🏢 Gudang     :  *${obName}*

Status saat ini

🟡 *${status} (${ob})*

Sistem akan melakukan pengecekan otomatis secara berkala.`,

  listTrack: (
    total: number,
    items: { containerNo: string; port: string; status: string }[],
  ) => {
    if (total === 0) return `ℹ️ Anda belum memantau kontainer apapun.`;

    let listStr = `📋 *Active Monitoring*\n\n`;
    items.forEach((item, index) => {
      listStr += `${index + 1}.\n\n📦 ${item.containerNo}\n🏢 ${item.port.toUpperCase()}\nStatus : ${item.status}\n\n`;
    });
    listStr += `Total :\n${total} Container(s)`;
    return listStr;
  },

  npct1VesselMonitoringEnabled: (
    vessel: string,
    status: string,
    openStacking: string,
    etb: string,
    port: string = "NPCT1",
  ) => {
    const cleanPort = port.toUpperCase();
    return `🚢 *Auto Monitoring Kapal (${cleanPort}) Aktif*

🚢 Vessel        : *${vessel}*
📋 Status        : *${status}*
📅 Open Stacking: *${openStacking}*
🕒 ETB          : *${etb}*

Sistem akan memberikan notifikasi otomatis saat jadwal Open Stacking tersedia / terupdate di ${cleanPort}.`;
  },

  npct1OpenStackResult: (
    vessel: string,
    line: string,
    voyIn: string,
    voyOut: string,
    status: string,
    openStacking: string,
    etb: string,
    etd: string,
    closingPhysic: string,
    port: string = "NPCT1",
  ) => {
    const cleanPort = port.toUpperCase();
    return `⚓ *${cleanPort} Vessel Open Stack Schedule*

🚢 Vessel        : *${vessel}*
🏢 Line          : *${line || "-"}*
⛵ Voy In / Out  : *${voyIn || "-"} / ${voyOut || "-"}*
📊 Status        : *${status}*

📅 *OPEN STACKING*: *${openStacking || "BELUM TERSEDIA"}*
🕒 ETB          : *${etb || "-"}*
🕒 ETD          : *${etd || "-"}*
⏰ Closing Physic: *${closingPhysic || "-"}*`;
  },

  npct1OpenStackAvailableAlert: (
    vessel: string,
    openStacking: string,
    etb: string,
    etd: string,
    status: string,
    port: string = "NPCT1",
  ) => {
    const cleanPort = port.toUpperCase();
    return `🎉 *JADWAL OPEN STACK (${cleanPort}) TERSEDIA!* 🎉

🚢 Vessel        : *${vessel}*
📊 Status        : *${status}*

📅 *OPEN STACKING*: *${openStacking}*
🕒 ETB          : *${etb || "-"}*
🕒 ETD          : *${etd || "-"}*

Silakan persiapkan pengiriman kontainer ke terminal ${cleanPort}.`;
  },

  vesselMultiPortResult: (
    vesselNameQuery: string,
    vessels: Array<{
      vessel?: string;
      vesselName?: string;
      voyIn?: string;
      voyageIn?: string;
      voyOut?: string;
      voyageOut?: string;
      line?: string;
      eta?: string | null;
      etb?: string | null;
      etd?: string | null;
      openStacking?: string | null;
      closingDoc?: string | null;
      port?: string;
      status?: string;
    }>,
  ) => {
    if (vessels.length === 0) {
      return `🔍 *HASIL CEK KAPAL*\n\nKapal: *${vesselNameQuery.toUpperCase()}*\nStatus: ❌ Tidak ditemukan jadwal aktif di JICT, NPCT1, KOJA, TMAL, atau TER3.\n\n_Catatan: Kapal dengan status SAILED / sudah berlayar tidak ditampilkan, atau pastikan ejaan nama kapal sudah benar._`;
    }

    const portLabels: Record<string, string> = {
      jict: "JICT",
      npct1: "NPCT1",
      koja: "TPK KOJA",
      tmal: "TMAL",
      ter3: "TER3 (Pelindo)",
      parama: "TER3 (Pelindo)",
    };

    let msg = `🚢 *JADWAL KAPAL*\n\nPencarian: *${vesselNameQuery.toUpperCase()}*\nDitemukan: *${vessels.length} terminal*\n\n`;

    vessels.forEach((v, index) => {
      const portCode = (v.port || "").toLowerCase().trim();
      const portName =
        portLabels[portCode] || (v.port || "UNKNOWN PORT").toUpperCase();
      const vName = v.vesselName || v.vessel || vesselNameQuery.toUpperCase();
      const voyIn = v.voyageIn || v.voyIn || "";
      const voyOut = v.voyageOut || v.voyOut || "";
      const etaDisplay = v.eta || v.etb;

      msg += `*${index + 1}. ${vName}*\n`;
      msg += `📍 Terminal: *${portName}*\n`;
      if (voyIn || voyOut) {
        msg += `🚢 Voyage: ${voyIn || "-"}${voyOut ? ` / ${voyOut}` : ""}\n`;
      }
      if (v.line) {
        msg += `🏢 Line: ${v.line}\n`;
      }
      if (etaDisplay) {
        msg += `📅 ETA: ${etaDisplay}\n`;
      }
      if (v.etb && v.etb !== etaDisplay) {
        msg += `⚓ Sandar (ETB): ${v.etb}\n`;
      }
      if (v.etd) {
        msg += `🚀 Berangkat (ETD): ${v.etd}\n`;
      }
      if (v.openStacking) {
        msg += `📦 Open Stack: *${v.openStacking}*\n`;
      }
      if (v.closingDoc) {
        msg += `🔒 Closing Doc: ${v.closingDoc}\n`;
      }
      if (v.status) {
        msg += `🏷️ Status: ${v.status}\n`;
      }
      if (index < vessels.length - 1) {
        msg += `----------------------------------\n`;
      }
    });

    return msg.trim();
  },
};
