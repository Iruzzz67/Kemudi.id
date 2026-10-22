"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CoursePackages } from "@/components/kursus/CoursePackages";
import { MentorSelector } from "@/components/kursus/MentorSelector";
import { RegistrationModal } from "@/components/kursus/RegistrationModal";
import { COURSE_PACKAGES, MENTORS } from "@/data/mockData";
import { CoursePackage, Mentor, StudentProfile } from "@/types/ui";
import { ShieldCheck, Award, Users } from "lucide-react";

export default function KursusPage() {
  const router = useRouter();
  const { studentProfile, updateProfile } = useAuth();

  const [selectedPackage, setSelectedPackage] = useState<CoursePackage>(COURSE_PACKAGES[1]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(MENTORS[0]);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  const handleSelectPackage = (pkg: CoursePackage) => {
    setSelectedPackage(pkg);
    setIsRegistrationModalOpen(true);
  };

  const handleSelectMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setIsRegistrationModalOpen(true);
  };

  const handleCompleteRegistration = (updatedProfile: StudentProfile) => {
    updateProfile(updatedProfile);
    router.push("/dashboard");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Kurikulum Standar Perhubungan RI
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Paket Kursus Mengemudi & Pilihan Mentor
        </h1>
        <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
          Dapatkan bimbingan intensif dari instruktur berlisensi resmi BNSP. Akses simulator 3D gratis tanpa batas selama masa kursus untuk memastikan kelulusan ujian SIM perdana Anda.
        </p>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 px-6 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Garansi Lulus Ujian SIM</div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400">Didampingi hingga memperoleh SIM</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Instruktur Senior BNSP</div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400">Sabar, ramah, dan berpengalaman 8+ tahun</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Sertifikat Digital Resmi</div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400">Verifikasi QR-Code internasional</div>
          </div>
        </div>
      </div>

      {/* Course Packages */}
      <CoursePackages
        selectedPackage={selectedPackage}
        onSelectPackage={handleSelectPackage}
      />

      {/* Mentor Selector */}
      <MentorSelector
        selectedMentor={selectedMentor}
        onSelectMentor={handleSelectMentor}
      />

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        selectedPackage={selectedPackage}
        selectedMentor={selectedMentor}
        studentProfile={studentProfile}
        onCompleteRegistration={handleCompleteRegistration}
      />
    </div>
  );
}
