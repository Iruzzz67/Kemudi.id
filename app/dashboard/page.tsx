"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { INITIAL_SIMULATION_HISTORY } from "@/data/mockData";
import { SimulationResult, VehicleType } from "@/types/ui";

export default function DashboardPage() {
  const router = useRouter();
  const { studentProfile } = useAuth();

  const [simulationHistory] = useState<SimulationResult[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kemudi_simulation_history");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_SIMULATION_HISTORY;
  });

  const handleStartSimulation = (vehicleType: VehicleType = "mobil") => {
    router.push(`/simulasi?vehicle=${vehicleType}&autoStart=1`);
  };

  const handleOpenCourses = () => {
    router.push("/kursus");
  };

  return (
    <div className="min-h-screen">
      <StudentDashboard
        profile={studentProfile}
        simulationHistory={simulationHistory}
        onStartSimulationWithVehicle={handleStartSimulation}
        onOpenCourses={handleOpenCourses}
      />
    </div>
  );
}
