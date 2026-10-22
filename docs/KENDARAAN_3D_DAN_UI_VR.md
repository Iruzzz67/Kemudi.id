# Kendaraan 3D dan pembaruan UI simulasi

Tiga model orisinal bergaya low-poly tersedia untuk simulasi browser dan Unity: motor Urban 125, mobil City Hatchback dengan setir kanan, dan truk Cargo 6×2 dengan setir kanan. Model dibuat secara prosedural dari kode lokal, tanpa model unduhan atau layanan generasi berbayar. MCP Blender belum terhubung ketika implementasi ini dibuat.

## Menjalankan versi browser

```powershell
npm.cmd run dev:next
```

Buka `http://localhost:3000/simulasi`. Gunakan login/demo yang sudah tersedia pada aplikasi. Halaman garasi menampilkan pratinjau 3D, pilihan kendaraan/transmisi, kontrol animasi, pengaturan kendali, dan panduan keyboard. Animasi pratinjau hanya bergerak setelah tombol **Lihat animasi** ditekan; bisa dijeda dan berhenti ketika tab disembunyikan.

Setelah **Mulai latihan**, berjalan mendekati pintu pengemudi dan pilih **Masuk Kendaraan**. Ikuti checklist dan tekan **I** untuk mengubah kontak OFF → ACC → ON → START. Roda mengikuti kecepatan bertanda (maju/mundur), roda depan mengikuti kemudi, dan suspensi menggerakkan bodi secara terpisah. Posisi mata pengemudi mengikuti kabin model baru.

Tombol **Masuk VR** tersedia setelah latihan dimulai. Browser harus mendukung `immersive-vr`, berada di HTTPS/localhost, dan memiliki headset aktif. Kegagalan izin/sesi ditampilkan pada layar; latihan desktop tetap bisa digunakan.

`npm run dev` di repository ini menjalankan aplikasi .NET dengan frontend statis yang sudah ada di `src/Kemudi.App/wwwroot`. Untuk melihat perubahan sumber React ini, gunakan `dev:next`. Bundle .NET yang lama perlu diekspor ulang melalui proses distribusi frontend proyek sebelum dipakai untuk deployment; file hasil distribusi lama tidak ditimpa oleh pekerjaan ini.

## Unity

Buka `simulation/Kemudi.Simulation/Assets/Scenes/Main.unity`, lalu Play. Bootstrap sekarang memuat geometri dari `Assets/Resources/KemudiVehicles/*.json` melalui `AuthoredVehicleVisual`, menggantikan kendaraan kotak placeholder. Data ini berasal dari generator yang sama dengan GLB browser. Importer glTF tambahan tidak diperlukan.

Loader mengubah koordinat dari Y-up / depan -Z ke konvensi Unity depan +Z, termasuk arah normal, winding segitiga, dan quaternion. Komponen visual memutar roda dari kecepatan Rigidbody, membelokkan roda depan/setir, serta menambahkan respons bodi terhadap akselerasi. Material `VehicleBase.mat` mempertahankan referensi shader URP untuk build. Menu desktop dan panel VR diperbarui: kontras lebih jelas, pilihan aktif terlihat, posisi tombol sejajar, dan petunjuk kontrol ringkas.

Pada menu VR: stik kiri memilih kendaraan, tombol A mengganti transmisi, trigger kanan memulai. Input berkendara tetap memakai sistem input proyek yang sudah ada. Offset kursi sesuai model dan offset awal kepala dikurangi dari XR origin agar kamera tidak berada di atas atap. Uji OpenXR, mapping controller berkendara, kenyamanan, serta performa pada headset nyata tetap diperlukan. Kompilasi diverifikasi terhadap Unity **6000.5.8f1** yang tersedia; `ProjectVersion.txt` proyek masih menyebut 2022.3 dan belum dimigrasikan otomatis.

## Aset dan animasi

| Aset browser | Segitiga | Ukuran kira-kira | Roda |
| --- | ---: | ---: | ---: |
| `public/models/kemudi/motor.glb` | 7.196 | 525 KiB | 2 |
| `public/models/kemudi/mobil.glb` | 16.716 | 1.18 MiB | 4 |
| `public/models/kemudi/truk.glb` | 21.158 | 1.50 MiB | 6 |

Detail pembaruan bodi, rumah, dan jalan ada di [Peningkatan lingkungan 3D](PENINGKATAN_LINGKUNGAN_3D.md).

Semua model memakai material tanpa tekstur eksternal. Pivot `Wheel_*` memiliki radius dalam metadata; `Steer_*` membelokkan roda depan, `BodyMotion` memisahkan suspensi, `SteeringWheel` menggerakkan setir, dan `Door_R` menjadi engsel pintu pengemudi. Tidak ada auto-fit yang mengubah proporsi model saat runtime.

Setiap GLB menyertakan dua klip: **Wheel_Roll** (1 detik) dan **Drive_Forward** (4 detik, maju 8 meter dengan putaran roda sesuai radius). Klip maju berjalan dari titik awal ke titik akhir; pemutaran berulang akan kembali ke titik awal. Simulasi memakai gerak fisika dan animasi runtime, sehingga tidak memutar klip translasi di atas gerak fisika. `manifest.json` mencatat hash SHA-256, batas model, jumlah mesh, dan asal aset. Geometri orisinal ini mengikuti ketentuan kepemilikan/lisensi proyek; tidak diberi lisensi publik tambahan.

## Blender

Model dapat langsung dibuka lewat **File → Import → glTF 2.0**. Pilih GLB di atas; pivot dan klip animasi ikut diimpor. Untuk MCP, aktifkan **MCP for Blender** di **Edit → Preferences → Add-ons**, lalu buka sidebar viewport dengan **N → MCP for Blender → Start MCP Server**. Panduan resmi: <https://www.mcp-for-blender.com/docs/installation>.

## Reproduksi dan pemeriksaan

```powershell
node tools/vehicles/build-vehicles.mjs
node tools/vehicles/verify-assets.mjs
node node_modules/typescript/bin/tsc --noEmit
powershell -NoProfile -ExecutionPolicy Bypass -File tools/vehicles/verify-unity.ps1
```

Generator menulis ulang tiga GLB, manifest, dan tiga JSON Unity; tidak mengubah aset kendaraan lama. Validasi memeriksa struktur GLB, hash, geometri finite, batas 25.000 segitiga / 2 MiB per aset, jumlah roda/pivot, kesetaraan data Unity, serta jarak maju dan sudut putaran roda dalam klip.

`tools/vehicles/check-browser.mjs` memakai Chrome headless dengan debugging lokal port 9222 dan server Next port 3000. Pemeriksaan memakai profil browser pengujian terpisah dan akun demo lokal, tanpa mengubah akun backend. Hasil tangkapan desktop, ponsel, kendaraan, dan simulasi tersedia di `.artifacts/vehicles/`. Lint/TypeScript dan kompilasi C# tidak menggantikan pengujian GPU Unity atau headset fisik.
