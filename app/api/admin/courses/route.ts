import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorized,
  logAudit,
  VEHICLE_TYPES,
  COURSE_STATUSES,
  COURSE_LEVELS,
  isOneOf,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";

  const courses = await prisma.course.findMany({
    where: status && isOneOf(status, COURSE_STATUSES) ? { status } : {},
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const vehicleType = body?.vehicleType || "";
  const level = body?.level || "";
  const price = Number(body?.price);
  const sessions = Number(body?.sessions);
  const durationMin = Number(body?.durationMin);
  const status = body?.status || "ACTIVE";

  if (!name || !description) {
    return NextResponse.json({ error: "Nama dan deskripsi kursus wajib diisi." }, { status: 400 });
  }
  if (!isOneOf(vehicleType, VEHICLE_TYPES)) {
    return NextResponse.json({ error: "Jenis kendaraan tidak valid." }, { status: 400 });
  }
  if (!isOneOf(level, COURSE_LEVELS)) {
    return NextResponse.json({ error: "Level kursus tidak valid." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(sessions) || sessions < 1) {
    return NextResponse.json({ error: "Harga dan jumlah sesi tidak valid." }, { status: 400 });
  }
  if (!isOneOf(status, COURSE_STATUSES)) {
    return NextResponse.json({ error: "Status kursus tidak valid." }, { status: 400 });
  }

  const id = `course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const course = await prisma.course.create({
    data: {
      id,
      name,
      description,
      price: Math.round(price),
      sessions: Math.round(sessions),
      durationMin: Math.round(Number.isFinite(durationMin) ? durationMin : 60),
      vehicleType,
      level,
      status,
    },
  });

  await logAudit({
    admin,
    action: "course.create",
    target: "course",
    targetId: course.id,
    metadata: { name: course.name },
  });

  return NextResponse.json({ course }, { status: 201 });
}
