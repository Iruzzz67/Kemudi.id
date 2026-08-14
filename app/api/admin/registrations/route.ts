import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized, REGISTRATION_STATUSES } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const q = searchParams.get("q")?.trim().toLowerCase() || "";

  const where = {
    ...(status && (REGISTRATION_STATUSES as readonly string[]).includes(status)
      ? { status }
      : {}),
    ...(q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
      : {}),
  };

  const registrations = await prisma.courseRegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    registrations: registrations.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
