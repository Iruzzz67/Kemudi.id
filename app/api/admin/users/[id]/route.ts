import { NextResponse } from "next/server";
import { requireAdmin, unauthorized, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { attempts: true, registrations: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const role = typeof body?.role === "string" ? body.role : undefined;
  const active = typeof body?.active === "boolean" ? body.active : undefined;

  if (role !== undefined && role !== "ADMIN" && role !== "USER") {
    return NextResponse.json({ error: "Role harus \"ADMIN\" atau \"USER\"." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  // Cegah admin menonaktifkan/menurunkan dirinya sendiri.
  if (id === admin.id && (active === false || role === "USER")) {
    return NextResponse.json(
      { error: "Anda tidak dapat menonaktifkan atau menurunkan akun sendiri." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name || null } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  await logAudit({
    admin,
    action: active === false ? "user.deactivate" : "user.update",
    target: "user",
    targetId: id,
    metadata: {
      changes: {
        ...(role !== undefined ? { role } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(name !== undefined ? { name } : {}),
      },
    },
  });

  return NextResponse.json({ id: user.id, role: user.role, active: user.active });
}
