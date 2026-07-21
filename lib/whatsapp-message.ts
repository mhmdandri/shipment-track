export const whatsappMessage = {
  trackingStarted: (container: string, port: string) => `🔍 *Pengecekan Dimulai*

Sedang memeriksa status kontainer.

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Mohon tunggu beberapa saat...`,

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

  trackingFailed: (container: string, port: string, error: string) => `❌ *Kontainer Tidak Ditemukan*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Silakan pastikan:

• Nomor container benar
• Terminal sesuai
• Data tersedia di website terminal

Detail:

${error}`,

  alreadyGNSTK: (container: string, port: string, time: string) => `✅ *Kontainer Sudah GNSTK*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status

🟢 *GNSTK*

Waktu

🕒 ${time}

Kontainer sudah berada di yard.

Tidak perlu dimonitor lagi.`,

  monitoringEnabled: (container: string, port: string, status: string) => `✅ *Auto Monitoring Aktif*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status saat ini

🟡 *${status}*

Sistem akan melakukan pengecekan otomatis secara berkala.

Anda akan menerima notifikasi setiap ada perubahan status hingga kontainer *OUTGATE*.`,

  alreadyMonitoring: (container: string, port: string) => `ℹ️ *Monitoring Sudah Aktif*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Kontainer sudah berada dalam daftar pemantauan.

Anda akan menerima notifikasi setiap ada perubahan status hingga kontainer *OUTGATE*.`,

  monitoringFailed: (container: string, port: string, status: string, error: string) => `⚠️ *Monitoring Gagal Diaktifkan*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status saat ini

🟡 *${status}*

Namun terjadi kesalahan saat mengaktifkan auto monitoring.

Detail

${error}`,

  currentStatus: (container: string, port: string, status: string) => `📋 *Status Saat Ini*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status

🟡 *${status}*

Monitoring sudah aktif.

Anda akan menerima notifikasi setiap ada perubahan status hingga kontainer *OUTGATE*.`,

  statusChangedToGNSTK: (container: string, port: string, time: string) => `🎉 *Update Status Kontainer*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status terbaru

🟢 *GNSTK*

Waktu

🕒 ${time}

Kontainer telah memperoleh lokasi yard.`,

  statusChanged: (container: string, port: string, oldStatus: string, newStatus: string, time: string) => `🔄 *Update Status Kontainer*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status berubah dari *${oldStatus}* menjadi:
🟡 *${newStatus}*

Waktu
🕒 ${time}`,

  outgate: (container: string, port: string, time: string) => `🚚 *Kontainer OUTGATE*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status terbaru
🏁 *OUTGATE*

Waktu Keluar
🕒 ${time}

Auto monitoring telah dihentikan otomatis.`,

  unknownCommand: () => `❌ *Unknown Command*

Type

/help

to see available commands.`,

  help: () => `*Available Commands*

/track <container> <terminal>

/track <container> NPCT1 <Vessel> <Voyage>

/list

/help`,

  listTrack: (total: number, items: { containerNo: string, port: string, status: string }[]) => {
    if (total === 0) return `ℹ️ Anda belum memantau kontainer apapun.`;
    
    let listStr = `📋 *Active Monitoring*\n\n`;
    items.forEach((item, index) => {
      listStr += `${index + 1}.\n\n📦 ${item.containerNo}\n🏢 ${item.port.toUpperCase()}\nStatus : ${item.status}\n\n`;
    });
    listStr += `Total :\n${total} Container(s)`;
    return listStr;
  },

  stopSuccess: () => `✅ Monitoring stopped`,

  stopFailed: () => `Container is not currently monitored.`,

  statusResult: (container: string, port: string, status: string, time: string) => `📋 *Status Saat Ini*

📦 Container : *${container}*
🏢 Terminal  : *${port.toUpperCase()}*

Status : ${status}
Waktu  : ${time}`
};
