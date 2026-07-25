import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing JWT token" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("API Auth Me Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
