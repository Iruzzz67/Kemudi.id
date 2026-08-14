import { NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorized,
  logAudit,
  VEHICLE_TYPES,
  MENTOR_STATUSES,
  isOneOf,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.mentor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Mentor tidak ditemukan." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.title === "string") data.title = body.title.trim();
  if (typeof body?.bio === "string") data.bio = body.bio.trim() || null;
  if (typeof body?.phone === "string") data.phone = body.phone.trim() || null;
  if (body?.experienceYears !== undefined) data.experienceYears = Number(body.experienceYears) || 0;
  if (body?.rating !== undefined) data.rating = Math.min(5, Math.max(0, Number(body.rating) || 0));
  if (body?.studentsTrained !== undefined) data.studentsTrained = Number(body.studentsTrained) || 0;
  if (body?.vehicleTypes !== undefined) {
    const vt: unknown = body.vehicleTypes;
    if (!Array.isArray(vt) || vt.length === 0 || !vt.every((v) => isOneOf(v, VEHICLE_TYPES))) {
      return NextResponse.json({ error: "Pilih minimal satu jenis kendaraan." }, { status: 400 });
    }
    data.vehicleTypes = vt.join(",");
  }
  if (body?.status !== undefined) {
    if (!isOneOf(body.status, MENTOR_STATUSES)) {
      return NextResponse.json({ error: "Status mentor tidak valid." }, { status: 400 });
    }
    data.status = body.status;
  }

  const mentor = await prisma.mentor.update({ where: { id }, data });
  await logAudit({
    admin,
    action: "mentor.update",
    target: "mentor",
    targetId: id,
    metadata: { name: mentor.name },
  });
  return NextResponse.json({ mentor });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.mentor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Mentor tidak ditemukan." }, { status: 404 });

  // Jadwal terkait ikut terhapus (onDelete: Cascade).
  await prisma.mentor.delete({ where: { id } });
  await logAudit({
    admin,
    action: "mentor.delete",
    target: "mentor",
    targetId: id,
    metadata: { name: existing.name },
  });
  return NextResponse.json({ ok: true });
}
