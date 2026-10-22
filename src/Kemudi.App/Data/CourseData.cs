namespace Kemudi.App.Data;

public static class CourseData
{
    public static readonly List<CoursePackage> Packages = new()
    {
        new("motor-reguler", "MOTOR", "Motor Reguler", "Pemula", 350_000, 4, 60,
            "Dasar keseimbangan, pengereman, dan bermanuver di lalu lintas ringan.",
            new[] { "4x sesi praktik simulasi 60 menit", "1x sesi teori rambu & etika berkendara", "Akses materi Motor selamanya", "Sertifikat kelulusan digital" }),
        new("motor-intensif", "MOTOR", "Motor Intensif", "Menengah", 550_000, 6, 60,
            "Untuk yang ingin lebih mahir bermanuver di jalan padat dan tikungan tajam.",
            new[] { "6x sesi praktik simulasi 60 menit", "Evaluasi progres tiap 2 sesi", "1-on-1 dengan mentor pilihan", "Akses materi Motor selamanya", "Sertifikat kelulusan digital" }),
        new("mobil-reguler", "MOBIL", "Mobil Reguler", "Pemula", 1_200_000, 8, 60,
            "Kursus paling populer — dari nol hingga siap ambil SIM A.",
            new[] { "8x sesi praktik simulasi 60 menit", "2x sesi teori (rambu & parkir)", "Akses materi Mobil selamanya", "Sertifikat kelulusan digital" }),
        new("mobil-intensif", "MOBIL", "Mobil Intensif", "Menengah", 1_950_000, 12, 60,
            "Lebih banyak jam terbang untuk parkir paralel, tanjakan, dan jalan tol.",
            new[] { "12x sesi praktik simulasi 60 menit", "Evaluasi progres tiap 3 sesi", "1-on-1 dengan mentor pilihan", "Simulasi ujian SIM A", "Akses materi Mobil selamanya", "Sertifikat kelulusan digital" }),
        new("mobil-mahir", "MOBIL", "Mobil Mahir Defensive Driving", "Mahir", 2_600_000, 10, 75,
            "Teknik defensive driving untuk kondisi jalan licin, ramai, dan darurat.",
            new[] { "10x sesi praktik simulasi 75 menit", "Skenario cuaca & jalan licin", "1-on-1 dengan mentor senior pilihan", "Sertifikat kelulusan digital" }),
        new("truk-reguler", "TRUK", "Truk Reguler", "Menengah", 3_200_000, 10, 90,
            "Persiapan SIM B1, fokus jarak pengereman panjang dan radius belok lebar.",
            new[] { "10x sesi praktik simulasi 90 menit", "2x sesi teori muatan & keselamatan", "1-on-1 dengan mentor pilihan", "Akses materi Truk selamanya", "Sertifikat kelulusan digital" }),
        new("truk-profesional", "TRUK", "Truk Profesional", "Mahir", 4_500_000, 14, 90,
            "Untuk calon pengemudi profesional — manuver di area sempit dan mundur presisi.",
            new[] { "14x sesi praktik simulasi 90 menit", "Skenario mundur & parkir area sempit", "1-on-1 dengan mentor senior pilihan", "Simulasi ujian SIM B1", "Sertifikat kelulusan digital" }),
    };

    public static readonly List<ScheduleSlot> Schedules = new()
    {
        new("pagi-weekday", "Senin – Jumat", "08.00 – 10.00", "Paling lengang"),
        new("siang-weekday", "Senin – Jumat", "13.00 – 15.00", null),
        new("sore-weekday", "Senin – Jumat", "16.00 – 18.00", "Favorit pekerja kantoran"),
        new("pagi-weekend", "Sabtu – Minggu", "09.00 – 11.00", null),
        new("siang-weekend", "Sabtu – Minggu", "14.00 – 16.00", "Favorit pelajar/mahasiswa"),
    };

    public static readonly List<string> WhatYouGet = new()
    {
        "Sesi praktik simulasi 3D interaktif dengan fisika kendaraan realistis",
        "Pendampingan langsung dari mentor pilihan Anda selama kursus",
        "Materi teori rambu lalu lintas & etika berkendara",
        "Evaluasi progres berkala agar tahu persis di mana perlu perbaikan",
        "Sertifikat kelulusan digital yang bisa dilampirkan saat ujian SIM",
        "Akses ulang materi kapan saja setelah kursus selesai",
    };

    public static string FormatRupiah(decimal value)
        => $"Rp {value.ToString("N0", new System.Globalization.CultureInfo("id-ID"))}";
}

public record CoursePackage(
    string Id, string VehicleType, string Label, string Level,
    decimal Price, int Sessions, int SessionDurationMin,
    string Description, string[] Includes);

public record ScheduleSlot(string Id, string Days, string Time, string? Note);

public static class MentorData
{
    public static readonly List<Mentor> List = new()
    {
        new("budi-santoso", "Budi Santoso", "Instruktur Senior Mobil & Motor",
            new[] { "MOTOR", "MOBIL" }, 12, 4.9, 480,
            "Mantan instruktur di sekolah mengemudi berlisensi Jakarta, spesialis membimbing pemula yang gugup di jalan ramai.",
            "BS", "#3b82f6", "+62 812-3456-7890",
            new Portfolio(
                new[] { "Lisensi Instruktur Mengemudi Nasional (LIMN)", "Sertifikasi Defensive Driving — Rifat Drive Labs" },
                new[] { "Membimbing lebih dari 480 murid dengan tingkat kelulusan SIM 94%", "Instruktur terbaik Kemudi.id 2024 & 2025" },
                new[] { new Testimonial("Sarah A.", "Sabar banget jelasinnya, dari yang takut nyetir jadi PD di tol."), new Testimonial("Doni P.", "Cara ngajar parkir paralelnya gampang diikuti, langsung bisa!") })),
        new("siti-rahma", "Siti Rahma", "Instruktur Mobil & Defensive Driving",
            new[] { "MOBIL" }, 8, 4.8, 310,
            "Fokus pada teknik defensive driving dan kesiapan menghadapi kondisi jalan licin atau darurat.",
            "SR", "#ec4899", "+62 811-2345-678",
            new Portfolio(
                new[] { "Certified Defensive Driving Instructor — Global Defensive Driving", "Sertifikasi P3K Berkendara" },
                new[] { "Pembicara workshop keselamatan berkendara wanita 2023", "Rating kepuasan murid rata-rata 4.8/5 dari 300+ ulasan" },
                new[] { new Testimonial("Rina K.", "Diajarin cara reaksi kalau tiba-tiba ada motor nyelip, berasa banget manfaatnya.") })),
        new("agus-wirawan", "Agus Wirawan", "Instruktur Truk & Kendaraan Besar",
            new[] { "TRUK", "MOBIL" }, 15, 4.9, 210,
            "Eks pengemudi logistik antarkota, ahli mengajarkan manuver truk di area sempit dan teknik mundur presisi.",
            "AW", "#16a34a", "+62 813-9876-5432",
            new Portfolio(
                new[] { "Sertifikasi Instruktur SIM B1/B2 — Kemenhub", "Sertifikasi Keselamatan Muatan & Logistik" },
                new[] { "15 tahun pengalaman mengemudikan truk logistik lintas provinsi", "Membimbing 210+ murid lulus ujian SIM B1" },
                new[] { new Testimonial("Hendra S.", "Diajarin trik mundur ke gang sempit, sekarang kerja jadi sopir truk perusahaan.") })),
        new("dewi-lestari", "Dewi Lestari", "Instruktur Motor",
            new[] { "MOTOR" }, 6, 4.7, 260,
            "Spesialis melatih pemula yang baru pertama kali naik motor, dengan pendekatan santai dan bertahap.",
            "DL", "#f97316", null,
            new Portfolio(
                new[] { "Lisensi Instruktur Mengemudi Nasional (LIMN)" },
                new[] { "Membimbing 260+ murid pemula tanpa insiden jatuh selama kursus", "Kontributor materi Dasar Berkendara Motor di Kemudi.id" },
                new[] { new Testimonial("Putri N.", "Awalnya takut banget sama motor, sekarang udah berani ke kampus naik motor sendiri.") })),
    };

    public static Mentor? ById(string id) => List.FirstOrDefault(m => m.Id == id);
}

public record Mentor(
    string Id, string Name, string Title, string[] VehicleTypes,
    int ExperienceYears, double Rating, int StudentsTrained,
    string Bio, string Initials, string AvatarColor, string? Phone,
    Portfolio Portfolio);

public record Portfolio(string[] Certifications, string[] Achievements, Testimonial[] Testimonials);
public record Testimonial(string Name, string Quote);
