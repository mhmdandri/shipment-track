export async function getCheerio(html: string) {
  const cheerio = await import("cheerio");
  return cheerio.load(html);
}

export function isOutgateStatus(status?: string): boolean {
  if (!status) return false;
  const upper = status.toUpperCase().trim();
  return (
    ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some((keyword) =>
      upper.includes(keyword)
    ) && !upper.includes("PLANNING")
  );
}

export function isGateOut(status: string): boolean {
  return isOutgateStatus(status);
}

export function isExplicitYardStatus(status?: string): boolean {
  if (!status) return false;
  const upper = status.toUpperCase().trim();
  if (upper.includes("PLANNING")) return false;
  const yardKeywords = [
    "GNSTK",
    "YARD",
    "STACK",
    "LAPANGAN",
    "BLOCK",
    "SLOT",
    "ROW",
    "TIER",
    "STORED",
    "PLACEMENT",
  ];
  return yardKeywords.some((keyword) => upper.includes(keyword));
}

export function isOnVesselStatus(status?: string): boolean {
  if (!status) return true;
  if (isExplicitYardStatus(status)) return false;
  if (isOutgateStatus(status)) return false;

  const upper = status.toUpperCase().trim();
  if (!upper || upper === "UNKNOWN" || upper === "N/A" || upper === "-") {
    return true;
  }

  const vesselKeywords = [
    "ON VESSEL",
    "ONVSL",
    "ON VSL",
    "ONVESSEL",
    "ON_VESSEL",
    "ON BOARD",
    "ONBOARD",
    "ON SHIP",
    "REGISTER",
    "REGISTERED",
    "INIT",
    "INITIAL",
    "PLANNING",
    "MOUNTING",
    "VSDS",
    "DISCHARG",
    "UNLOAD",
    "PIER",
    "QUAY",
    "APRON",
  ];

  return vesselKeywords.some((keyword) => upper.includes(keyword));
}

export function isYardStatus(status?: string): boolean {
  if (!status) return false;
  if (isOutgateStatus(status)) return false;
  if (isExplicitYardStatus(status)) return true;
  if (isOnVesselStatus(status)) return false;

  const upper = status.toUpperCase().trim();
  if (!upper || upper === "UNKNOWN" || upper === "N/A" || upper === "-") {
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

