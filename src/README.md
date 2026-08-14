# Kemudi.id — Migrasi .NET (src/)

Bagian ini adalah hasil implementasi **PHASE 1–4** dari
[`KEMUDI_ID_MIGRASI_CSHARP_DOTNET_VR.md`](../KEMUDI_ID_MIGRASI_CSHARP_DOTNET_VR.md):
website & API berbasis ASP.NET Core, database EF Core, dan autentikasi Identity.

> Proyek asli Next.js/TypeScript tetap ada di root. Migrasi dilakukan di
> folder `src/` ini agar keduanya bisa berjalan berdampingan.
>
> Dokumentasi lengkap: [`docs/MIGRASI_DOTNET_FULL.md`](../docs/MIGRASI_DOTNET_FULL.md)
> (website) · [`docs/OPTIMASI_SIMULASI.md`](../docs/OPTIMASI_SIMULASI.md) (Unity) ·
> [`docs/VR_INPUT_MAP.md`](../docs/VR_INPUT_MAP.md) (input VR).

## Proyek

| Proyek | Teknologi | Isi |
| --- | --- | --- |
| `Kemudi.Domain` | Class Library | Entities, enums, value objects |
| `Kemudi.Shared` | Class Library | DTO, contracts, constants |
| `Kemudi.Infrastructure` | Class Library | EF Core DbContext, Identity, JWT service, seed data, migrasi |
| `Kemudi.Api` | Web API | Controllers (auth, progress, courses, mentors, registration, payment, vehicles) + Swagger |
| `Kemudi.Web` | Blazor Web App | Landing, kursus, mentor, materi, login/register, dashboard, simulasi launcher |

## Cara menjalankan

```bash
# 1. Build solusi
dotnet build Kemudi.slnx

# 2. Terapkan database (SQLite, otomatis ter-seed data awal)
cd src/Kemudi.Api
dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .

# 3. Jalankan API (http://localhost:5077, Swagger di /swagger)
dotnet run --project src/Kemudi.Api

# 4. Jalankan website (http://localhost:5259)
dotnet run --project src/Kemudi.Web
```

> Konfigurasi `Api:BaseUrl` di `src/Kemudi.Web/appsettings.json` mengarah ke
> `http://localhost:5077`. Untuk production, ganti database ke PostgreSQL/SQL
> Server di `ConnectionStrings:KemudiDb` dan set `Jwt:SecretKey` yang kuat.

## Endpoint API

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | ✅ JWT |
| POST | `/api/progress` | ✅ JWT |
| GET | `/api/progress` | ✅ JWT |
| GET | `/api/courses`, `/api/courses/{slug}` | — |
| GET | `/api/mentors`, `/api/mentors/{slug}` | — |
| GET | `/api/vehicles` | — |
| POST | `/api/course-registration` | opsional |
| GET | `/api/course-registration/{id}` | — |
| POST | `/api/payment` | — |

## Status migrasi

| Phase (dokumen) | Status |
| --- | --- |
| PHASE 1 — Arsitektur | ✅ Struktur `src/` + solusi `Kemudi.slnx` |
| PHASE 2 — Domain + Database | ✅ Entities, enums, migrasi `InitialCreate`, seed data |
| PHASE 3 — ASP.NET Core API | ✅ Controllers + JWT + Swagger + CORS |
| PHASE 4 — Blazor Website | ✅ Halaman utama lengkap (landing, kursus, materi, auth, dashboard) + launcher simulasi (§61) |
| PHASE 5 — Unity Project | 🚧 Scaffold folder + script inti (lihat `simulation/`) |
| PHASE 6–15 | ⏳ Belum dimulai |

## Perubahan selaras dokumen `KEMUDI_ID_MIGRASI_DOTNET_OPTIMASI.md`

- **`SimulationAttempt.ObstacleHits`** (migrasi `RenameCollisionCountToObstacleHits`):
  kolom `CollisionCount` di-rename menjadi `ObstacleHits` agar konsisten dengan
  struktur entity §8 dan JSON hasil simulasi §62 (`obstacleHits`).
- **Launcher `/simulasi`**: halaman memilih kendaraan lalu meluncurkan aplikasi
  Unity; hasil dikirim Unity ke `POST /api/progress` (lihat
  `simulation/.../Core/SimulationResultReporter.cs`).

## Catatan implementasi

- **Skor tidak dipercaya mentah dari klien**: `POST /api/progress` memvalidasi
  skor 0–100 (§8) dan semua field ≥ 0.
- **Data seed** (`Kemudi.Infrastructure/Data/SeedData.cs`) memindahkan data
  `lib/vehicles.ts` dan `lib/kursus-data.ts` ke database (3 kendaraan,
  3 kursus, 7 paket, 4 mentor).
- **Auth cookie di Blazor**: token JWT disimpan di cookie `kemudi_token`
  (httpOnly) oleh `AuthService`; `ApiClient` menyisipkannya ke header secara
  otomatis.
