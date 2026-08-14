import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const role = searchParams.get("role") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 20;

  const where = {
    ...(q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
      : {}),
    ...(role === "ADMIN" || role === "USER" ? { role } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  });
}
