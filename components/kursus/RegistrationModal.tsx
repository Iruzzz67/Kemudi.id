import React, { useState } from 'react';
import { CoursePackage, Mentor, StudentProfile } from '@/types/ui';
import { X, CheckCircle, CreditCard, QrCode, Building, ShieldCheck, ArrowRight, User, Phone, Mail, FileText, MapPin } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: CoursePackage;
  selectedMentor: Mentor | null;
  studentProfile: StudentProfile;
  onCompleteRegistration: (updatedProfile: StudentProfile) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  selectedPackage,
  selectedMentor,
  studentProfile,
  onCompleteRegistration,
}) => {
  const [formData, setFormData] = useState({
    name: studentProfile.name,
    email: studentProfile.email,
    phone: studentProfile.phone,
    nik: studentProfile.nik,
    address: studentProfile.address,
    preferredTime: 'Sabtu & Minggu (Pagi 08:00 - 11:00)',
    paymentMethod: 'qris' as 'qris' | 'bca' | 'bni' | 'cash',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);

      const updated: StudentProfile = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        nik: formData.nik,
        address: formData.address,
        registeredCourseId: selectedPackage.id,
        selectedMentorId: selectedMentor?.id,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'menunggu_verifikasi',
        registrationDate: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      };

      setTimeout(() => {
        onCompleteRegistration(updated);
        onClose();
      }, 1400);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Pendaftaran Kursus & Pembayaran
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Isi data diri untuk reservasi jadwal latihan dan aktivasi simulator resmi
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              Pendaftaran Berhasil Dikirim!
            </h4>
            <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
              Data pendaftaran untuk <strong>{selectedPackage.name}</strong> telah tercatat. Anda dialihkan ke Dashboard Siswa untuk memantau status verifikasi dan memulai simulator.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-neutral-800">
              {/* Left Column: Personal Information Form (7 cols) */}
              <div className="lg:col-span-7 p-6 space-y-4">
                <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                  1. Data Diri Calon Siswa
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Nama Lengkap (Sesuai KTP)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contoh: Aldiansyah Reza"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Email Aktif
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="nama@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Nomor WhatsApp / HP
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="08123456789"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Nomor Induk Kependudukan (NIK)
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          maxLength={16}
                          value={formData.nik}
                          onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="3271xxxxxxxxxxxx"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Pilihan Jadwal Latihan
                      </label>
                      <select
                        value={formData.preferredTime}
                        onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Sabtu & Minggu (Pagi 08:00 - 11:00)</option>
                        <option>Sabtu & Minggu (Siang 13:00 - 16:00)</option>
                        <option>Hari Kerja / Weekday (Pagi 09:00 - 12:00)</option>
                        <option>Hari Kerja / Weekday (Sore 15:30 - 18:30)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Alamat Domisili
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jalan, RT/RW, Kelurahan, Kota"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="pt-4">
                  <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    2. Pilih Metode Pembayaran
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'qris', label: 'QRIS Instan', icon: <QrCode className="w-4 h-4" /> },
                      { id: 'bca', label: 'BCA Virtual', icon: <CreditCard className="w-4 h-4" /> },
                      { id: 'bni', label: 'BNI Virtual', icon: <CreditCard className="w-4 h-4" /> },
                      { id: 'cash', label: 'Bayar Tunai', icon: <Building className="w-4 h-4" /> },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() =>
                          setFormData({ ...formData, paymentMethod: m.id as 'qris' | 'bca' | 'bni' | 'cash' })
                        }
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                          formData.paymentMethod === m.id
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-blue-600'
                            : 'border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {m.icon}
                        <span className="text-xs">{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* QRIS / VA Preview Box */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 text-xs">
                    {formData.paymentMethod === 'qris' && (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                          {/* Stylized QR representation */}
                          <div className="w-full h-full bg-slate-900 rounded grid grid-cols-3 gap-0.5 p-1">
                            <div className="bg-white rounded-xs" />
                            <div className="bg-white/30 rounded-xs" />
                            <div className="bg-white rounded-xs" />
                            <div className="bg-white/20 rounded-xs" />
                            <div className="bg-white rounded-xs" />
                            <div className="bg-white/20 rounded-xs" />
                            <div className="bg-white rounded-xs" />
                            <div className="bg-white/40 rounded-xs" />
                            <div className="bg-white rounded-xs" />
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-neutral-200">
                            Scan QRIS Semua E-Wallet & Mobile Banking
                          </div>
                          <div className="text-slate-500 dark:text-neutral-400 mt-0.5">
                            BCA, GoPay, OVO, Dana, ShopeePay, Livin&apos; Mandiri didukung otomatis.
                          </div>
                        </div>
                      </div>
                    )}

                    {(formData.paymentMethod === 'bca' || formData.paymentMethod === 'bni') && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nomor Rekening VA:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-white">
                            8923 0812 3456 7890
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Transfer diverifikasi otomatis dalam 1-2 menit setelah pembayaran.
                        </div>
                      </div>
                    )}

                    {formData.paymentMethod === 'cash' && (
                      <div className="text-slate-600 dark:text-neutral-300">
                        Pembayaran tunai dapat dilakukan langsung di kantor cabang Kemudi.id terdekat saat sesi briefing pertama.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary (5 cols) */}
              <div className="lg:col-span-5 p-6 bg-slate-50/60 dark:bg-neutral-950/40 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-200 uppercase tracking-wider mb-4">
                    Ringkasan Pendaftaran
                  </h4>

                  {/* Selected Package Card */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {selectedPackage.name}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                          {selectedPackage.sessionsCount} Sesi Praktik · {selectedPackage.duration}
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatRupiah(selectedPackage.price)}
                      </div>
                    </div>
                  </div>

                  {/* Selected Mentor Card */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 mb-4">
                    <div className="text-[11px] text-slate-400 mb-1">Instruktur Pendamping:</div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{selectedMentor ? selectedMentor.name : 'Instruktur Terbaik (Ditugaskan Sistem)'}</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Gratis</span>
                    </div>
                    {selectedMentor && (
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                        {selectedMentor.title}
                      </div>
                    )}
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="space-y-2 text-xs py-3 border-y border-slate-200 dark:border-neutral-800">
                    <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                      <span>Biaya Pelatihan</span>
                      <span className="tabular-nums">{formatRupiah(selectedPackage.price)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                      <span>Akses Simulator 3D Premium</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Termasuk (Gratis)</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                      <span>Biaya Registrasi & Sertifikasi</span>
                      <span className="tabular-nums">Rp 0</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-4 mb-6">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Total Bayar</span>
                    <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatRupiah(selectedPackage.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Garansi pendampingan resmi hingga lulus ujian SIM.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Memproses Reservasi...</span>
                  ) : (
                    <>
                      <span>Konfirmasi & Bayar Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
