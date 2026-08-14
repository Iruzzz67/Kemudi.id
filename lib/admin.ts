import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Autorisasi admin — dipakai oleh SELURUH route handler /api/admin/* dan
// halaman admin. Proteksi tidak boleh hanya mengandalkan proxy.ts.
// ---------------------------------------------------------------------------

export type AdminSession = Session["user"] & {
  id: string;
  email: string;
  role: string;
};

/** Mengembalikan sesi admin, atau null jika bukan admin (403). */
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user as AdminSession;
}

export function unauthorized(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ---------------------------------------------------------------------------
// Audit log (§33) — dicatat untuk setiap aktivitas penting admin.
// ---------------------------------------------------------------------------

export async function logAudit(params: {
  admin: AdminSession;
  action: string; // mis. "registration.confirm", "mentor.create", "user.deactivate"
  target: string; // nama entitas: "registration" | "mentor" | ...
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      adminId: params.admin.id,
      adminEmail: params.admin.email,
      action: params.action,
      target: params.target,
      targetId: params.targetId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

// ---------------------------------------------------------------------------
// Konstanta & validasi nilai enum yang dipakai form admin.
// ---------------------------------------------------------------------------

export const VEHICLE_TYPES = ["MOTOR", "MOBIL", "TRUK"] as const;
export const MENTOR_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const SCHEDULE_STATUSES = ["AVAILABLE", "FULL", "CANCELLED", "COMPLETED"] as const;
export const COURSE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const COURSE_LEVELS = ["Pemula", "Menengah", "Mahir"] as const;

/** Status pendaftaran/pembayaran — kompatibel dengan sistem lama (pending/paid). */
export const REGISTRATION_STATUSES = ["pending", "paid", "rejected"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}


