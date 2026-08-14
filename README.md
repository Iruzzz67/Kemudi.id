# 🚗 Kemudi.id - Simulasi Mengemudi Motor, Mobil, dan Truk

> **Struktur repo:** aplikasi web Next.js asli berada di root (`app/`, `components/`, `lib/`),
> sedangkan hasil **migrasi C#/.NET + Unity** ada di [`src/`](./src/README.md) dan
> [`simulation/`](./simulation/Kemudi.Simulation/README.md).
>
> **Dokumentasi:** [DOKUMENTASI_WEBSITE_SIMULASI.md](./DOKUMENTASI_WEBSITE_SIMULASI.md) ·
> [CAKUPAN_PROJECT.md](./CAKUPAN_PROJECT.md) ·
> [RINGKASAN_VR_SIMULASI.md](./RINGKASAN_VR_SIMULASI.md) ·
> [KEMUDI_ID_MIGRASI_CSHARP_DOTNET_VR.md](./KEMUDI_ID_MIGRASI_CSHARP_DOTNET_VR.md)

---

## Deskripsi
Kemudi.id adalah game simulasi mengemudi realistis yang memungkinkan pemain belajar dan berlatih mengendarai **sepeda motor, mobil, dan truk** pada lingkungan yang menyerupai jalan raya di dunia nyata. Setiap kendaraan memiliki karakteristik berkendara yang berbeda sehingga memberikan pengalaman simulasi yang lebih realistis.

---

## Tujuan Game

- Melatih kemampuan berkendara secara aman.
- Mengenalkan peraturan lalu lintas.
- Memberikan pengalaman berkendara yang realistis.
- Menjadi media pembelajaran sebelum praktik di jalan sebenarnya.

---

## Mode Kendaraan

### 🏍️ Motor
- 1 varian: Motor Bebek (varian lain dihapus)

#### Fitur
- Manual & Automatic
- Lampu
- Klakson
- Sein
- Spion
- Speedometer
- Indikator bensin

---

### 🚗 Mobil

#### Jenis
- 1 varian: Sedan (varian lain dihapus)

#### Fitur
- Manual
- Automatic
- Lampu
- Wiper
- Sein
- Hazard
- Klakson
- AC
- Dashboard Digital

---

### 🚛 Truk

#### Jenis
- 1 varian: Truk Box (varian lain dihapus)

#### Fitur
- Manual Transmission
- Air Brake
- Lampu
- Sein
- Klakson
- Dashboard Truk
- Kamera Belakang

---

## Lingkungan Jalan

### Jalan Perkotaan

- Persimpangan
- Lampu Merah
- Zebra Cross
- Bundaran
- Flyover
- Underpass
- Jalan Satu Arah
- Jalan Dua Arah
- Gang Perumahan

---

### Jalan Raya

- Jalan Nasional
- Jalan Provinsi
- Jalan Tol
- Rest Area
- SPBU
- Terminal
- Halte
- Jembatan

---

### Pedesaan

- Jalan Sempit
- Sawah
- Perkebunan
- Sungai
- Jembatan Kayu
- Tikungan Tajam

---

### Pegunungan

- Tanjakan
- Turunan
- Tikungan Hairpin
- Jurang
- Kabut

---

## Rambu Lalu Lintas

### Rambu Larangan

- Dilarang Parkir
- Dilarang Berhenti
- Dilarang Putar Balik
- Dilarang Masuk
- Batas Kecepatan

---

### Rambu Peringatan

- Tikungan Tajam
- Jalan Licin
- Jalan Menurun
- Jalan Menanjak
- Penyempitan Jalan
- Penyeberangan Pejalan Kaki

---

### Rambu Petunjuk

- Rumah Sakit
- SPBU
- Rest Area
- Terminal
- Kota Tujuan
- Area Parkir

---

## Aturan Lalu Lintas

- Menggunakan sein saat berbelok.
- Berhenti saat lampu merah.
- Memberi jalan kepada pejalan kaki.
- Tidak melawan arus.
- Mematuhi batas kecepatan.
- Menjaga jarak aman.
- Menggunakan lampu malam.
- Tidak melewati marka utuh.

---

## AI Kendaraan

Jenis kendaraan yang muncul di jalan:

- Mobil
- Motor
- Truk
- Bus
- Ambulans
- Polisi
- Pemadam Kebakaran

#### Perilaku AI:

- Berhenti di lampu merah.
- Menggunakan sein.
- Menyalip.
- Berbelok.
- Parkir.
- Memberi jalan.

---

## AI Pejalan Kaki

- Menyeberang di Zebra Cross.
- Berjalan di trotoar.
- Menunggu lampu hijau.
- Membawa barang.
- Berlari ketika hujan.

---

## Cuaca

- Cerah
- Berawan
- Hujan Ringan
- Hujan Deras
- Kabut
- Malam Hari
- Matahari Terbenam

---

## Sistem Kendaraan

### Mesin

- Starter
- RPM
- Suhu Mesin
- Oli
- Bahan Bakar

---

### Kendali

- Gas
- Rem
- Kopling
- Persneling
- Handbrake
- Steering

---

## Kamera

- First Person
- Third Person
- Dashboard View
- Free Camera
- Drone Camera

---

## Sistem Pelanggaran

Poin pelanggaran akan bertambah apabila:

- Melanggar lampu merah.
- Menabrak kendaraan.
- Menabrak pejalan kaki.
- Tidak memakai sein.
- Melebihi batas kecepatan.
- Melawan arus.
- Parkir sembarangan.

---

## Misi

- Belajar dasar mengemudi.
- Parkir Paralel.
- Parkir Mundur.
- Putar Balik.
- Menyalip Kendaraan.
- Berkendara di Jalan Tol.
- Berkendara Saat Hujan.
- Mengantar Barang (Truk).
- Ujian SIM.

---

## Sistem Penilaian

| Kriteria | Nilai |
|----------|------:|
| Keselamatan | 40 |
| Kepatuhan Rambu | 25 |
| Kehalusan Berkendara | 20 |
| Ketepatan Waktu | 15 |

Nilai maksimal: **100**

---

## Fitur Tambahan

- Dashboard interaktif.
- GPS Navigation.
- Mini Map.
- Voice Navigation.
- Sistem Kerusakan Kendaraan.
- Sistem Bahan Bakar.
- Pengisian BBM di SPBU.
- Save Progress.
- Achievement.
- Statistik Berkendara.

---

## Kontrol

### Keyboard

| Tombol | Fungsi |
|---------|--------|
| W | Gas |
| S | Rem |
| A | Belok Kiri |
| D | Belok Kanan |
| Shift | Kopling |
| Q | Sein Kiri |
| E | Sein Kanan |
| R | Hazard |
| L | Lampu |
| H | Klakson |
| Space | Rem Tangan |
| C | Ganti Kamera |
| M | Map |
| Esc | Pause |

---

## Target Pengguna

- Pemula yang ingin belajar mengemudi.
- Siswa kursus mengemudi.
- Pelajar.
- Mahasiswa.
- Masyarakat umum.
- Pengemudi profesional.

---

## Konsep Realistis

Game dirancang menyerupai kondisi lalu lintas Indonesia dengan:

- Marka jalan sesuai standar.
- Lampu lalu lintas aktif.
- Kendaraan AI realistis.
- Cuaca dinamis.
- Siklus siang dan malam.
- Jalan perkotaan dan pedesaan.
- Sistem fisika kendaraan realistis.
- Suspensi yang responsif.
- Sistem traksi ban.
- Efek hujan terhadap daya cengkeram ban.
- Simulasi kemacetan.
- Kendaraan darurat yang memiliki prioritas jalan.

---

## Roadmap Pengembangan

### Tahap 1
- Sistem kendaraan.
- Jalan raya.
- AI kendaraan.
- Kamera.

### Tahap 2
- Cuaca.
- Pejalan kaki.
- Misi.
- GPS.

### Tahap 3
- Multiplayer.
- Leaderboard.
- Career Mode.
- Mod Support.

---

## Teknologi

- Next.js
- React
- TypeScript
- Three.js
- React Three Fiber
- Rapier Physics
- Tailwind CSS
- Zustand
- Framer Motion

---

## Sistem Admin Terpisah

Kemudi.id memiliki panel admin yang **terpisah secara visual, struktural, dan fungsional** dari sistem pengguna — dengan layout sendiri (sidebar + header, tanpa navbar user), login khusus, dan proteksi berlapis.

### Halaman admin

| Route | Fungsi |
| --- | --- |
| `/admin/login` | Login admin (desain terpisah; user biasa ditolak) |
| `/admin/dashboard` | Ringkasan sistem, grafik 7 hari, aktivitas terbaru |
| `/admin/pendaftaran` | Pendaftaran kursus + konfirmasi/tolak pembayaran |
| `/admin/pengguna` | Manajemen pengguna (role, aktif/nonaktif, detail) |
| `/admin/mentor` | CRUD mentor |
| `/admin/jadwal` | CRUD jadwal kursus |
| `/admin/pembayaran` | Verifikasi pembayaran (PAID/REJECTED) |
| `/admin/kursus` | CRUD paket kursus |
| `/admin/statistik` | Statistik pengguna, kursus, pembayaran, pendaftaran |
| `/admin/pengaturan` | Profil, ganti password, akun admin, audit log |

### Keamanan (berlapis)

1. **`proxy.ts`** (pengganti middleware di Next.js 16) mengarahkan yang belum login ke `/admin/login` dan memblokir yang bukan admin; API `/api/admin/*` non-admin dapat **403**.
2. **`lib/admin.ts` → `requireAdmin()`** — setiap route handler admin dan halaman admin memvalidasi ulang role dari sesi di server (tidak mengandalkan penyembunyian UI).
3. Role selalu berasal dari **database/session**, tidak pernah dari request body.
4. Akun yang dinonaktifkan admin tidak bisa login. Admin tidak bisa menonaktifkan akun sendiri.
5. Aktivitas penting (login, konfirmasi/tolak pembayaran, CRUD mentor/kursus/jadwal, perubahan user) tercatat di **audit log**.
6. Password di-hash bcrypt; halaman pengaturan menyediakan ganti password (memvalidasi password lama).

### Hak akses

- `USER` — hanya akses situs publik; tidak bisa membuka `/admin/*` (di-redirect) atau `/api/admin/*` (403).
- `ADMIN` — akses penuh ke seluruh panel admin.

Cara menjadikan akun admin:

```bash
# 1) Daftar akun seperti biasa, lalu:
npm run set-admin -- <email-akun>
# contoh: npm run set-admin -- admin@kemudi.id
```

Atau daftar akun baru dengan email yang tercantum di variabel `ADMIN_EMAILS` di `.env` (dipisah koma) — akun tersebut otomatis berperan ADMIN.

Seed data awal panel admin (mentor, kursus, jadwal contoh):

```bash
npm run seed-admin
```

Setelah login sebagai admin, link **🛡️ Admin** di navbar membuka `/admin/dashboard`.

---

## HUD VR Mengikuti Kamera FPV

Saat sesi VR aktif, HUD melayang (`components/simulation/xr/XRHud.tsx`) menempel pada kamera FPV lewat `CameraFollower` dan ditampilkan pada jarak baca nyaman (±2,2 m di depan mata, sedikit di bawah garis pandang) sehingga tidak mepet dengan kamera.

---

## Visi

Membangun simulator mengemudi motor, mobil, dan truk yang realistis, edukatif, dan mudah diakses, sehingga pengguna dapat belajar berkendara dengan aman dalam lingkungan virtual yang menyerupai kondisi jalan raya sehari-hari.
