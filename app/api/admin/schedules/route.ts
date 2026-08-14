import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorized,
  logAudit,
  VEHICLE_TYPES,
  SCHEDULE_STATUSES,
  isOneOf,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const mentorId = searchParams.get("mentorId") || "";

  const where = {
    ...(status && isOneOf(status, SCHEDULE_STATUSES) ? { status } : {}),
    ...(mentorId ? { mentorId } : {}),
  };

  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { mentor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    schedules: schedules.map((s) => ({ ...s, date: s.date.toISOString() })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const mentorId = typeof body?.mentorId === "string" ? body.mentorId : "";
  const dateStr = typeof body?.date === "string" ? body.date : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime : "";
  const endTime = typeof body?.endTime === "string" ? body.endTime : "";
  const vehicleType = body?.vehicleType || "";
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const totalSlots = Math.max(1, Number(body?.totalSlots) || 4);
  const filledSlots = Math.max(0, Number(body?.filledSlots) || 0);
  const status = body?.status || "AVAILABLE";

  if (!mentorId || !dateStr || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Mentor, tanggal, jam mulai, dan jam selesai wajib diisi." },
      { status: 400 }
    );
  }
  if (!isOneOf(vehicleType, VEHICLE_TYPES)) {
    return NextResponse.json({ error: "Jenis kendaraan tidak valid." }, { status: 400 });
  }
  if (!isOneOf(status, SCHEDULE_STATUSES)) {
    return NextResponse.json({ error: "Status jadwal tidak valid." }, { status: 400 });
  }

  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
  if (!mentor) return NextResponse.json({ error: "Mentor tidak ditemukan." }, { status: 404 });

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  }

  const schedule = await prisma.schedule.create({
    data: {
      mentorId,
      date,
      startTime,
      endTime,
      vehicleType,
      location: location || "-",
      totalSlots,
      filledSlots,
      status,
    },
  });

  await logAudit({
    admin,
    action: "schedule.create",
    target: "schedule",
    targetId: schedule.id,
    metadata: { date: dateStr, mentorId },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
