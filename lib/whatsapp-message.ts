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
  ) => `✅ *Auto Monitoring Aktif*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status saat ini

🟡 *${status}*

Sistem akan melakukan pengecekan otomatis secara berkala.`,

  monitoringFailed: (
    container: string,
    port: string,
    status: string,
    error: string,
  ) => `⚠️ *Monitoring Gagal Diaktifkan*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status saat ini

🟡 *${status}*

Namun terjadi kesalahan saat mengaktifkan auto monitoring.

Detail

${error}`,

  statusChangedToGNSTK: (
    container: string,
    port: string,
    time: string,
  ) => `🎉 *Update Status Kontainer*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status terbaru

🟢 *GNSTK*

Waktu

🕒 ${time}

Kontainer telah memperoleh lokasi yard.`,

  statusChanged: (
    container: string,
    port: string,
    oldStatus: string,
    newStatus: string,
    time: string,
  ) => `🔄 *Update Status Kontainer*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status berubah dari *${oldStatus}* menjadi:
🟡 *${newStatus}*

Waktu
🕒 ${time}`,

  outgate: (
    container: string,
    port: string,
    time: string,
  ) => `🚚 *Kontainer OUTGATE*

📦 Container : *${container}*
🏗️ Terminal   : *${port.toUpperCase()}*

Status terbaru
🏁 *OUTGATE*

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

/list

/help`,
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
};
