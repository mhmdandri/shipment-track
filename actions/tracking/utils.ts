export async function getCheerio(html: string) {
  const cheerio = await import("cheerio");
  return cheerio.load(html);
}

export function isGateOut(status: string): boolean {
  const upper = status.toUpperCase();
  return (
    upper.includes("GATE OUT") ||
    upper.includes("GATEOUT") ||
    upper.includes("DELIVERED") ||
    upper.includes("OUTGT")
  );
}

export function parseDate(dateStr: string): string {
  return dateStr.trim();
}
