import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, unauthorized, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => null);
  const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (next.length < 8) {
    return NextResponse.json(
      { error: "Password baru minimal 8 karakter." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const valid = await bcrypt.compare(current, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Password saat ini salah." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: admin.id }, data: { password: hashed } });

  await logAudit({
    admin,
    action: "admin.change_password",
    target: "admin",
    targetId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
