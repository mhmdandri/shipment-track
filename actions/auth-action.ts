"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  authenticateCredentials,
  getCurrentUser,
  JWTPayload,
} from "@/lib/auth";
import { ActionResponse } from "@/lib";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface LoginResult {
  user: JWTPayload;
  token: string;
}

/**
 * Server action to authenticate user with credentials (username & password)
 */
export async function loginAction(
  input: LoginInput,
): Promise<ActionResponse<LoginResult>> {
  try {
    const validated = loginSchema.parse(input);

    const authResult = await authenticateCredentials(
      validated.username,
      validated.password,
    );

    if (!authResult) {
      return {
        success: false,
        error: "Username atau password salah",
      };
    }

    const { user, token } = authResult;

    // Set HttpOnly auth cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return {
      success: true,
      data: {
        user,
        token,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      };
    }

    console.error("Login action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan saat login",
    };
  }
}

/**
 * Server action to logout current user by clearing auth cookie
 */
export async function logoutAction(): Promise<ActionResponse<{ loggedOut: boolean }>> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return {
      success: true,
      data: { loggedOut: true },
    };
  } catch (error) {
    console.error("Logout action error:", error);
    return {
      success: false,
      error: "Gagal logout",
    };
  }
}

/**
 * Server action to get current authenticated user profile
 */
export async function getCurrentUserAction(): Promise<ActionResponse<JWTPayload | null>> {
  try {
    const user = await getCurrentUser();
    return {
      success: true,
      data: user,
    };
  } catch {
    return {
      success: false,
      error: "Gagal mengambil data user",
    };
  }
}
