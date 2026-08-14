import { NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorized,
  logAudit,
  VEHICLE_TYPES,
  SCHEDULE_STATUSES,
  isOneOf,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.mentorId === "string") {
    const mentor = await prisma.mentor.findUnique({ where: { id: body.mentorId } });
    if (!mentor) return NextResponse.json({ error: "Mentor tidak ditemukan." }, { status: 404 });
    data.mentorId = body.mentorId;
  }
  if (typeof body?.date === "string") {
    const date = new Date(body.date);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }
    data.date = date;
  }
  if (typeof body?.startTime === "string") data.startTime = body.startTime;
  if (typeof body?.endTime === "string") data.endTime = body.endTime;
  if (typeof body?.vehicleType === "string") {
    if (!isOneOf(body.vehicleType, VEHICLE_TYPES)) {
      return NextResponse.json({ error: "Jenis kendaraan tidak valid." }, { status: 400 });
    }
    data.vehicleType = body.vehicleType;
  }
  if (typeof body?.location === "string") data.location = body.location.trim() || "-";
  if (body?.totalSlots !== undefined) data.totalSlots = Math.max(1, Number(body.totalSlots) || 1);
  if (body?.filledSlots !== undefined) data.filledSlots = Math.max(0, Number(body.filledSlots) || 0);
  if (typeof body?.status === "string") {
    if (!isOneOf(body.status, SCHEDULE_STATUSES)) {
      return NextResponse.json({ error: "Status jadwal tidak valid." }, { status: 400 });
    }
    data.status = body.status;
  }

  const schedule = await prisma.schedule.update({ where: { id }, data });
  await logAudit({
    admin,
    action: "schedule.update",
    target: "schedule",
    targetId: id,
    metadata: { date: body?.date ?? null, status: body?.status ?? null },
  });
  return NextResponse.json({ schedule });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });

  await prisma.schedule.delete({ where: { id } });
  await logAudit({
    admin,
    action: "schedule.delete",
    target: "schedule",
    targetId: id,
    metadata: { date: existing.date.toISOString() },
  });
  return NextResponse.json({ ok: true });
}
