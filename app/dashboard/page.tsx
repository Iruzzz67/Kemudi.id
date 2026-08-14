import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VEHICLES, VehicleType } from "@/lib/vehicles";
import UserRegistrationStatus from "@/components/UserRegistrationStatus";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attempts = await prisma.simulationAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Hanya ambil pendaftaran milik pengguna ini (berdasarkan email sesi).
  // Tanpa filter email, Prisma menganggap undefined sebagai "tanpa filter"
  // dan bisa mengembalikan pendaftaran milik orang lain.
  const registration = session.user.email
    ? await prisma.courseRegistration.findFirst({
        where: { email: session.user.email },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts)
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-neutral-500">
        Halo, {session.user.name || session.user.email}. Ini progres latihanmu.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Total Percobaan" value={totalAttempts} />
        <StatCard label="Skor Terbaik" value={bestScore} />
        <StatCard label="Rata-rata Skor" value={avgScore} />
      </div>

      <div className="mt-8">
        <UserRegistrationStatus registration={registration} />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Riwayat Latihan</h2>
          <Link href="/simulasi" className="text-sm font-medium text-blue-600 hover:underline">
            Latihan lagi
          </Link>
        </div>

        {attempts.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Belum ada percobaan. Yuk mulai simulasi pertamamu!
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Kendaraan</th>
                  <th className="py-2 pr-4">Skor</th>
                  <th className="py-2 pr-4">Waktu</th>
                  <th className="py-2 pr-4">Pelanggaran</th>
                  <th className="py-2 pr-4">Keluar Jalur</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-neutral-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {a.createdAt.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-4">{VEHICLES[a.vehicleType as VehicleType].label}</td>
                    <td className="py-2 pr-4 font-semibold">{a.score}</td>
                    <td className="py-2 pr-4">{(a.timeTakenMs / 1000).toFixed(1)}s</td>
                    <td className="py-2 pr-4">{a.violations}</td>
                    <td className="py-2 pr-4">{a.offRoadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
