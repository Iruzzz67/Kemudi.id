import React, { useState } from 'react';
import { COURSE_PACKAGES, MENTORS } from '@/data/mockData';
import { SimulationResult, StudentProfile, VehicleType } from '@/types/ui';
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileCheck,
  Flame,
  Gauge,
  Play,
  RotateCcw,
  ShieldCheck,
  Trophy,
  User,
  Zap,
} from 'lucide-react';

interface StudentDashboardProps {
  profile: StudentProfile;
  simulationHistory: SimulationResult[];
  onStartSimulationWithVehicle: (type: VehicleType) => void;
  onOpenCourses: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  profile,
  simulationHistory,
  onStartSimulationWithVehicle,
  onOpenCourses,
}) => {
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Calculate statistics
  const totalAttempts = simulationHistory.length;
  const bestScore = totalAttempts > 0 ? Math.max(...simulationHistory.map((s) => s.score)) : 0;
  const avgScore =
    totalAttempts > 0
      ? Math.round(simulationHistory.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts)
      : 0;

  const registeredCourse = COURSE_PACKAGES.find((p) => p.id === profile.registeredCourseId);
  const selectedMentor = MENTORS.find((m) => m.id === profile.selectedMentorId);

  const isEligibleForCertificate = bestScore >= 75;

  const certificateNumber = React.useMemo(() => {
    let hash = 0;
    const str = profile.email || profile.name || "kemudi";
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return 100000 + Math.abs(hash % 900000);
  }, [profile.email, profile.name]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Dashboard Siswa · {profile.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                Siswa Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Email: {profile.email} · NIK: {profile.nik ? `${profile.nik.slice(0, 6)}******` : 'Belum Terdaftar'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onStartSimulationWithVehicle('mobil')}
          className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Latihan Simulator Sekarang</span>
        </button>
      </div>

      {/* Top Stat Cards (4.5 in MD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">Total Percobaan</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {totalAttempts} Sesi
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">Skor Tertinggi</div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-500 tabular-nums">
              {bestScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">Rata-rata Skor</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {avgScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">Sertifikat Digital</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isEligibleForCertificate ? (
                <button
                  onClick={() => setShowCertificateModal(true)}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Siap Diunduh</span>
                  <FileCheck className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-slate-400">Perlu Skor ≥ 75</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Course & Registration Status Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Status Registrasi Kursus
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Paket Latihan Aktif
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                profile.paymentStatus === 'terverifikasi'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
              }`}
            >
              {profile.paymentStatus === 'terverifikasi'
                ? '● Pembayaran Terverifikasi'
                : '● Menunggu Verifikasi Administrasi'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-100 dark:border-neutral-800">
            <div className="text-xs text-slate-400">Paket Terdaftar:</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-1">
              {registeredCourse ? registeredCourse.name : 'Paket Intensif Siap Ujian (Mobil)'}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {registeredCourse ? `${registeredCourse.sessionsCount} Sesi Latihan` : '16 Sesi Latihan'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-100 dark:border-neutral-800">
            <div className="text-xs text-slate-400">Mentor Pendamping:</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-1">
              {selectedMentor ? selectedMentor.name : 'Budi Santoso, S.T.'}
            </div>
            <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              {selectedMentor ? selectedMentor.title : 'Instruktur Senior Mobil'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-100 dark:border-neutral-800">
            <div className="text-xs text-slate-400">Jadwal Sesi Berikutnya:</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Sabtu Depan, 08:30 WIB</span>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Trek Ujian SIM A & Tanjakan
            </div>
          </div>
        </div>
      </div>

      {/* Simulation History Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Riwayat Evaluasi Praktik Simulator
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Histori sesi latihan lengkap dengan rincian skor, waktu, dan penalti kesalahan
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {simulationHistory.length} Total Sesi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-neutral-950 text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-3.5">Waktu Latihan</th>
                <th className="px-6 py-3.5">Kendaraan</th>
                <th className="px-6 py-3.5">Transmisi</th>
                <th className="px-6 py-3.5">Skor Akhir</th>
                <th className="px-6 py-3.5">Durasi</th>
                <th className="px-6 py-3.5">Pelanggaran</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-mono">
              {simulationHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-sans">
                    Belum ada riwayat sesi latihan. Klik tombol &ldquo;Latihan Simulator Sekarang&rdquo; untuk memulai.
                  </td>
                </tr>
              ) : (
                simulationHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-sans text-slate-700 dark:text-neutral-300">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 font-sans font-semibold capitalize text-slate-900 dark:text-white">
                      {item.vehicleType}
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-500 dark:text-neutral-400 capitalize">
                      {item.transmission}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        {item.score}
                      </span>
                      <span className="text-slate-400">/100</span>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-slate-600 dark:text-neutral-300">
                      {item.durationSeconds}s
                    </td>
                    <td className="px-6 py-4">
                      {item.violationsCount === 0 && item.obstacleHits === 0 ? (
                        <span className="text-emerald-500 font-semibold font-sans">0 (Sempurna)</span>
                      ) : (
                        <span className="text-red-500 font-sans">
                          {item.violationsCount} rambu · {item.obstacleHits} rintangan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.passed
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        }`}
                      >
                        {item.passed ? 'LULUS' : 'REMEDIAL'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-slate-200 dark:border-neutral-800 shadow-2xl space-y-6 text-slate-900 dark:text-white">
            <div className="border-4 border-double border-blue-600/30 rounded-2xl p-6 text-center space-y-4 bg-gradient-to-b from-blue-50/20 to-transparent">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                  SERTIFIKAT KELULUSAN RESMI
                </span>
                <h3 className="text-2xl font-black tracking-tight">KEMUDI.ID DRIVING ACADEMY</h3>
                <p className="text-xs text-slate-500">
                  Nomor Sertifikat: KM-2026-{certificateNumber}
                </p>
              </div>

              <div className="py-4 border-y border-slate-200 dark:border-neutral-800">
                <div className="text-xs text-slate-500">Diberikan Kepada Siswa:</div>
                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {profile.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-neutral-400 mt-2 max-w-md mx-auto">
                  Telah dinyatakan <strong>KOMPETEN & LULUS</strong> pada Uji Kemampuan Simulator 3D Mengemudi dengan Nilai Terbaik: <strong>{bestScore}/100</strong>.
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 px-4">
                <div className="text-left">
                  <div>Terverifikasi: {new Date().toLocaleDateString('id-ID')}</div>
                  <div>Instruktur: Budi Santoso, S.T. (BNSP)</div>
                </div>
                <div className="w-14 h-14 bg-slate-900 text-white p-1 rounded-lg flex items-center justify-center font-mono text-[9px] text-center">
                  [ QR VALID ]
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold"
              >
                Tutup
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Cetak / Unduh Sertifikat (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
