import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Protect portal + admin areas. Fine-grained role checks happen in the
// route layouts (see src/lib/rbac.ts); this is the coarse gate.
export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const needsAuth =
    pathname.startsWith("/portal") || pathname.startsWith("/admin") || pathname.startsWith("/kiosk") || pathname.startsWith("/superuser");

  if (needsAuth && !req.auth) {
    const url = new URL("/login", origin);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/kiosk/:path*", "/superuser/:path*"],
};
