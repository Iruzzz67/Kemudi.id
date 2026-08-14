# MIGRASI .NET FULL — Website Kemudi.id

> Ringkasan eksekutif migrasi website dari Next.js/React/TypeScript ke
> **ASP.NET Core + Blazor + EF Core + Identity**, sesuai
> [`KEMUDI_ID_MIGRASI_DOTNET_OPTIMASI.md`](../KEMUDI_ID_MIGRASI_DOTNET_OPTIMASI.md).

---

## 1. Arsitektur akhir

```text
Kemudi.id
├── src/
│   ├── Kemudi.Domain/          # Entity + Enum + business rules
│   ├── Kemudi.Shared/          # DTO + contracts (dipakai Web & Api)
│   ├── Kemudi.Infrastructure/  # EF Core + Identity + JWT + Migrations
│   ├── Kemudi.Api/             # ASP.NET Core Web API (REST)
│   └── Kemudi.Web/             # Blazor Web App (Interactive Server)
├── simulation/
│   └── Kemudi.Simulation/      # Unity (lihat docs/OPTIMASI_SIMULASI.md)
└── Kemudi.slnx
```

Prinsip komunikasi (dokumen §61):

```text
Kemudi.Web ──→ Launch Simulation ──→ Unity App ──→ Simulation Result ──→ Kemudi.Api ──→ Database
Standalone VR: Unity App ──→ API HTTPS
```

Unity TIDAK dijalankan di dalam Blazor — hasil dikirim sebagai JSON ke REST API.

---

## 2. Teknologi lama → baru

| Lama (tidak dipakai lagi) | Baru (runtime utama) |
|---|---|
| Next.js / React / TSX | ASP.NET Core + Blazor Components |
| TypeScript | C# |
| Tailwind | CSS / CSS isolation (`app.css`) |
| NextAuth | ASP.NET Core Identity (UserManager) + JWT |
| Prisma | Entity Framework Core |
| Next API Routes | ASP.NET Core Web API |
| Zustand | DI services (Scoped/Singleton) + state komponen |
| `localStorage` | Database/API (cookie httpOnly untuk token) |

> **Keputusan autentikasi:** sesuai dokumen §7, Identity tetap menjadi dasar
> (UserManager, password hashing, role). Token yang dipakai adalah **JWT**
> karena API harus melayani klien Unity standalone (VR) yang tidak memiliki
> cookie browser. Di sisi Blazor, token disimpan di cookie httpOnly
> `kemudi_token` (SameSite=Lax, umur 7 hari) dan disisipkan otomatis ke header
> `Authorization` oleh `ApiClient`. Skor tetap divalidasi server (§8, §62).

---

## 3. Entity & Database (§8)

`Kemudi.Infrastructure/Data/AppDbContext.cs` — `IdentityDbContext<ApplicationUser>`:

| Entity | Catatan |
|---|---|
| `User` (ApplicationUser) | Identity: email unique, FullName, CreatedAt |
| `Course` | 3 kursus (Motor/Mobil/Truk), slug unique |
| `CoursePackage` | 7 paket, harga, jumlah sesi, level |
| `Mentor` | Rating, pengalaman, portofolio, vehicleTypes |
| `CourseRegistration` | Data diri + NIK + alamat + metode bayar |
| `Payment` | Transfer/E-Wallet/Cash, status, amount |
| `SimulationAttempt` | Hasil simulasi — lihat di bawah |
| `TrainingSession` | Sesi latihan terencana |

`SimulationAttempt` mengikuti struktur dokumen §8:

```text
Id · UserId · VehicleType · Score (0-100) · TimeTakenMs · Violations
· OffRoadCount · ObstacleHits · TrainingMode? · Completed · CreatedAt
```

> Kolom `ObstacleHits` adalah hasil rename dari `CollisionCount` (migrasi
> `RenameCollisionCountToObstacleHits`) agar konsisten dengan JSON §62
> (`obstacleHits`) dan istilah `obstacleHits` pada aplikasi web lama.

### Migrasi database

```bash
cd src/Kemudi.Api
dotnet ef migrations add <NamaMigrasi> --project ../Kemudi.Infrastructure --startup-project .
dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .
```

Data seed (`SeedData.cs`): 3 kendaraan, 3 kursus, 7 paket, 4 mentor — dipindah
dari `lib/vehicles.ts` & `lib/kursus-data.ts`.

---

## 4. REST API (§9)

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | ✅ JWT |
| GET | `/api/courses` · `/api/courses/{slug}` | — |
| GET | `/api/mentors` · `/api/mentors/{slug}` | — |
| GET | `/api/vehicles` | — |
| POST | `/api/course-registration` | opsional |
| GET | `/api/course-registration/{id}` | — |
| POST | `/api/payment` | — |
| POST · GET | `/api/progress` | ✅ JWT |

Validasi skor (§8, §62): API **tidak mempercayai skor mentah** — skor harus
`0..100` (di luar itu ditolak), semua field ≥ 0, `vehicleType` harus
`MOTOR|MOBIL|TRUK`.

---

## 5. Halaman Blazor (§6.1)

Semua rute lama dipindah:

```text
/                        /kursus            /kursus/mentor/{id}
/kursus/personal         /kursus/payment    /materi · /materi/{slug}
/simulasi                /login · /register /dashboard
```

| Halaman | Konten |
|---|---|
| `Home` | Hero, 3 kendaraan, materi terbaru |
| `Kursus` | Filter kendaraan, 7 paket, pilih mentor |
| `MentorDetail` | Sertifikasi, prestasi, testimoni, tombol lanjut pendaftaran |
| `Personal` | Data diri + NIK + alamat + metode bayar |
| `Payment` | Instruksi bayar (transfer/QRIS/cash) + konfirmasi |
| `Materi` / `MateriDetail` | Materi teori (`MateriData.cs`) |
| `Login` / `Register` | Auth via API, token → cookie |
| `Dashboard` | Statistik + riwayat latihan + status pendaftaran |
| `Simulasi` | **Launcher** ke Unity (lihat di bawah) |

---

## 6. Simulasi launcher (alur §61)

`/simulasi` di Blazor adalah **launcher**, bukan engine simulasi:

1. User memilih kendaraan (MOTOR/MOBIL/TRUK).
2. Tombol "Luncurkan Simulasi" memulai aplikasi Unity (desktop build / VR standalone).
3. Unity menjalankan simulasi dan mengirim hasil ke `POST /api/progress`
   (lihat `simulation/.../Core/SimulationResultReporter.cs`).
4. Dashboard menampilkan riwayat dari `GET /api/progress`.

---

## 7. Cara menjalankan

```bash
dotnet build Kemudi.slnx

# DB (SQLite, ter-seed)
cd src/Kemudi.Api
dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .

# API → http://localhost:5077 (Swagger /swagger)
dotnet run --project src/Kemudi.Api

# Web → http://localhost:5259
dotnet run --project src/Kemudi.Web
```

Konfigurasi: `Api:BaseUrl` di `src/Kemudi.Web/appsettings.json` →
`http://localhost:5077`. Untuk production ganti `ConnectionStrings:KemudiDb`
(SQL Server/PostgreSQL) dan set `Jwt:SecretKey` yang kuat.

---

## 8. Status migrasi (Definition of Done §84)

- [x] Tidak memakai Next.js/React/TSX/Prisma/NextAuth sebagai runtime website
- [x] Blazor + ASP.NET Core API + EF Core + Identity berjalan
- [x] Login/register/kursus/payment/dashboard/progress
- [ ] Unity gameplay lengkap (lihat `docs/OPTIMASI_SIMULASI.md`)
