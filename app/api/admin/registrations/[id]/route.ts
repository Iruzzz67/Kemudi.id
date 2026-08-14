import { NextResponse } from "next/server";
import { requireAdmin, unauthorized, logAudit, REGISTRATION_STATUSES } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (!(REGISTRATION_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: "Status harus \"pending\", \"paid\", atau \"rejected\"." },
      { status: 400 }
    );
  }

  const existing = await prisma.courseRegistration.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });

  const registration = await prisma.courseRegistration.update({
    where: { id },
    data: { status },
  });

  await logAudit({
    admin,
    action:
      status === "paid"
        ? "payment.confirm"
        : status === "rejected"
          ? "payment.reject"
          : "registration.reopen",
    target: "registration",
    targetId: id,
    metadata: { from: existing.status, to: status, email: existing.email },
  });

  return NextResponse.json({ id: registration.id, status: registration.status });
}
