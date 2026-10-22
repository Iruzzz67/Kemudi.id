using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Kemudi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    FullName = table.Column<string>(type: "TEXT", nullable: true),
                    NIK = table.Column<string>(type: "TEXT", nullable: true),
                    Address = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: true),
                    SecurityStamp = table.Column<string>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Courses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleType = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Courses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Mentors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleTypes = table.Column<string>(type: "TEXT", nullable: false),
                    ExperienceYears = table.Column<int>(type: "INTEGER", nullable: false),
                    Rating = table.Column<double>(type: "REAL", nullable: false),
                    StudentsTrained = table.Column<int>(type: "INTEGER", nullable: false),
                    Bio = table.Column<string>(type: "TEXT", nullable: false),
                    Initials = table.Column<string>(type: "TEXT", nullable: false),
                    AvatarColor = table.Column<string>(type: "TEXT", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: true),
                    Certifications = table.Column<string>(type: "TEXT", nullable: false),
                    Achievements = table.Column<string>(type: "TEXT", nullable: false),
                    TestimonialsJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mentors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SimulationAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleType = table.Column<string>(type: "TEXT", nullable: false),
                    Score = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    TimeTakenMs = table.Column<long>(type: "INTEGER", nullable: false, defaultValue: 0L),
                    Violations = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    OffRoadCount = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    CollisionCount = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    TrainingMode = table.Column<string>(type: "TEXT", nullable: true),
                    Completed = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SimulationAttempts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Color = table.Column<string>(type: "TEXT", nullable: false),
                    Length = table.Column<double>(type: "REAL", nullable: false),
                    Width = table.Column<double>(type: "REAL", nullable: false),
                    Height = table.Column<double>(type: "REAL", nullable: false),
                    MaxSpeed = table.Column<double>(type: "REAL", nullable: false),
                    ReverseMaxSpeed = table.Column<double>(type: "REAL", nullable: false),
                    Acceleration = table.Column<double>(type: "REAL", nullable: false),
                    Braking = table.Column<double>(type: "REAL", nullable: false),
                    Friction = table.Column<double>(type: "REAL", nullable: false),
                    Wheelbase = table.Column<double>(type: "REAL", nullable: false),
                    MaxSteerAngle = table.Column<double>(type: "REAL", nullable: false),
                    SteerRate = table.Column<double>(type: "REAL", nullable: false),
                    TireGrip = table.Column<double>(type: "REAL", nullable: false),
                    LeanAmount = table.Column<double>(type: "REAL", nullable: false),
                    GearCount = table.Column<int>(type: "INTEGER", nullable: false),
                    GearRatios = table.Column<string>(type: "TEXT", nullable: false),
                    CameraDistance = table.Column<double>(type: "REAL", nullable: false),
                    CameraHeight = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RoleId = table.Column<string>(type: "TEXT", nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderKey = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "TEXT", nullable: true),
                    UserId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    RoleId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    LoginProvider = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CoursePackages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", nullable: false),
                    CourseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: false),
                    Level = table.Column<string>(type: "TEXT", nullable: false),
                    Price = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Sessions = table.Column<int>(type: "INTEGER", nullable: false),
                    SessionDurationMin = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Includes = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoursePackages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoursePackages_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CourseRegistrations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    CoursePackageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MentorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    Phone = table.Column<string>(type: "TEXT", nullable: false),
                    NIK = table.Column<string>(type: "TEXT", nullable: false),
                    Address = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseRegistrations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseRegistrations_CoursePackages_CoursePackageId",
                        column: x => x.CoursePackageId,
                        principalTable: "CoursePackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CourseRegistrations_Mentors_MentorId",
                        column: x => x.MentorId,
                        principalTable: "Mentors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RegistrationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Method = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Reference = table.Column<string>(type: "TEXT", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_CourseRegistrations_RegistrationId",
                        column: x => x.RegistrationId,
                        principalTable: "CourseRegistrations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrainingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RegistrationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SessionNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Completed = table.Column<bool>(type: "INTEGER", nullable: false),
                    Score = table.Column<int>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainingSessions_CourseRegistrations_RegistrationId",
                        column: x => x.RegistrationId,
                        principalTable: "CourseRegistrations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Courses",
                columns: new[] { "Id", "Description", "Slug", "Title", "VehicleType" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000010"), "Dasar keseimbangan, pengereman, dan bermanuver.", "kursus-motor", "Kursus Motor", "MOTOR" },
                    { new Guid("00000000-0000-0000-0000-000000000011"), "Dari nol hingga siap ambil SIM A.", "kursus-mobil", "Kursus Mobil", "MOBIL" },
                    { new Guid("00000000-0000-0000-0000-000000000012"), "Persiapan SIM B1/B2.", "kursus-truk", "Kursus Truk", "TRUK" }
                });

            migrationBuilder.InsertData(
                table: "Mentors",
                columns: new[] { "Id", "Achievements", "AvatarColor", "Bio", "Certifications", "ExperienceYears", "Initials", "Name", "Phone", "Rating", "Slug", "StudentsTrained", "TestimonialsJson", "Title", "VehicleTypes" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000030"), "Membimbing lebih dari 480 murid dengan tingkat kelulusan SIM 94%\nInstruktur terbaik Kemudi.id 2024 & 2025", "#3b82f6", "Mantan instruktur di sekolah mengemudi berlisensi Jakarta, spesialis membimbing pemula yang gugup di jalan ramai.", "Lisensi Instruktur Mengemudi Nasional (LIMN)\nSertifikasi Defensive Driving — Rifat Drive Labs", 12, "BS", "Budi Santoso", "+62 812-3456-7890", 4.9000000000000004, "budi-santoso", 480, "[{\"name\":\"Sarah A.\",\"quote\":\"Sabar banget jelasinnya, dari yang takut nyetir jadi PD di tol.\"},{\"name\":\"Doni P.\",\"quote\":\"Cara ngajar parkir paralelnya gampang diikuti, langsung bisa!\"}]", "Instruktur Senior Mobil & Motor", "MOTOR,MOBIL" },
                    { new Guid("00000000-0000-0000-0000-000000000031"), "Pembicara workshop keselamatan berkendara wanita 2023\nRating kepuasan murid rata-rata 4.8/5 dari 300+ ulasan", "#ec4899", "Fokus pada teknik defensive driving dan kesiapan menghadapi kondisi jalan licin atau darurat.", "Certified Defensive Driving Instructor — Global Defensive Driving\nSertifikasi P3K Berkendara", 8, "SR", "Siti Rahma", "+62 811-2345-678", 4.7999999999999998, "siti-rahma", 310, "[{\"name\":\"Rina K.\",\"quote\":\"Diajarin cara reaksi kalau tiba-tiba ada motor nyelip, berasa banget manfaatnya.\"}]", "Instruktur Mobil & Defensive Driving", "MOBIL" },
                    { new Guid("00000000-0000-0000-0000-000000000032"), "15 tahun pengalaman mengemudikan truk logistik lintas provinsi\nMembimbing 210+ murid lulus ujian SIM B1", "#16a34a", "Eks pengemudi logistik antarkota, ahli mengajarkan manuver truk di area sempit dan teknik mundur presisi.", "Sertifikasi Instruktur SIM B1/B2 — Kemenhub\nSertifikasi Keselamatan Muatan & Logistik", 15, "AW", "Agus Wirawan", "+62 813-9876-5432", 4.9000000000000004, "agus-wirawan", 210, "[{\"name\":\"Hendra S.\",\"quote\":\"Diajarin trik mundur ke gang sempit, sekarang kerja jadi sopir truk perusahaan.\"}]", "Instruktur Truk & Kendaraan Besar", "TRUK,MOBIL" },
                    { new Guid("00000000-0000-0000-0000-000000000033"), "Membimbing 260+ murid pemula tanpa insiden jatuh selama kursus\nKontributor materi Dasar Berkendara Motor di Kemudi.id", "#f97316", "Spesialis melatih pemula yang baru pertama kali naik motor, dengan pendekatan santai dan bertahap.", "Lisensi Instruktur Mengemudi Nasional (LIMN)", 6, "DL", "Dewi Lestari", null, 4.7000000000000002, "dewi-lestari", 260, "[{\"name\":\"Putri N.\",\"quote\":\"Awalnya takut banget sama motor, sekarang udah berani ke kampus naik motor sendiri.\"}]", "Instruktur Motor", "MOTOR" }
                });

            migrationBuilder.InsertData(
                table: "Vehicles",
                columns: new[] { "Id", "Acceleration", "Braking", "CameraDistance", "CameraHeight", "Color", "Description", "Friction", "GearCount", "GearRatios", "Height", "Label", "LeanAmount", "Length", "MaxSpeed", "MaxSteerAngle", "ReverseMaxSpeed", "SteerRate", "TireGrip", "Type", "Wheelbase", "Width" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000001"), 9.0, 12.0, 5.0, 2.5, "#f97316", "Lincah dan cepat, tapi sempit dan rawan oleng.", 3.5, 4, "3,1,9,1,35,1", 1.1000000000000001, "Motor", 0.34999999999999998, 1.8, 26.0, 0.59999999999999998, 4.0, 6.0, 9.0, "MOTOR", 1.1000000000000001, 0.59999999999999998 },
                    { new Guid("00000000-0000-0000-0000-000000000002"), 6.0, 9.0, 8.0, 3.2000000000000002, "#3b82f6", "Seimbang antara kecepatan dan kendali.", 2.5, 5, "3,4,2,2,1,6,1,25,1", 1.3999999999999999, "Mobil", 0.080000000000000002, 4.2000000000000002, 22.0, 0.55000000000000004, 6.0, 4.5, 9.0, "MOBIL", 2.6000000000000001, 1.8 },
                    { new Guid("00000000-0000-0000-0000-000000000003"), 3.2000000000000002, 4.5, 13.0, 5.0, "#16a34a", "Besar dan berat, radius putar lebar, jarak rem panjang.", 1.8, 6, "4,2,3,2,3,1,75,1,3,1", 2.6000000000000001, "Truk", 0.040000000000000001, 7.5, 16.0, 0.40000000000000002, 4.0, 2.0, 6.0, "TRUK", 4.5, 2.3999999999999999 }
                });

            migrationBuilder.InsertData(
                table: "CoursePackages",
                columns: new[] { "Id", "CourseId", "Description", "Includes", "Label", "Level", "Price", "SessionDurationMin", "Sessions", "Slug" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000020"), new Guid("00000000-0000-0000-0000-000000000010"), "Dasar keseimbangan, pengereman, dan bermanuver di lalu lintas ringan.", "4x sesi praktik simulasi 60 menit\n1x sesi teori rambu & etika berkendara\nAkses materi Motor selamanya\nSertifikat kelulusan digital", "Motor Reguler", "Pemula", 350000m, 60, 4, "motor-reguler" },
                    { new Guid("00000000-0000-0000-0000-000000000021"), new Guid("00000000-0000-0000-0000-000000000010"), "Untuk yang ingin lebih mahir bermanuver di jalan padat dan tikungan tajam.", "6x sesi praktik simulasi 60 menit\nEvaluasi progres tiap 2 sesi\n1-on-1 dengan mentor pilihan\nAkses materi Motor selamanya\nSertifikat kelulusan digital", "Motor Intensif", "Menengah", 550000m, 60, 6, "motor-intensif" },
                    { new Guid("00000000-0000-0000-0000-000000000022"), new Guid("00000000-0000-0000-0000-000000000011"), "Kursus paling populer — dari nol hingga siap ambil SIM A.", "8x sesi praktik simulasi 60 menit\n2x sesi teori (rambu & parkir)\nAkses materi Mobil selamanya\nSertifikat kelulusan digital", "Mobil Reguler", "Pemula", 1200000m, 60, 8, "mobil-reguler" },
                    { new Guid("00000000-0000-0000-0000-000000000023"), new Guid("00000000-0000-0000-0000-000000000011"), "Lebih banyak jam terbang untuk parkir paralel, tanjakan, dan jalan tol.", "12x sesi praktik simulasi 60 menit\nEvaluasi progres tiap 3 sesi\n1-on-1 dengan mentor pilihan\nSimulasi ujian SIM A\nAkses materi Mobil selamanya\nSertifikat kelulusan digital", "Mobil Intensif", "Menengah", 1950000m, 60, 12, "mobil-intensif" },
                    { new Guid("00000000-0000-0000-0000-000000000024"), new Guid("00000000-0000-0000-0000-000000000011"), "Teknik defensive driving untuk kondisi jalan licin, ramai, dan darurat.", "10x sesi praktik simulasi 75 menit\nSkenario cuaca & jalan licin\n1-on-1 dengan mentor senior pilihan\nSertifikat kelulusan digital", "Mobil Mahir Defensive Driving", "Mahir", 2600000m, 75, 10, "mobil-mahir" },
                    { new Guid("00000000-0000-0000-0000-000000000025"), new Guid("00000000-0000-0000-0000-000000000012"), "Persiapan SIM B1, fokus jarak pengereman panjang dan radius belok lebar.", "10x sesi praktik simulasi 90 menit\n2x sesi teori muatan & keselamatan\n1-on-1 dengan mentor pilihan\nAkses materi Truk selamanya\nSertifikat kelulusan digital", "Truk Reguler", "Menengah", 3200000m, 90, 10, "truk-reguler" },
                    { new Guid("00000000-0000-0000-0000-000000000026"), new Guid("00000000-0000-0000-0000-000000000012"), "Untuk calon pengemudi profesional — manuver di area sempit dan mundur presisi.", "14x sesi praktik simulasi 90 menit\nSkenario mundur & parkir area sempit\n1-on-1 dengan mentor senior pilihan\nSimulasi ujian SIM B1\nSertifikat kelulusan digital", "Truk Profesional", "Mahir", 4500000m, 90, 14, "truk-profesional" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CoursePackages_CourseId",
                table: "CoursePackages",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CoursePackages_Slug",
                table: "CoursePackages",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseRegistrations_CoursePackageId",
                table: "CourseRegistrations",
                column: "CoursePackageId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseRegistrations_Email",
                table: "CourseRegistrations",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_CourseRegistrations_MentorId",
                table: "CourseRegistrations",
                column: "MentorId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseRegistrations_UserId",
                table: "CourseRegistrations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Courses_Slug",
                table: "Courses",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mentors_Slug",
                table: "Mentors",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_RegistrationId",
                table: "Payments",
                column: "RegistrationId");

            migrationBuilder.CreateIndex(
                name: "IX_SimulationAttempts_CreatedAt",
                table: "SimulationAttempts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SimulationAttempts_UserId",
                table: "SimulationAttempts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_RegistrationId",
                table: "TrainingSessions",
                column: "RegistrationId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_Type",
                table: "Vehicles",
                column: "Type",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "SimulationAttempts");

            migrationBuilder.DropTable(
                name: "TrainingSessions");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "CourseRegistrations");

            migrationBuilder.DropTable(
                name: "CoursePackages");

            migrationBuilder.DropTable(
                name: "Mentors");

            migrationBuilder.DropTable(
                name: "Courses");
        }
    }
}
