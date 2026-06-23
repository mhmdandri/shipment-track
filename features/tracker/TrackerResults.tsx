"use client";

import { format } from "date-fns";
import { Container } from "lucide-react";
import { UnifiedTrackingResult } from "@/actions/track-action";
import { ShipmentHeaderCard } from "./components/ShipmentHeaderCard";
import { RouteVisualization } from "./components/RouteVisualization";
import { SummaryBoard } from "./components/SummaryBoard";
import { ContainerRow } from "./components/ContainerRow";

interface TrackerResultsProps {
  result: UnifiedTrackingResult;
}

export function TrackerResults({ result }: TrackerResultsProps) {
  // Helper to extract ETA info
  const getETAInfo = () => {
    const firstContainer = result.containers[0];
    
    // 1. Check if there's an actual discharge/arrival event
    if (firstContainer) {
      const actualArrivalEvent = firstContainer.events.find(e => 
        (e.eventName.toLowerCase().includes("discharge") || 
         e.eventName.toLowerCase().includes("vessel arrival") ||
         e.eventName.toLowerCase().includes("arrived")) &&
        e.triggerType.toUpperCase() === "ACTUAL"
      );
      
      if (actualArrivalEvent) {
        try {
          const formattedDate = format(new Date(actualArrivalEvent.date), "dd MMM yyyy HH:mm");
          return {
            date: actualArrivalEvent.date,
            type: "ACTUAL",
            text: formattedDate,
            isActual: true
          };
        } catch {
          return {
            date: actualArrivalEvent.date,
            type: "ACTUAL",
            text: actualArrivalEvent.date,
            isActual: true
          };
        }
      }
    }

    // 2. If no actual arrival, check top-level carrier-declared ETA (e.g. from Evergreen)
    if (result.eta) {
      try {
        const formattedDate = format(new Date(result.eta), "dd MMM yyyy");
        return {
          date: result.eta,
          type: "ESTIMATED",
          text: formattedDate,
          isActual: false
        };
      } catch {
        return {
          date: result.eta,
          type: "ESTIMATED",
          text: result.eta,
          isActual: false
        };
      }
    }

    // 3. Check planned/estimated arrival events
    if (firstContainer) {
      const plannedArrivalEvent = firstContainer.events.find(e => 
        e.eventName.toLowerCase().includes("discharge") || 
        e.eventName.toLowerCase().includes("vessel arrival") ||
        e.eventName.toLowerCase().includes("arrived")
      );
      
      if (plannedArrivalEvent) {
        const isActual = plannedArrivalEvent.triggerType.toUpperCase() === "ACTUAL";
        try {
          const formattedDate = format(new Date(plannedArrivalEvent.date), "dd MMM yyyy HH:mm");
          return {
            date: plannedArrivalEvent.date,
            type: isActual ? "ACTUAL" : "ESTIMATED",
            text: formattedDate,
            isActual
          };
        } catch {
          return {
            date: plannedArrivalEvent.date,
            type: isActual ? "ACTUAL" : "ESTIMATED",
            text: plannedArrivalEvent.date,
            isActual
          };
        }
      }
      
      // 4. Fallback: Check the latest event
      const lastEvent = firstContainer.events[firstContainer.events.length - 1];
      if (lastEvent) {
        const isActual = lastEvent.triggerType.toUpperCase() === "ACTUAL";
        try {
          const formattedDate = format(new Date(lastEvent.date), "dd MMM yyyy HH:mm");
          return {
            date: lastEvent.date,
            type: isActual ? "ACTUAL" : "ESTIMATED",
            text: formattedDate,
            isActual
          };
        } catch {
          return {
            date: lastEvent.date,
            type: isActual ? "ACTUAL" : "ESTIMATED",
            text: lastEvent.date,
            isActual
          };
        }
      }
    }

    return { date: null, type: "N/A", text: "Not Available", isActual: false };
  };

  // Helper to extract berthing port (Port Sandar)
  const getBerthingPort = () => {
    return result.podName || "Not Declared";
  };

  // Helper to extract terminal name or empty depot
  const getTerminalInfo = () => {
    for (const container of result.containers) {
      if (container.place) {
        const code = (container.place.yardCode || "").toUpperCase();
        const name = (container.place.yardName || "").toUpperCase();

        if (code.includes("UTC1") || name.includes("JICT") || name.includes("JAKARTA INTERNATIONAL CONTAINER TERMINAL")) {
          return { name: "JICT Terminal", label: "JICT", isDepot: false };
        }
        if (code.includes("UTC3") || name.includes("KOJA") || name.includes("KONTENINDO")) {
          return { name: "KOJA Terminal (TPK Koja)", label: "KOJA", isDepot: false };
        }
        if (code.includes("NPCT") || name.includes("NPCT") || name.includes("NEW PRIOK CONTAINER TERMINAL")) {
          return { name: "NPCT1 Terminal", label: "NPCT1", isDepot: false };
        }
        if (name.includes("MUSTIKA ALAM") || name.includes("MAL") || code.includes("T300") || name.includes("TMAL")) {
          return { name: "TMAL Terminal", label: "TMAL", isDepot: false };
        }
        if (name.includes("TERMINAL 3") || name.includes("TER3") || name.includes("T30")) {
          return { name: "TER3 (Terminal 3)", label: "TER3", isDepot: false };
        }
      }
    }

    const firstPlace = result.containers[0]?.place;
    if (firstPlace && firstPlace.yardName) {
      const name = firstPlace.yardName;
      const isDepot = name.toLowerCase().includes("depot") || name.toLowerCase().includes("clc") || name.toLowerCase().includes("meratus") || name.toLowerCase().includes("empty");
      return { 
        name: name, 
        label: isDepot ? "DEPOT" : name.slice(0, 10).toUpperCase(),
        isDepot
      };
    }

    return { name: "Not Declared", label: "N/A", isDepot: false };
  };

  // Helper to calculate overall status
  const getOverallStatus = () => {
    if (result.containers.length === 0) {
      return { 
        label: "Unknown", 
        color: "bg-muted text-muted-foreground border-border dark:border-zinc-800",
        desc: "No containers details found" 
      };
    }

    const statuses = result.containers.map(c => {
      const name = c.latestEvent?.eventName.toLowerCase() || "";
      if (name.includes("returned") || name.includes("depot")) return "returned";
      if (name.includes("gate out") || name.includes("picked up by")) return "gateout";
      if (name.includes("discharge") || name.includes("unloaded") || name.includes("arrived")) return "discharged";
      if (c.events.some(e => e.eventName.toLowerCase().includes("load") || e.eventName.toLowerCase().includes("boarded"))) return "intransit";
      return "planned";
    });

    if (statuses.every(s => s === "returned")) {
      return { 
        label: "EMPTY RETURNED", 
        color: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-700",
        desc: "All empty containers returned to carrier depot. Cycle completed."
      };
    }
    if (statuses.some(s => s === "gateout")) {
      return { 
        label: "IMPORT GATE OUT", 
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
        desc: "Cargo picked up from port terminal by customer." 
      };
    }
    if (statuses.some(s => s === "discharged")) {
      return { 
        label: "CARGO DISCHARGED", 
        color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
        desc: "Containers discharged from vessel at berthing port terminal." 
      };
    }
    if (statuses.some(s => s === "intransit")) {
      return { 
        label: "IN TRANSIT", 
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 animate-pulse",
        desc: "Vessel carrying cargo is currently sailing to Port of Discharge." 
      };
    }

    return { 
      label: "PIPELINE INITIALIZED", 
      color: "bg-secondary text-secondary-foreground border-border dark:border-zinc-800",
      desc: "Shipment booking confirmed. Waiting for empty pickup / gate in." 
    };
  };

  const etaInfo = getETAInfo();
  const berthingPort = getBerthingPort();
  const terminalInfo = getTerminalInfo();
  const overallStatus = getOverallStatus();

  // Detect ship position (pol, sea, or pod)
  const getShipRoutePosition = () => {
    const status = overallStatus.label;
    if (status.includes("RETURNED") || status.includes("GATE OUT") || status.includes("DISCHARGED")) {
      return "pod";
    }
    if (status.includes("TRANSIT")) {
      return "sea";
    }
    return "pol";
  };
  const shipPos = getShipRoutePosition();

  return (
    <div className="space-y-8 animate-fade-in">
      <ShipmentHeaderCard result={result} />

      <RouteVisualization result={result} shipPos={shipPos} etaInfo={etaInfo} />

      <SummaryBoard
        result={result}
        etaInfo={etaInfo}
        berthingPort={berthingPort}
        terminalInfo={terminalInfo}
        overallStatus={overallStatus}
      />

      {/* Containers List */}
      <div className="space-y-6">
        <h3 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2 px-1">
          <Container className="w-5 h-5 text-primary" />
          Container Manifest & Status
        </h3>

        {result.containers.map((container, idx) => (
          <ContainerRow 
            key={container.containerNo || idx} 
            container={container} 
            resultEta={result.eta}
            resultPodName={result.podName}
          />
        ))}
      </div>
    </div>
  );
}
