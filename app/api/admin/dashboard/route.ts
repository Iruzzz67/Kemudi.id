import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    totalRegistrations,
    pendingRegistrations,
    paidRegistrations,
    rejectedRegistrations,
    totalMentors,
    activeCourses,
    revenueAgg,
    registrations7d,
    recentRegistrations,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.courseRegistration.count(),
    prisma.courseRegistration.count({ where: { status: "pending" } }),
    prisma.courseRegistration.count({ where: { status: "paid" } }),
    prisma.courseRegistration.count({ where: { status: "rejected" } }),
    prisma.mentor.count(),
    prisma.course.count({ where: { status: "ACTIVE" } }),
    prisma.courseRegistration.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
    prisma.courseRegistration.findMany({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.courseRegistration.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  // Grafik pendaftaran & pembayaran 7 hari terakhir.
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const registrationsChart = dayLabels.map((label, i) => {
    const dayStart = startOfDay(new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000));
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return {
      label,
      value: registrations7d.filter(
        (r) => r.createdAt.getTime() >= dayStart && r.createdAt.getTime() < dayEnd
      ).length,
    };
  });

  const paymentsChart = dayLabels.map((label, i) => {
    const dayStart = startOfDay(new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000));
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return {
      label,
      value: registrations7d.filter(
        (r) =>
          r.status === "paid" &&
          r.createdAt.getTime() >= dayStart &&
          r.createdAt.getTime() < dayEnd
      ).length,
    };
  });

  return NextResponse.json({
    totalUsers,
    newUsers7d,
    totalRegistrations,
    pendingRegistrations,
    paidRegistrations,
    rejectedRegistrations,
    pendingPayments: pendingRegistrations,
    totalMentors,
    activeCourses,
    totalRevenue: revenueAgg._sum.amount ?? 0,
    registrationsChart,
    paymentsChart,
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      status: r.status,
      amount: r.amount,
      createdAt: r.createdAt.toISOString(),
    })),
    recentAuditLogs: recentAuditLogs.map((l) => ({
      id: l.id,
      adminEmail: l.adminEmail,
      action: l.action,
      target: l.target,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
