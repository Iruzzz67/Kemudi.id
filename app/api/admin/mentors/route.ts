import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorized,
  logAudit,
  VEHICLE_TYPES,
  MENTOR_STATUSES,
  isOneOf,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const status = searchParams.get("status") || "";

  const where = {
    ...(q ? { name: { contains: q } } : {}),
    ...(status && isOneOf(status, MENTOR_STATUSES) ? { status } : {}),
  };

  const mentors = await prisma.mentor.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json({ mentors });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const bio = typeof body?.bio === "string" ? body.bio.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const vehicleTypes: unknown = body?.vehicleTypes;
  const experienceYears = Number(body?.experienceYears) || 0;
  const rating = Number(body?.rating) || 0;
  const studentsTrained = Number(body?.studentsTrained) || 0;
  const status = body?.status || "ACTIVE";

  if (!name || !title) {
    return NextResponse.json({ error: "Nama dan jabatan mentor wajib diisi." }, { status: 400 });
  }
  if (
    !Array.isArray(vehicleTypes) ||
    vehicleTypes.length === 0 ||
    !vehicleTypes.every((v) => isOneOf(v, VEHICLE_TYPES))
  ) {
    return NextResponse.json({ error: "Pilih minimal satu jenis kendaraan." }, { status: 400 });
  }
  if (!isOneOf(status, MENTOR_STATUSES)) {
    return NextResponse.json({ error: "Status mentor tidak valid." }, { status: 400 });
  }

  const id = `mentor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const mentor = await prisma.mentor.create({
    data: {
      id,
      name,
      title,
      bio: bio || null,
      phone: phone || null,
      vehicleTypes: vehicleTypes.join(","),
      experienceYears,
      rating: Math.min(5, Math.max(0, rating)),
      studentsTrained,
      status,
    },
  });

  await logAudit({
    admin,
    action: "mentor.create",
    target: "mentor",
    targetId: mentor.id,
    metadata: { name: mentor.name },
  });

  return NextResponse.json({ mentor }, { status: 201 });
}
