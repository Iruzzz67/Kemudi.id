"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TheoryCatalog } from "@/components/materi/TheoryCatalog";
import { ModuleDetailModal } from "@/components/materi/ModuleDetailModal";
import { TheoryModule } from "@/types/ui";

export default function MateriPage() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<TheoryModule | null>(null);

  const handleTestInSimulator = () => {
    setActiveModule(null);
    router.push("/simulasi");
  };

  return (
    <div className="min-h-screen">
      <TheoryCatalog
        onSelectModule={(module) => setActiveModule(module)}
        onOpenSimulator={() => router.push("/simulasi")}
      />

      <ModuleDetailModal
        module={activeModule}
        onClose={() => setActiveModule(null)}
        onTestInSimulator={handleTestInSimulator}
      />
    </div>
  );
}
