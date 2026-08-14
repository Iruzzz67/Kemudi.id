using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Infrastructure.Data;

/// <summary>
/// Data awal aplikasi — padanan dari konstanta <c>lib/vehicles.ts</c>,
/// <c>lib/kursus-data.ts</c>, dan <c>lib/materi-data.ts</c> pada aplikasi lama.
/// </summary>
public static class SeedData
{
    public static void Seed(ModelBuilder builder)
    {
        SeedVehicles(builder);
        SeedCourses(builder);
        SeedMentors(builder);
    }

    private static void SeedVehicles(ModelBuilder builder)
    {
        builder.Entity<Vehicle>().HasData(
            new Vehicle
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Type = VehicleType.MOTOR,
                Label = "Motor",
                Description = "Lincah dan cepat, tapi sempit dan rawan oleng.",
                Color = "#f97316",
                Length = 1.8, Width = 0.6, Height = 1.1,
                MaxSpeed = 19.44, ReverseMaxSpeed = 4, Acceleration = 9, Braking = 12, // 70 km/j maksimum
                Friction = 3.5, Wheelbase = 1.1,
                MaxSteerAngle = 0.6, SteerRate = 6, TireGrip = 9, LeanAmount = 0.35,
                GearCount = 4,
                GearRatios = new[] { 3.0, 1.9, 1.35, 1.0 },
                CameraDistance = 5, CameraHeight = 2.5
            },
            new Vehicle
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                Type = VehicleType.MOBIL,
                Label = "Mobil",
                Description = "Seimbang antara kecepatan dan kendali.",
                Color = "#3b82f6",
                Length = 4.2, Width = 1.8, Height = 1.4,
                MaxSpeed = 19.44, ReverseMaxSpeed = 6, Acceleration = 6, Braking = 9, // 70 km/j maksimum
                Friction = 2.5, Wheelbase = 2.6,
                MaxSteerAngle = 0.55, SteerRate = 4.5, TireGrip = 9, LeanAmount = 0.08,
                GearCount = 5,
                GearRatios = new[] { 3.4, 2.2, 1.6, 1.25, 1.0 },
                CameraDistance = 8, CameraHeight = 3.2
            },
            new Vehicle
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Type = VehicleType.TRUK,
                Label = "Truk",
                Description = "Besar dan berat, radius putar lebar, jarak rem panjang.",
                Color = "#16a34a",
                Length = 7.5, Width = 2.4, Height = 2.6,
                MaxSpeed = 19.44, ReverseMaxSpeed = 4, Acceleration = 3.2, Braking = 4.5, // 70 km/j maksimum
                Friction = 1.8, Wheelbase = 4.5,
                MaxSteerAngle = 0.4, SteerRate = 2, TireGrip = 6, LeanAmount = 0.04,
                GearCount = 6,
                GearRatios = new[] { 4.2, 3.0, 2.3, 1.75, 1.3, 1.0 },
                CameraDistance = 13, CameraHeight = 5
            });
    }

    private static void SeedCourses(ModelBuilder builder)
    {
        var motor = Guid.Parse("00000000-0000-0000-0000-000000000010");
        var mobil = Guid.Parse("00000000-0000-0000-0000-000000000011");
        var truk = Guid.Parse("00000000-0000-0000-0000-000000000012");

        builder.Entity<Course>().HasData(
            new Course { Id = motor, Slug = "kursus-motor", Title = "Kursus Motor", VehicleType = VehicleType.MOTOR, Description = "Dasar keseimbangan, pengereman, dan bermanuver." },
            new Course { Id = mobil, Slug = "kursus-mobil", Title = "Kursus Mobil", VehicleType = VehicleType.MOBIL, Description = "Dari nol hingga siap ambil SIM A." },
            new Course { Id = truk, Slug = "kursus-truk", Title = "Kursus Truk", VehicleType = VehicleType.TRUK, Description = "Persiapan SIM B1/B2." });

        var paketMotorReguler = Guid.Parse("00000000-0000-0000-0000-000000000020");
        var paketMotorIntensif = Guid.Parse("00000000-0000-0000-0000-000000000021");
        var paketMobilReguler = Guid.Parse("00000000-0000-0000-0000-000000000022");
        var paketMobilIntensif = Guid.Parse("00000000-0000-0000-0000-000000000023");
        var paketMobilMahir = Guid.Parse("00000000-0000-0000-0000-000000000024");
        var paketTrukReguler = Guid.Parse("00000000-0000-0000-0000-000000000025");
        var paketTrukProfesional = Guid.Parse("00000000-0000-0000-0000-000000000026");

        builder.Entity<CoursePackage>().HasData(
            new CoursePackage { Id = paketMotorReguler, Slug = "motor-reguler", CourseId = motor, Label = "Motor Reguler", Level = CourseLevel.Pemula, Price = 350_000, Sessions = 4, SessionDurationMin = 60, Description = "Dasar keseimbangan, pengereman, dan bermanuver di lalu lintas ringan.", Includes = "4x sesi praktik simulasi 60 menit\n1x sesi teori rambu & etika berkendara\nAkses materi Motor selamanya\nSertifikat kelulusan digital" },
            new CoursePackage { Id = paketMotorIntensif, Slug = "motor-intensif", CourseId = motor, Label = "Motor Intensif", Level = CourseLevel.Menengah, Price = 550_000, Sessions = 6, SessionDurationMin = 60, Description = "Untuk yang ingin lebih mahir bermanuver di jalan padat dan tikungan tajam.", Includes = "6x sesi praktik simulasi 60 menit\nEvaluasi progres tiap 2 sesi\n1-on-1 dengan mentor pilihan\nAkses materi Motor selamanya\nSertifikat kelulusan digital" },
            new CoursePackage { Id = paketMobilReguler, Slug = "mobil-reguler", CourseId = mobil, Label = "Mobil Reguler", Level = CourseLevel.Pemula, Price = 1_200_000, Sessions = 8, SessionDurationMin = 60, Description = "Kursus paling populer — dari nol hingga siap ambil SIM A.", Includes = "8x sesi praktik simulasi 60 menit\n2x sesi teori (rambu & parkir)\nAkses materi Mobil selamanya\nSertifikat kelulusan digital" },
            new CoursePackage { Id = paketMobilIntensif, Slug = "mobil-intensif", CourseId = mobil, Label = "Mobil Intensif", Level = CourseLevel.Menengah, Price = 1_950_000, Sessions = 12, SessionDurationMin = 60, Description = "Lebih banyak jam terbang untuk parkir paralel, tanjakan, dan jalan tol.", Includes = "12x sesi praktik simulasi 60 menit\nEvaluasi progres tiap 3 sesi\n1-on-1 dengan mentor pilihan\nSimulasi ujian SIM A\nAkses materi Mobil selamanya\nSertifikat kelulusan digital" },
            new CoursePackage { Id = paketMobilMahir, Slug = "mobil-mahir", CourseId = mobil, Label = "Mobil Mahir Defensive Driving", Level = CourseLevel.Mahir, Price = 2_600_000, Sessions = 10, SessionDurationMin = 75, Description = "Teknik defensive driving untuk kondisi jalan licin, ramai, dan darurat.", Includes = "10x sesi praktik simulasi 75 menit\nSkenario cuaca & jalan licin\n1-on-1 dengan mentor senior pilihan\nSertifikat kelulusan digital" },
            new CoursePackage { Id = paketTrukReguler, Slug = "truk-reguler", CourseId = truk, Label = "Truk Reguler", Level = CourseLevel.Menengah, Price = 3_200_000, Sessions = 10, SessionDurationMin = 90, Description = "Persiapan SIM B1, fokus jarak pengereman panjang dan radius belok lebar.", Includes = "10x sesi praktik simulasi 90 menit\n2x sesi teori muatan & keselamatan\n1-on-1 dengan mentor pilihan\nAkses materi Truk selamanya\nSertifikat kelulusan digital" },
            new CoursePackage { Id = paketTrukProfesional, Slug = "truk-profesional", CourseId = truk, Label = "Truk Profesional", Level = CourseLevel.Mahir, Price = 4_500_000, Sessions = 14, SessionDurationMin = 90, Description = "Untuk calon pengemudi profesional — manuver di area sempit dan mundur presisi.", Includes = "14x sesi praktik simulasi 90 menit\nSkenario mundur & parkir area sempit\n1-on-1 dengan mentor senior pilihan\nSimulasi ujian SIM B1\nSertifikat kelulusan digital" });
    }

    private static void SeedMentors(ModelBuilder builder)
    {
        builder.Entity<Mentor>().HasData(
            new Mentor
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000030"),
                Slug = "budi-santoso", Name = "Budi Santoso", Title = "Instruktur Senior Mobil & Motor",
                VehicleTypes = "MOTOR,MOBIL", ExperienceYears = 12, Rating = 4.9, StudentsTrained = 480,
                Bio = "Mantan instruktur di sekolah mengemudi berlisensi Jakarta, spesialis membimbing pemula yang gugup di jalan ramai.",
                Initials = "BS", AvatarColor = "#3b82f6", Phone = "+62 812-3456-7890",
                Certifications = "Lisensi Instruktur Mengemudi Nasional (LIMN)\nSertifikasi Defensive Driving — Rifat Drive Labs",
                Achievements = "Membimbing lebih dari 480 murid dengan tingkat kelulusan SIM 94%\nInstruktur terbaik Kemudi.id 2024 & 2025",
                TestimonialsJson = """[{"name":"Sarah A.","quote":"Sabar banget jelasinnya, dari yang takut nyetir jadi PD di tol."},{"name":"Doni P.","quote":"Cara ngajar parkir paralelnya gampang diikuti, langsung bisa!"}]"""
            },
            new Mentor
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000031"),
                Slug = "siti-rahma", Name = "Siti Rahma", Title = "Instruktur Mobil & Defensive Driving",
                VehicleTypes = "MOBIL", ExperienceYears = 8, Rating = 4.8, StudentsTrained = 310,
                Bio = "Fokus pada teknik defensive driving dan kesiapan menghadapi kondisi jalan licin atau darurat.",
                Initials = "SR", AvatarColor = "#ec4899", Phone = "+62 811-2345-678",
                Certifications = "Certified Defensive Driving Instructor — Global Defensive Driving\nSertifikasi P3K Berkendara",
                Achievements = "Pembicara workshop keselamatan berkendara wanita 2023\nRating kepuasan murid rata-rata 4.8/5 dari 300+ ulasan",
                TestimonialsJson = """[{"name":"Rina K.","quote":"Diajarin cara reaksi kalau tiba-tiba ada motor nyelip, berasa banget manfaatnya."}]"""
            },
            new Mentor
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000032"),
                Slug = "agus-wirawan", Name = "Agus Wirawan", Title = "Instruktur Truk & Kendaraan Besar",
                VehicleTypes = "TRUK,MOBIL", ExperienceYears = 15, Rating = 4.9, StudentsTrained = 210,
                Bio = "Eks pengemudi logistik antarkota, ahli mengajarkan manuver truk di area sempit dan teknik mundur presisi.",
                Initials = "AW", AvatarColor = "#16a34a", Phone = "+62 813-9876-5432",
                Certifications = "Sertifikasi Instruktur SIM B1/B2 — Kemenhub\nSertifikasi Keselamatan Muatan & Logistik",
                Achievements = "15 tahun pengalaman mengemudikan truk logistik lintas provinsi\nMembimbing 210+ murid lulus ujian SIM B1",
                TestimonialsJson = """[{"name":"Hendra S.","quote":"Diajarin trik mundur ke gang sempit, sekarang kerja jadi sopir truk perusahaan."}]"""
            },
            new Mentor
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000033"),
                Slug = "dewi-lestari", Name = "Dewi Lestari", Title = "Instruktur Motor",
                VehicleTypes = "MOTOR", ExperienceYears = 6, Rating = 4.7, StudentsTrained = 260,
                Bio = "Spesialis melatih pemula yang baru pertama kali naik motor, dengan pendekatan santai dan bertahap.",
                Initials = "DL", AvatarColor = "#f97316",
                Certifications = "Lisensi Instruktur Mengemudi Nasional (LIMN)",
                Achievements = "Membimbing 260+ murid pemula tanpa insiden jatuh selama kursus\nKontributor materi Dasar Berkendara Motor di Kemudi.id",
                TestimonialsJson = """[{"name":"Putri N.","quote":"Awalnya takut banget sama motor, sekarang udah berani ke kampus naik motor sendiri."}]"""
            });
    }
}
