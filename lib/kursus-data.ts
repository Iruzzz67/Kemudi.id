import { VehicleType } from "@/lib/vehicles";

export type CourseLevel = "Pemula" | "Menengah" | "Mahir";

export type CoursePackage = {
  id: string;
  vehicleType: VehicleType;
  label: string;
  level: CourseLevel;
  price: number; // IDR
  sessions: number;
  sessionDurationMin: number;
  description: string;
  includes: string[];
};

export const COURSE_PACKAGES: CoursePackage[] = [
  {
    id: "motor-reguler",
    vehicleType: "MOTOR",
    label: "Motor Reguler",
    level: "Pemula",
    price: 350_000,
    sessions: 4,
    sessionDurationMin: 60,
    description: "Dasar keseimbangan, pengereman, dan bermanuver di lalu lintas ringan.",
    includes: [
      "4x sesi praktik simulasi 60 menit",
      "1x sesi teori rambu & etika berkendara",
      "Akses materi Motor selamanya",
      "Sertifikat kelulusan digital",
    ],
  },
  {
    id: "motor-intensif",
    vehicleType: "MOTOR",
    label: "Motor Intensif",
    level: "Menengah",
    price: 550_000,
    sessions: 6,
    sessionDurationMin: 60,
    description: "Untuk yang ingin lebih mahir bermanuver di jalan padat dan tikungan tajam.",
    includes: [
      "6x sesi praktik simulasi 60 menit",
      "Evaluasi progres tiap 2 sesi",
      "1-on-1 dengan mentor pilihan",
      "Akses materi Motor selamanya",
      "Sertifikat kelulusan digital",
    ],
  },
  {
    id: "mobil-reguler",
    vehicleType: "MOBIL",
    label: "Mobil Reguler",
    level: "Pemula",
    price: 1_200_000,
    sessions: 8,
    sessionDurationMin: 60,
    description: "Kursus paling populer — dari nol hingga siap ambil SIM A.",
    includes: [
      "8x sesi praktik simulasi 60 menit",
      "2x sesi teori (rambu & parkir)",
      "Akses materi Mobil selamanya",
      "Sertifikat kelulusan digital",
    ],
  },
  {
    id: "mobil-intensif",
    vehicleType: "MOBIL",
    label: "Mobil Intensif",
    level: "Menengah",
    price: 1_950_000,
    sessions: 12,
    sessionDurationMin: 60,
    description: "Lebih banyak jam terbang untuk parkir paralel, tanjakan, dan jalan tol.",
    includes: [
      "12x sesi praktik simulasi 60 menit",
      "Evaluasi progres tiap 3 sesi",
      "1-on-1 dengan mentor pilihan",
      "Simulasi ujian SIM A",
      "Akses materi Mobil selamanya",
      "Sertifikat kelulusan digital",
    ],
  },
  {
    id: "mobil-mahir",
    vehicleType: "MOBIL",
    label: "Mobil Mahir Defensive Driving",
    level: "Mahir",
    price: 2_600_000,
    sessions: 10,
    sessionDurationMin: 75,
    description: "Teknik defensive driving untuk kondisi jalan licin, ramai, dan darurat.",
    includes: [
      "10x sesi praktik simulasi 75 menit",
      "Skenario cuaca & jalan licin",
      "1-on-1 dengan mentor senior pilihan",
      "Sertifikat kelulusan digital",
    ],
  },
  {
    id: "truk-reguler",
    vehicleType: "TRUK",
    label: "Truk Reguler",
    level: "Menengah",
    price: 3_200_000,
    sessions: 10,
    sessionDurationMin: 90,
    description: "Persiapan SIM B1, fokus jarak pengereman panjang dan radius belok lebar.",
    includes: [
      "10x sesi praktik simulasi 90 menit",
      "2x sesi teori muatan & keselamatan",
      "1-on-1 dengan mentor pilihan",
      "Akses materi Truk selamanya",
      "Sertifikat kelulusan digital",
    ],
  },
  {
    id: "truk-profesional",
    vehicleType: "TRUK",
    label: "Truk Profesional",
    level: "Mahir",
    price: 4_500_000,
    sessions: 14,
    sessionDurationMin: 90,
    description: "Untuk calon pengemudi profesional — manuver di area sempit dan mundur presisi.",
    includes: [
      "14x sesi praktik simulasi 90 menit",
      "Skenario mundur & parkir area sempit",
      "1-on-1 dengan mentor senior pilihan",
      "Simulasi ujian SIM B1",
      "Sertifikat kelulusan digital",
    ],
  },
];

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export type ScheduleSlot = {
  id: string;
  days: string;
  time: string;
  note?: string;
};

export const SCHEDULE_SLOTS: ScheduleSlot[] = [
  { id: "pagi-weekday", days: "Senin – Jumat", time: "08.00 – 10.00", note: "Paling lengang" },
  { id: "siang-weekday", days: "Senin – Jumat", time: "13.00 – 15.00" },
  { id: "sore-weekday", days: "Senin – Jumat", time: "16.00 – 18.00", note: "Favorit pekerja kantoran" },
  { id: "pagi-weekend", days: "Sabtu – Minggu", time: "09.00 – 11.00" },
  { id: "siang-weekend", days: "Sabtu – Minggu", time: "14.00 – 16.00", note: "Favorit pelajar/mahasiswa" },
];

export type Mentor = {
  id: string;
  name: string;
  title: string;
  vehicleTypes: VehicleType[];
  experienceYears: number;
  rating: number;
  studentsTrained: number;
  bio: string;
  initials: string;
  avatarColor: string;
  phone?: string;
  portfolio: {
    certifications: string[];
    achievements: string[];
    testimonials: { name: string; quote: string }[];
  };
};

export const MENTORS: Mentor[] = [
  {
    id: "budi-santoso",
    name: "Budi Santoso",
    title: "Instruktur Senior Mobil & Motor",
    vehicleTypes: ["MOTOR", "MOBIL"],
    experienceYears: 12,
    rating: 4.9,
    studentsTrained: 480,
    bio: "Mantan instruktur di sekolah mengemudi berlisensi Jakarta, spesialis membimbing pemula yang gugup di jalan ramai.",
    initials: "BS",
    avatarColor: "#3b82f6",
    phone: "+62 812-3456-7890",
    portfolio: {
      certifications: [
        "Lisensi Instruktur Mengemudi Nasional (LIMN)",
        "Sertifikasi Defensive Driving — Rifat Drive Labs",
      ],
      achievements: [
        "Membimbing lebih dari 480 murid dengan tingkat kelulusan SIM 94%",
        "Instruktur terbaik Kemudi.id 2024 & 2025",
      ],
      testimonials: [
        { name: "Sarah A.", quote: "Sabar banget jelasinnya, dari yang takut nyetir jadi PD di tol." },
        { name: "Doni P.", quote: "Cara ngajar parkir paralelnya gampang diikuti, langsung bisa!" },
      ],
    },
  },
  {
    id: "siti-rahma",
    name: "Siti Rahma",
    title: "Instruktur Mobil & Defensive Driving",
    vehicleTypes: ["MOBIL"],
    experienceYears: 8,
    rating: 4.8,
    studentsTrained: 310,
    bio: "Fokus pada teknik defensive driving dan kesiapan menghadapi kondisi jalan licin atau darurat.",
    initials: "SR",
    avatarColor: "#ec4899",
    phone: "+62 811-2345-678",
    portfolio: {
      certifications: [
        "Certified Defensive Driving Instructor — Global Defensive Driving",
        "Sertifikasi P3K Berkendara",
      ],
      achievements: [
        "Pembicara workshop keselamatan berkendara wanita 2023",
        "Rating kepuasan murid rata-rata 4.8/5 dari 300+ ulasan",
      ],
      testimonials: [
        { name: "Rina K.", quote: "Diajarin cara reaksi kalau tiba-tiba ada motor nyelip, berasa banget manfaatnya." },
      ],
    },
  },
  {
    id: "agus-wirawan",
    name: "Agus Wirawan",
    title: "Instruktur Truk & Kendaraan Besar",
    vehicleTypes: ["TRUK", "MOBIL"],
    experienceYears: 15,
    rating: 4.9,
    studentsTrained: 210,
    bio: "Eks pengemudi logistik antarkota, ahli mengajarkan manuver truk di area sempit dan teknik mundur presisi.",
    initials: "AW",
    avatarColor: "#16a34a",
    phone: "+62 813-9876-5432",
    portfolio: {
      certifications: [
        "Sertifikasi Instruktur SIM B1/B2 — Kemenhub",
        "Sertifikasi Keselamatan Muatan & Logistik",
      ],
      achievements: [
        "15 tahun pengalaman mengemudikan truk logistik lintas provinsi",
        "Membimbing 210+ murid lulus ujian SIM B1",
      ],
      testimonials: [
        { name: "Hendra S.", quote: "Diajarin trik mundur ke gang sempit, sekarang kerja jadi sopir truk perusahaan." },
      ],
    },
  },
  {
    id: "dewi-lestari",
    name: "Dewi Lestari",
    title: "Instruktur Motor",
    vehicleTypes: ["MOTOR"],
    experienceYears: 6,
    rating: 4.7,
    studentsTrained: 260,
    bio: "Spesialis melatih pemula yang baru pertama kali naik motor, dengan pendekatan santai dan bertahap.",
    initials: "DL",
    avatarColor: "#f97316",
    portfolio: {
      certifications: ["Lisensi Instruktur Mengemudi Nasional (LIMN)"],
      achievements: [
        "Membimbing 260+ murid pemula tanpa insiden jatuh selama kursus",
        "Kontributor materi Dasar Berkendara Motor di Kemudi.id",
      ],
      testimonials: [
        { name: "Putri N.", quote: "Awalnya takut banget sama motor, sekarang udah berani ke kampus naik motor sendiri." },
      ],
    },
  },
];

export const WHAT_YOU_GET: string[] = [
  "Sesi praktik simulasi 3D interaktif dengan fisika kendaraan realistis",
  "Pendampingan langsung dari mentor pilihan Anda selama kursus",
  "Materi teori rambu lalu lintas & etika berkendara",
  "Evaluasi progres berkala agar tahu persis di mana perlu perbaikan",
  "Sertifikat kelulusan digital yang bisa dilampirkan saat ujian SIM",
  "Akses ulang materi kapan saja setelah kursus selesai",
];
