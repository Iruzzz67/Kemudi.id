import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Proxy (pengganti middleware di Next.js 16) — lapisan proteksi pertama untuk
// seluruh area admin. Proteksi API tetap divalidasi ulang di server
// (lib/admin.ts → requireAdmin), proxy hanya lapisan optimis.
//
// Flow: /admin/* → cek sesi (JWT) → belum login → /admin/login?callbackUrl=…
//                        → login tapi bukan ADMIN → redirect ke beranda
//       /api/admin/* → bukan admin → 403 JSON
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const isAdmin = token?.role === "ADMIN";
  const isLoginPage = pathname === "/admin/login";

  // Sudah login sebagai admin → langsung ke dashboard.
  if (isAdmin && isLoginPage) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Halaman login admin boleh diakses siapa pun.
  if (isLoginPage) return NextResponse.next();

  if (!token) {
    // Belum login → arahkan ke login admin (dengan callback ke halaman tujuan).
    const url = new URL("/admin/login", request.url);
    if (isAdminPage) url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (!isAdmin) {
    // Login tapi bukan ADMIN.
    if (isAdminApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
