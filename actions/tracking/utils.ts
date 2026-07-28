export async function getCheerio(html: string) {
  const cheerio = await import("cheerio");
  return cheerio.load(html);
}

export function isOutgateStatus(status?: string): boolean {
  if (!status) return false;
  const upper = status.toUpperCase();
  return (
    ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some((keyword) =>
      upper.includes(keyword)
    ) && !upper.includes("PLANNING")
  );
}

export function isGateOut(status: string): boolean {
  return isOutgateStatus(status);
}

export function isYardStatus(status?: string): boolean {
  if (!status) return false;
  if (isOutgateStatus(status)) return false;
  const upper = status.toUpperCase().trim();
  if (
    upper === "ON VESSEL" ||
    upper === "ONVSL" ||
    upper === "REGISTER" ||
    upper === "UNKNOWN" ||
    upper === ""
  ) {
    return false;
  }
  return true;
}

export function parseDate(dateStr: string): string {
  return dateStr.trim();
}

export function isObType(obCode?: string): boolean {
  if (!obCode) return false;
  const upper = obCode.toUpperCase().trim();
  if (
    upper === "IMST" ||
    upper === "IM" ||
    upper === "NORMAL" ||
    upper === "IMPORT"
  ) {
    return false;
  }
  return (
    upper.includes("PLP") || upper.includes("OBX") || upper.includes("OB")
  );
}

