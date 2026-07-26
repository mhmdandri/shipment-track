import { NextResponse } from "next/server";
import {
  processContainerMonitors,
  processVesselMonitors,
} from "@/service/cron-monitor-service";

// Forces Next.js not to cache the cron route
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [containerResults, vesselResults] = await Promise.all([
      processContainerMonitors(),
      processVesselMonitors(),
    ]);

    const details = [...containerResults, ...vesselResults];

    if (details.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active container or vessel monitors.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully.",
      details,
    });
  } catch (error) {
    console.error("Vercel Cron Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
