import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "shipment_track_jwt_secret_key_2026_super_secret";
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

// Public paths that do not require authentication
const PUBLIC_PATHS = [
  "/auth/login",
  "/terminal-tracker",
  "/tracker",
];

// Public API paths that do not require JWT authentication
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/cron",
  "/api/webhook",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, _next internal files, public files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Extract JWT token from cookie or Authorization header
  let token: string | undefined = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET_KEY);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // If user is accessing login page while already authenticated
  if (pathname === "/auth/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Check if requested path is public
  const isPublicPage = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isPublicApi = PUBLIC_API_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  // Handle unauthenticated request to protected routes
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing token" },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
