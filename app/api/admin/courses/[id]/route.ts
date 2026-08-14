import { NextResponse } from "next/server";
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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kursus tidak ditemukan." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.description === "string") data.description = body.description.trim();
  if (typeof body?.vehicleType === "string") {
    if (!isOneOf(body.vehicleType, VEHICLE_TYPES)) {
      return NextResponse.json({ error: "Jenis kendaraan tidak valid." }, { status: 400 });
    }
    data.vehicleType = body.vehicleType;
  }
  if (typeof body?.level === "string") {
    if (!isOneOf(body.level, COURSE_LEVELS)) {
      return NextResponse.json({ error: "Level kursus tidak valid." }, { status: 400 });
    }
    data.level = body.level;
  }
  if (body?.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Harga tidak valid." }, { status: 400 });
    }
    data.price = Math.round(price);
  }
  if (body?.sessions !== undefined) {
    const sessions = Number(body.sessions);
    if (!Number.isFinite(sessions) || sessions < 1) {
      return NextResponse.json({ error: "Jumlah sesi tidak valid." }, { status: 400 });
    }
    data.sessions = Math.round(sessions);
  }
  if (body?.durationMin !== undefined) {
    data.durationMin = Math.max(1, Math.round(Number(body.durationMin) || 60));
  }
  if (typeof body?.status === "string") {
    if (!isOneOf(body.status, COURSE_STATUSES)) {
      return NextResponse.json({ error: "Status kursus tidak valid." }, { status: 400 });
    }
    data.status = body.status;
  }

  const course = await prisma.course.update({ where: { id }, data });
  await logAudit({
    admin,
    action: "course.update",
    target: "course",
    targetId: id,
    metadata: { name: course.name },
  });
  return NextResponse.json({ course });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kursus tidak ditemukan." }, { status: 404 });

  await prisma.course.delete({ where: { id } });
  await logAudit({
    admin,
    action: "course.delete",
    target: "course",
    targetId: id,
    metadata: { name: existing.name },
  });
  return NextResponse.json({ ok: true });
}
