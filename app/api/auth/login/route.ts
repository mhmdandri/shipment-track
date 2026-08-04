import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  authenticateCredentials,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    // Apply IP-based rate limiting (5 attempts per 60 seconds)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = checkRateLimit(`login:${clientIp}`, 5, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${Math.ceil(
            rateLimit.resetMs / 1000
          )} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 },
      );
    }

    const authResult = await authenticateCredentials(
      parsed.data.username,
      parsed.data.password,
    );

    if (!authResult) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const { user, token } = authResult;

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      data: {
        user,
        token,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("API Auth Login Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
