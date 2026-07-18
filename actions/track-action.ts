"use server";

export interface TrackingEvent {
  eventName: string;
  locationName: string;
  countryName: string;
  countryCode?: string;
  date: string;
  triggerType: "ACTUAL" | "PLANNED" | string;
}

export interface ContainerPlace {
  yardCode?: string;
  yardName?: string;
  locationName?: string;
}

export interface ContainerTrackingInfo {
  containerNo: string;
  containerTypeSize: string;
  weight: string;
  latestEvent?: {
    eventName: string;
    locationName: string;
    date: string;
  };
  place?: ContainerPlace;
  events: TrackingEvent[];
}

export interface UnifiedTrackingResult {
  success: boolean;
  error?: string;
  carrier: string;
  bookingNo: string;
  blNo?: string;
  vesselName?: string;
  voyageNo?: string;
  polName?: string;
  podName?: string;
  eta?: string;
  containers: ContainerTrackingInfo[];
}

interface OneSeal {
  sealSequence: number;
  sealNo: string;
}

interface OnePlace {
  yardCode?: string;
  yardName?: string;
  locationName?: string;
}

interface OneLocation {
  code?: string;
  locationName?: string;
  countryName?: string;
}

interface OneCargoEvent {
  matrixId: string;
  eventName?: string;
  locationName?: string;
  countryCode?: string;
  countryName?: string;
  date?: string;
  localPortDate?: string;
  trigger?: string;
}

interface OneVesselVoyage {
  vesselCode?: string;
  vesselName?: string;
  voyageNo?: string;
  directionCode?: string;
}

interface OneDeadlineEvent {
  matrixId: string;
  date?: string;
  localPortDate?: string;
  isShowData?: boolean;
}

interface OneContainerData {
  bookingNo: string;
  containerNo: string;
  containerTypeSize: string;
  weight: string;
  latestEvent?: {
    eventName?: string;
    locationName?: string;
    date?: string;
  };
  socFlag?: boolean;
  seals?: OneSeal[];
  place?: OnePlace;
  por?: OneLocation;
  pod?: OneLocation;
  copNo?: string;
  bookingNoShow?: string;
  cargoEvents?: OneCargoEvent[];
  vesselVoyage?: OneVesselVoyage;
  deadlineEvents?: OneDeadlineEvent[];
}

// Mapping from ONE's internal matrixId codes to human-readable labels
const ONE_EVENT_MAP: Record<string, string> = {
  E001: "Empty Container Picked Up",
  E011: "Gate In at Origin Terminal",
  E061: "Loaded on Vessel",
  E089: "Discharged from Vessel",
  E105: "Gate Out / Import Picked Up",
  E138: "Vessel Arrival at Destination Port",
  E167: "Cargo Cut-off Deadline",
};

function getOneEventName(matrixId: string, defaultName: string = ""): string {
  if (ONE_EVENT_MAP[matrixId]) {
    return ONE_EVENT_MAP[matrixId];
  }
  return defaultName || `Milestone ${matrixId}`;
}

function decodeHtml(str: string): string {
  if (!str) return "";
  let decoded = str;
  
  // 1. Decode hexadecimal entities: &#x...;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_: string, hex: string) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return "";
    }
  });

  // 2. Decode decimal entities: &#...;
  decoded = decoded.replace(/&#([0-9]+);/g, (_: string, dec: string) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return "";
    }
  });

  // 3. Decode standard named entities
  decoded = decoded
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

  // 4. Clean up whitespace
  return decoded.replace(/\s+/g, " ").trim();
}

function parseEvergreenDate(str: string): string | null {
  if (!str) return null;
  const cleaned = decodeHtml(str).toUpperCase().trim();
  const parts = cleaned.split("-");
  if (parts.length !== 3) return cleaned;
  
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
  };
  
  const month = months[parts[0]];
  const day = parts[1].padStart(2, "0");
  const year = parts[2];
  
  if (month && day && year) {
    return `${year}-${month}-${day}`;
  }
  return cleaned;
}

async function trackEvergreenShipment(
  searchType: string,
  searchText: string
): Promise<UnifiedTrackingResult> {
  try {
    const rootUrl = "https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do";
    const bodyParams = new URLSearchParams();
    
    if (searchType === "BKG_NO") {
      bodyParams.set("TYPE", "BK");
      bodyParams.set("bkno", searchText);
      bodyParams.set("SEL", "s_bk");
    } else if (searchType === "CNTR_NO") {
      bodyParams.set("TYPE", "CNTR");
      bodyParams.set("CNTR", searchText);
      bodyParams.set("SEL", "s_cntr");
    } else {
      bodyParams.set("TYPE", "BL");
      bodyParams.set("BL", searchText);
      bodyParams.set("SEL", "s_bl");
    }

    const response = await fetch(rootUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": rootUrl
      },
      body: bodyParams.toString()
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Error communicating with Evergreen server (Status ${response.status})`,
        carrier: "EMC",
        bookingNo: searchText,
        containers: []
      };
    }

    const html = await response.text();

    if (!html.includes("B/L No.") && !html.includes("Container(s) information")) {
      return {
        success: false,
        error: "No active shipment tracking records found for the given reference.",
        carrier: "EMC",
        bookingNo: searchText,
        containers: []
      };
    }

    // 1. ETA
    let etaRaw: string | null = null;
    const etaMatch = html.match(/Estimated Date of Arrival(?:\s+at\s+Destination)?\s*:\s*(?:<[^>]+>\s*)*([A-Z]{3}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (etaMatch) {
      etaRaw = etaMatch[1];
    }
    const eta = parseEvergreenDate(etaRaw || "") || undefined;

    // 2. Ports
    const polMatch = html.match(/Port of Loading<\/th>\s*<td[^>]*>&nbsp;\s*([^<]+)<\/td>/i);
    const polName = polMatch ? decodeHtml(polMatch[1]) : undefined;

    const podMatch = html.match(/Port of Discharge<\/th>\s*<td[^>]*>&nbsp;\s*([^<]+)<\/td>/i);
    const podName = podMatch ? decodeHtml(podMatch[1]) : undefined;

    // 3. Vessel
    const vesselMatch = html.match(/Vessel Voyage on B\/L<\/th>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i);
    const vesselVoyage = vesselMatch ? decodeHtml(vesselMatch[1]) : "";
    let vesselName = "";
    let voyageNo = "";
    if (vesselVoyage) {
      const parts = vesselVoyage.split(/\s+/);
      if (parts.length > 1) {
        voyageNo = parts.pop() || "";
        vesselName = parts.join(" ");
      } else {
        vesselName = vesselVoyage;
      }
    }

    // 4. Form Params
    const frmCntrMoveMatch = html.match(/<form name="frmCntrMove"[\s\S]*?<\/form>/i);
    let onboardDate = "";
    let formPol = "";
    let formPod = "";
    let formPodctry = "";
    let blNoVal = searchText;

    if (frmCntrMoveMatch) {
      const formHtml = frmCntrMoveMatch[0];
      blNoVal = (formHtml.match(/name="bl_no"\s+value="([^"]*)"/i) || [])[1] || blNoVal;
      onboardDate = (formHtml.match(/name="onboard_date"\s+value="([^"]*)"/i) || [])[1] || "";
      formPol = (formHtml.match(/name="pol"\s+value="([^"]*)"/i) || [])[1] || "";
      formPod = (formHtml.match(/name="pod"\s+value="([^"]*)"/i) || [])[1] || "";
      formPodctry = (formHtml.match(/name="podctry"\s+value="([^"]*)"/i) || [])[1] || "";
    }

    const containers: ContainerTrackingInfo[] = [];

    if (searchType === "CNTR_NO") {
      // For container search, parse the moves directly from the 8-column table on the main page.
      const tr8Regex = /<tr[^>]*>\s*<td[^>]*>\s*([^<\s]+)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
      let trMatch: RegExpExecArray | null;
      const cntrMovesMap: Record<string, { containerTypeSize: string; weight: string; events: TrackingEvent[] }> = {};

      while ((trMatch = tr8Regex.exec(html)) !== null) {
        const cNo = decodeHtml(trMatch[1]).trim();
        // Skip header row if matches labels
        if (cNo === "Container No." || cNo === "Container" || cNo === "No.") continue;

        let containerTypeSize = "";
        const sizeHtml = trMatch[2];
        const tooltipMatch = sizeHtml.match(/msg="([^"]*)"/i);
        if (tooltipMatch) {
          containerTypeSize = decodeHtml(tooltipMatch[1]);
        } else {
          containerTypeSize = decodeHtml(sizeHtml.replace(/<[^>]*>/g, ""));
        }

        const dateRaw = trMatch[3].trim();
        const eventDate = parseEvergreenDate(dateRaw);
        const eventName = decodeHtml(trMatch[4]);
        const loc = decodeHtml(trMatch[5]);
        const evVesselVoy = decodeHtml(trMatch[6]);
        const weight = decodeHtml(trMatch[8]);

        if (eventDate) {
          let locationName = loc;
          let countryName = "";
          let countryCode = "";
          
          const locParts = loc.match(/^([^,]+),\s*([^\(]+)\(([^)]+)\)/i);
          if (locParts) {
            locationName = locParts[1].trim();
            countryName = locParts[2].trim();
            countryCode = locParts[3].trim();
          }

          const newEvent: TrackingEvent = {
            eventName: evVesselVoy ? `${eventName} (${evVesselVoy})` : eventName,
            locationName,
            countryName,
            countryCode,
            date: eventDate,
            triggerType: "ACTUAL"
          };

          if (!cntrMovesMap[cNo]) {
            cntrMovesMap[cNo] = {
              containerTypeSize,
              weight,
              events: []
            };
          }
          cntrMovesMap[cNo].events.push(newEvent);
        }
      }

      // Add to containers list
      for (const [cNo, cData] of Object.entries(cntrMovesMap)) {
        cData.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const latestEvent = cData.events[cData.events.length - 1];

        containers.push({
          containerNo: cNo,
          containerTypeSize: cData.containerTypeSize,
          weight: cData.weight,
          latestEvent: latestEvent ? {
            eventName: latestEvent.eventName,
            locationName: latestEvent.locationName,
            date: latestEvent.date
          } : undefined,
          place: latestEvent ? { locationName: latestEvent.locationName } : undefined,
          events: cData.events
        });
      }
    } else {
      // 5. Container list (for B/L or Booking searches)
      const cntrRegex = /frmCntrMoveDetail\('([^'\)]+)'\)/gi;
      const cntrList: string[] = [];
      let cntrMatch: RegExpExecArray | null;
      while ((cntrMatch = cntrRegex.exec(html)) !== null) {
        const cNo = cntrMatch[1];
        if (!cntrList.includes(cNo)) {
          cntrList.push(cNo);
        }
      }

      for (const cNo of cntrList) {
        const cNoEscaped = cNo.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const cNoRowRegex = new RegExp(
          `frmCntrMoveDetail\\('${cNoEscaped}'\\)[\\s\\S]*?<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
          "i"
        );
        
        const rowMatch = html.match(cNoRowRegex);
        let containerTypeSize = "";
        let weight = "";
        
        if (rowMatch) {
          const sizeHtml = rowMatch[1];
          const tooltipMatch = sizeHtml.match(/msg="([^"]*)"/i);
          if (tooltipMatch) {
            containerTypeSize = decodeHtml(tooltipMatch[1]);
          } else {
            containerTypeSize = decodeHtml(sizeHtml.replace(/<[^>]*>/g, ""));
          }
          weight = decodeHtml(rowMatch[6]);
        }

        // Fetch container moves
        const movesParams = new URLSearchParams();
        movesParams.set("bl_no", blNoVal);
        movesParams.set("cntr_no", cNo);
        movesParams.set("onboard_date", onboardDate);
        movesParams.set("pol", formPol);
        movesParams.set("pod", formPod);
        movesParams.set("podctry", formPodctry);
        movesParams.set("TYPE", "CntrMove");

        const detailRes = await fetch(rootUrl, {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": rootUrl
          },
          body: movesParams.toString()
        });

        const detailHtml = detailRes.ok ? await detailRes.text() : "";
        const mappedEvents: TrackingEvent[] = [];

        const trRegex = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
        let trMatch: RegExpExecArray | null;
        while ((trMatch = trRegex.exec(detailHtml)) !== null) {
          const dateRaw = trMatch[1].trim();
          if (dateRaw === "Date") continue;
          
          const eventDate = parseEvergreenDate(dateRaw);
          const eventName = decodeHtml(trMatch[2]);
          const loc = decodeHtml(trMatch[3]);
          const evVesselVoy = decodeHtml(trMatch[4]);
          
          if (eventDate) {
            let locationName = loc;
            let countryName = "";
            let countryCode = "";
            
            const locParts = loc.match(/^([^,]+),\s*([^\(]+)\(([^)]+)\)/i);
            if (locParts) {
              locationName = locParts[1].trim();
              countryName = locParts[2].trim();
              countryCode = locParts[3].trim();
            }
            
            mappedEvents.push({
              eventName: evVesselVoy ? `${eventName} (${evVesselVoy})` : eventName,
              locationName,
              countryName,
              countryCode,
              date: eventDate,
              triggerType: "ACTUAL"
            });
          }
        }

        mappedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const latestEvent = mappedEvents[mappedEvents.length - 1];

        containers.push({
          containerNo: cNo,
          containerTypeSize,
          weight,
          latestEvent: latestEvent ? {
            eventName: latestEvent.eventName,
            locationName: latestEvent.locationName,
            date: latestEvent.date
          } : undefined,
          place: latestEvent ? { locationName: latestEvent.locationName } : undefined,
          events: mappedEvents
        });
      }
    }

    return {
      success: true,
      carrier: "EMC",
      bookingNo: blNoVal,
      blNo: blNoVal,
      vesselName: vesselName || undefined,
      voyageNo: voyageNo || undefined,
      polName,
      podName,
      eta: eta || undefined,
      containers
    };
  } catch (err) {
    console.error("Evergreen Tracking Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred while tracking Evergreen shipment.",
      carrier: "EMC",
      bookingNo: searchText,
      containers: []
    };
  }
}


export async function trackShipmentAction(
  carrier: string,
  searchType: string,
  searchText: string
): Promise<UnifiedTrackingResult> {
  if (!searchText || searchText.trim() === "") {
    return {
      success: false,
      error: "Search text cannot be empty.",
      carrier,
      bookingNo: "",
      containers: [],
    };
  }

  const upperCarrier = carrier.toUpperCase();
  if (upperCarrier === "EMC" || upperCarrier === "EVERGREEN") {
    return trackEvergreenShipment(searchType, searchText);
  }

  if (upperCarrier !== "ONE") {
    return {
      success: false,
      error: `Carrier '${carrier}' is not supported yet. We currently support ONE and EMC (Evergreen).`,
      carrier,
      bookingNo: searchText,
      containers: [],
    };
  }

  try {
    const payload = {
      filters: {
        search_text: searchText,
        search_type: searchType,
      },
      search_text: searchText,
      search_type: searchType,
      page: 1,
      page_length: 10,
      timestamp: Date.now(),
    };

    const response = await fetch(
      "https://ecomm.one-line.com/api/v2/edh/containers/track-and-trace/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Error communicating with ONE API (Status ${response.status})`,
        carrier,
        bookingNo: searchText,
        containers: [],
      };
    }

    const data = await response.json();

    if (data.code !== 1 || data.message !== "Success") {
      return {
        success: false,
        error: data.message || "Failed to retrieve tracking data from carrier.",
        carrier,
        bookingNo: searchText,
        containers: [],
      };
    }

    if (!data.data || data.data.length === 0) {
      return {
        success: false,
        error: "No active shipment tracking records found for the given reference.",
        carrier,
        bookingNo: searchText,
        containers: [],
      };
    }

    // Process containers
    const containers: ContainerTrackingInfo[] = data.data.map((c: OneContainerData) => {
      const mappedEvents: TrackingEvent[] = (c.cargoEvents || []).map((evt: OneCargoEvent) => ({
        eventName: getOneEventName(evt.matrixId, evt.eventName),
        locationName: evt.locationName || "",
        countryName: evt.countryName || "",
        countryCode: evt.countryCode || "",
        date: evt.date || evt.localPortDate || "",
        triggerType: evt.trigger || "ACTUAL",
      }));

      // Combine cargo events with latestEvent if latestEvent is not already duplicate
      const allEvents = [...mappedEvents];
      if (c.latestEvent && c.latestEvent.date) {
        const latestTime = new Date(c.latestEvent.date).getTime();
        const latestLoc = c.latestEvent.locationName || "";
        const latestName = c.latestEvent.eventName || "Container Event";
        const latestDate = c.latestEvent.date;
        const exists = mappedEvents.some((e) => {
          return (
            new Date(e.date).getTime() === latestTime &&
            e.locationName.toLowerCase() === latestLoc.toLowerCase()
          );
        });

        if (!exists) {
          allEvents.push({
            eventName: latestName,
            locationName: latestLoc,
            countryName: c.pod?.countryName || "",
            date: latestDate,
            triggerType: "ACTUAL",
          });
        }
      }

      // Sort by date ascending
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        containerNo: c.containerNo || "",
        containerTypeSize: c.containerTypeSize || "",
        weight: c.weight || "",
        latestEvent: c.latestEvent
          ? {
              eventName: c.latestEvent.eventName || "",
              locationName: c.latestEvent.locationName || "",
              date: c.latestEvent.date || "",
            }
          : undefined,
        place: c.place
          ? {
              yardCode: c.place.yardCode || undefined,
              yardName: c.place.yardName || undefined,
              locationName: c.place.locationName || undefined,
            }
          : undefined,
        events: allEvents,
      };
    });

    const firstItem = data.data[0];

    return {
      success: true,
      carrier,
      bookingNo: firstItem.bookingNoShow || firstItem.bookingNo || searchText,
      blNo: firstItem.bookingNoShow !== searchText ? searchText : undefined,
      vesselName: firstItem.vesselVoyage?.vesselName,
      voyageNo: firstItem.vesselVoyage?.voyageNo,
      polName: firstItem.por
        ? `${firstItem.por.locationName}, ${firstItem.por.countryName}`
        : undefined,
      podName: firstItem.pod
        ? `${firstItem.pod.locationName}, ${firstItem.pod.countryName}`
        : undefined,
      containers,
    };
  } catch (error) {
    console.error("Tracking API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while tracking.",
      carrier,
      bookingNo: searchText,
      containers: [],
    };
  }
}
