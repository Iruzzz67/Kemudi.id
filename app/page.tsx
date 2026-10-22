"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { HeroSection } from "@/components/home/HeroSection";
import { VehicleShowcase } from "@/components/home/VehicleShowcase";
import { FeaturedModules } from "@/components/home/FeaturedModules";
import { CoursePackages } from "@/components/kursus/CoursePackages";
import { MentorSelector } from "@/components/kursus/MentorSelector";
import { RegistrationModal } from "@/components/kursus/RegistrationModal";
import { ModuleDetailModal } from "@/components/materi/ModuleDetailModal";
import { COURSE_PACKAGES, MENTORS } from "@/data/mockData";
import {
  CoursePackage,
  Mentor,
  StudentProfile,
  TheoryModule,
  VehicleType,
} from "@/types/ui";

export default function HomePage() {
  const router = useRouter();
  const { studentProfile, updateProfile } = useAuth();

  const [selectedPackage, setSelectedPackage] = useState<CoursePackage>(COURSE_PACKAGES[1]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(MENTORS[0]);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [activeTheoryModule, setActiveTheoryModule] = useState<TheoryModule | null>(null);

  const handleStartSimulation = (vehicleType: VehicleType = "mobil") => {
    router.push(`/simulasi?vehicle=${vehicleType}&autoStart=1`);
  };

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
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <HeroSection
        onStartSimulation={() => handleStartSimulation("mobil")}
        onExploreCourses={() => router.push("/kursus")}
        onExploreTheory={() => router.push("/materi")}
      />

      {/* Vehicle Selection Showcase */}
      <VehicleShowcase onSelectVehicleToDrive={(type) => handleStartSimulation(type)} />

      {/* Featured Theory Modules */}
      <FeaturedModules
        onSelectModule={(mod) => setActiveTheoryModule(mod)}
        onViewAllModules={() => router.push("/materi")}
      />

      {/* Course Packages & Mentors Preview */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <CoursePackages
          selectedPackage={selectedPackage}
          onSelectPackage={handleSelectPackage}
        />

        <MentorSelector
          selectedMentor={selectedMentor}
          onSelectMentor={handleSelectMentor}
        />
      </section>

      {/* Modals */}
      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        selectedPackage={selectedPackage}
        selectedMentor={selectedMentor}
        studentProfile={studentProfile}
        onCompleteRegistration={handleCompleteRegistration}
      />

      <ModuleDetailModal
        module={activeTheoryModule}
        onClose={() => setActiveTheoryModule(null)}
        onTestInSimulator={() => {
          setActiveTheoryModule(null);
          handleStartSimulation("mobil");
        }}
      />
    </div>
  );
}
