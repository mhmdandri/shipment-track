import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";

export interface JWTPayload {
  id: string;
  username: string;
  name: string;
  role: string;
}

const JWT_SECRET_KEY = new TextEncoder().encode(env.JWT_SECRET);
export const AUTH_COOKIE_NAME = "auth_token";

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password with hashed password
 */
export async function comparePassword(
  password: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

/**
 * Sign a JWT token with user payload
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET_KEY);
}

/**
 * Verify JWT token and return payload if valid, or null if invalid
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Extract and verify current user from Cookie or Authorization Header in Server environment
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    let token: string | undefined;

    // 1. Try reading from HttpOnly Cookie
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (cookieToken) {
      token = cookieToken;
    }

    // 2. Fallback to Authorization Header (Bearer token)
    if (!token) {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) return null;

    return await verifyJWT(token);
  } catch {
    return null;
  }
}

export interface AuthenticationResult {
  user: JWTPayload;
  token: string;
}

/**
 * Authenticate user by credentials (username & password), return payload & JWT token if valid
 */
export async function authenticateCredentials(
  username: string,
  password: string,
): Promise<AuthenticationResult | null> {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) return null;

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) return null;

  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };

  const token = await signJWT(payload);
  return { user: payload, token };
}
