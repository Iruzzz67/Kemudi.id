// Seed awal untuk sistem admin: Mentor, Course, dan Schedule.
// Data mentor & kursus diambil dari data statis yang dipakai halaman publik
// (lib/kursus-data.ts) supaya ID konsisten. Aman dijalankan berulang kali.
//
//   npm run seed-admin
//
// Membaca DATABASE_URL dari .env.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MENTORS = [
  {
    id: "budi-santoso",
    name: "Budi Santoso",
    title: "Instruktur Senior Mobil & Motor",
    bio: "Mantan instruktur di sekolah mengemudi berlisensi Jakarta, spesialis membimbing pemula yang gugup di jalan ramai.",
    phone: "+62 812-3456-7890",
    vehicleTypes: ["MOTOR", "MOBIL"],
    experienceYears: 12,
    rating: 4.9,
    studentsTrained: 480,
  },
  {
    id: "siti-rahma",
    name: "Siti Rahma",
    title: "Instruktur Mobil & Defensive Driving",
    bio: "Fokus pada teknik defensive driving dan kesiapan menghadapi kondisi jalan licin atau darurat.",
    phone: "+62 811-2345-678",
    vehicleTypes: ["MOBIL"],
    experienceYears: 8,
    rating: 4.8,
    studentsTrained: 310,
  },
  {
    id: "agus-wirawan",
    name: "Agus Wirawan",
    title: "Instruktur Truk & Kendaraan Besar",
    bio: "Eks pengemudi logistik antarkota, ahli mengajarkan manuver truk di area sempit dan teknik mundur presisi.",
    phone: "+62 813-9876-5432",
    vehicleTypes: ["TRUK", "MOBIL"],
    experienceYears: 15,
    rating: 4.9,
    studentsTrained: 210,
  },
  {
    id: "dewi-lestari",
    name: "Dewi Lestari",
    title: "Instruktur Motor",
    bio: "Spesialis melatih pemula yang baru pertama kali naik motor, dengan pendekatan santai dan bertahap.",
    phone: "+62 812-7777-1234",
    vehicleTypes: ["MOTOR"],
    experienceYears: 6,
    rating: 4.7,
    studentsTrained: 260,
  },
];

const COURSES = [
  { id: "motor-reguler", name: "Motor Reguler", vehicleType: "MOTOR", level: "Pemula", price: 350000, sessions: 4, durationMin: 60, description: "Dasar keseimbangan, pengereman, dan bermanuver di lalu lintas ringan." },
  { id: "motor-intensif", name: "Motor Intensif", vehicleType: "MOTOR", level: "Menengah", price: 550000, sessions: 6, durationMin: 60, description: "Untuk yang ingin lebih mahir bermanuver di jalan padat dan tikungan tajam." },
  { id: "mobil-reguler", name: "Mobil Reguler", vehicleType: "MOBIL", level: "Pemula", price: 1200000, sessions: 8, durationMin: 60, description: "Kursus paling populer — dari nol hingga siap ambil SIM A." },
  { id: "mobil-intensif", name: "Mobil Intensif", vehicleType: "MOBIL", level: "Menengah", price: 1950000, sessions: 12, durationMin: 60, description: "Lebih banyak jam terbang untuk parkir paralel, tanjakan, dan jalan tol." },
  { id: "mobil-mahir", name: "Mobil Mahir Defensive Driving", vehicleType: "MOBIL", level: "Mahir", price: 2600000, sessions: 10, durationMin: 75, description: "Teknik defensive driving untuk kondisi jalan licin, ramai, dan darurat." },
  { id: "truk-reguler", name: "Truk Reguler", vehicleType: "TRUK", level: "Menengah", price: 3200000, sessions: 10, durationMin: 90, description: "Persiapan SIM B1, fokus jarak pengereman panjang dan radius belok lebar." },
  { id: "truk-profesional", name: "Truk Profesional", vehicleType: "TRUK", level: "Mahir", price: 4500000, sessions: 14, durationMin: 90, description: "Untuk calon pengemudi profesional — manuver di area sempit dan mundur presisi." },
];

async function main() {
  console.log("→ Menyemai mentor...");
  for (const m of MENTORS) {
    const data = { ...m, vehicleTypes: m.vehicleTypes.join(",") };
    await prisma.mentor.upsert({
      where: { id: m.id },
      update: data,
      create: data,
    });
  }

  console.log("→ Menyemai kursus...");
  for (const c of COURSES) {
    await prisma.course.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  console.log("→ Menyemai jadwal contoh (7 hari ke depan)...");
  const existing = await prisma.schedule.count();
  if (existing === 0) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    for (let i = 0; i < 5; i++) {
      const mentor = MENTORS[i % MENTORS.length];
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      await prisma.schedule.create({
        data: {
          mentorId: mentor.id,
          date: d,
          startTime: "08:00",
          endTime: "10:00",
          vehicleType: mentor.vehicleTypes[0],
          location: "Studio Kemudi.id — Kota Bogor",
          totalSlots: 4,
          filledSlots: i === 0 ? 3 : 0,
          status: i === 0 ? "FULL" : "AVAILABLE",
        },
      });
    }
    console.log(`  ${5} jadwal dibuat (${days.join(", ")}).`);
  } else {
    console.log("  Jadwal sudah ada, dilewati.");
  }

  console.log("✅ Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
