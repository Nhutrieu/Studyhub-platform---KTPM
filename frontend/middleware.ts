import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/", "/products", "/categories", "/branches", "/reviews", "/promotions", "/faq", "/contact", "/policy"];
const authRoutes = ["/auth/login", "/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute && !pathname.startsWith("/account") && !pathname.startsWith("/orders") && !pathname.startsWith("/checkout")) {
    return NextResponse.next();
  }

  // Allow auth routes (login/register)
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // For protected routes, allow access - client-side will handle authentication checks
  // This ensures each tab has its own independent session from sessionStorage
  // Client-side guards (AppShellProtected, RoleGuard, etc.) will handle redirects
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

