# Kemudi.id — .NET/C# (bukan Next.js)

Aplikasi web ini berjalan di **ASP.NET Core + Blazor + EF Core + Identity**.
Next.js/TypeScript sudah dihapus dari repo — jangan menulis kode React/TSX/Prisma,
dan jangan pakai `npm run dev`.

## Menjalankan

```bash
dotnet build Kemudi.slnx
dotnet run --project src/Kemudi.Api   # API → http://localhost:5077 (Swagger /swagger)
dotnet run --project src/Kemudi.Web   # Website → http://localhost:5259
```

## Struktur

| Proyek | Isi |
| --- | --- |
| `src/Kemudi.Domain` | Entities, enums |
| `src/Kemudi.Shared` | DTO |
| `src/Kemudi.Infrastructure` | EF Core DbContext, Identity, JWT, migrasi, seed |
| `src/Kemudi.Api` | ASP.NET Core Web API + controller admin `/api/admin/*` |
| `src/Kemudi.Web` | Blazor Web App (halaman publik + panel admin `/admin/*`) |
| `simulation/` | Proyek Unity (diluncurkan dari `/simulasi`) |
| `tools/MigratePrismaData` | Tool migrasi data dari database lama |

## Konvensi

- UI pakai CSS global `src/Kemudi.Web/wwwroot/app.css` (kelas `btn`, `card`, `field`, `table`, dll).
- Halaman Blazor di `src/Kemudi.Web/Components/Pages/*.razor`; panel admin di bawah `/admin/*`
  memakai `AdminLayout` dan divalidasi `[Authorize(Roles = "Admin")]` di sisi API.
- API memakai JWT; Web menyimpan token di cookie `kemudi_token` (`ApiClient`/`AuthService`).
- Perubahan schema → buat migrasi EF:
  `cd src/Kemudi.Api && dotnet ef migrations add <Nama> --project ../Kemudi.Infrastructure --startup-project .`
- Dokumentasi lengkap: `src/README.md` · `docs/MIGRASI_DOTNET_FULL.md`.
