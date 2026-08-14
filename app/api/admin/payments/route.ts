import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized, REGISTRATION_STATUSES } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Pembayaran dipetakan dari CourseRegistration (setiap pendaftaran memiliki
// amount + paymentMethod + status). Endpoint ini menyajikan data pembayaran
// dengan nomor referensi terpisah (id pendaftaran).
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";

  const where = status && (REGISTRATION_STATUSES as readonly string[]).includes(status)
    ? { status }
    : {};

  const registrations = await prisma.courseRegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const payments = registrations.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    mentorId: r.mentorId,
    amount: r.amount,
    paymentMethod: r.paymentMethod,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ payments });
}
