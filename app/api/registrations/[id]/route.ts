import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mengonfirmasi / membatalkan status pembayaran — HANYA admin.
export async function PATCH(req: Request, ctx: RouteContext<"/api/registrations/[id]">) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (status !== "paid" && status !== "pending" && status !== "rejected") {
    return NextResponse.json(
      { error: "Status harus \"paid\", \"pending\", atau \"rejected\"." },
      { status: 400 }
    );
  }

  const existing = await prisma.courseRegistration.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
  }

  const registration = await prisma.courseRegistration.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ id: registration.id, status: registration.status });
}
