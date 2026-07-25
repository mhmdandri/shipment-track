import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  comparePassword,
  ensureDefaultUser,
  JWTPayload,
  signJWT,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
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

    await ensureDefaultUser();

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const isPasswordValid = await comparePassword(
      parsed.data.password,
      user.password,
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const token = await signJWT(payload);

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      data: {
        user: payload,
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
