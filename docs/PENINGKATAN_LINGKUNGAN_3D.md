# Pembaruan jalan, kendaraan, dan rumah

Simulasi browser dan Unity memakai aset orisinal bergaya perumahan tropis. Blender MCP belum berhasil terhubung saat pengerjaan; geometri dibuat dari kode lokal dan diekspor sebagai GLB serta resep mesh Unity. Tidak ada aset berbayar atau model pihak ketiga yang ditambahkan.

## Perubahan yang terlihat

- Jalan: permukaan aspal bertekstur, paving trotoar, batu tepi berselang warna, garis tengah putus-putus, dan celah batu tepi pada zebra cross. Browser juga menampilkan kisi drainase. Detail mengikuti lintasan; tidak menambahkan penghalang fisik di lajur.
- Rumah: tiga variasi warna dengan atap genteng limasan, lis atap, teras, tiang, jendela berbingkai, pintu, pagar rendah, tanaman, dan jalur masuk. Ruko memiliki dua lantai serta kanopi. Rumah baru juga ada di area awal supaya lingkungan langsung terlihat saat latihan dimulai.
- Lingkungan: pohon bercabang, lampu jalan berlengan, warna rumput lebih lembut, serta cahaya matahari hangat. Bayangan matahari di browser sekarang mengikuti posisi kendaraan, termasuk sumber cahayanya.
- Kendaraan: bodi mobil dengan lengkungan ruang roda, ban berprofil, bingkai kaca, atap lebih halus, detail motor, serta visor, lampu penanda, dan bumper truk. Pivot roda, kemudi, pintu, dan animasi maju tetap tersedia.
- Lalu lintas: browser memakai model baru untuk mobil, motor, truk, dan polisi, dengan warna per kendaraan dan animasi roda. Bus, van, ambulans, dan pickup masih memakai model prosedural lama. Unity memakai mobil baru untuk lalu lintas serta mobil/truk parkir; bus parkir tetap model lama.

## Menjalankan

```powershell
npm.cmd run dev:next
```

Buka `http://127.0.0.1:3000/simulasi`, pilih kendaraan, lalu mulai latihan. Jika diminta login, tombol **Masuk Cepat sebagai Siswa Demo** tersedia. Muat ulang halaman yang sudah terbuka agar cache model lama diganti. Perintah default `npm run dev` menjalankan bundle statis .NET lama; bundle tersebut belum diekspor ulang.

Unity: buka scene `simulation/Kemudi.Simulation/Assets/Scenes/Main.unity`, lalu Play. `StreetscapeBuilder` memuat layout yang berasal dari konfigurasi browser dan menyesuaikan posisi terhadap lintasan Unity. Template rumah berbagi mesh/material dengan salinannya. Bangunan dan detail tepi jalan bersifat dekoratif.

## Aset dan reproduksi

- Kendaraan: `public/models/kemudi/{mobil,motor,truk}.glb`.
- Lingkungan: `public/models/kemudi/environment/` — tiga rumah, satu ruko, pohon, lampu jalan, dan manifest SHA-256.
- Data Unity: `simulation/Kemudi.Simulation/Assets/Resources/KemudiEnvironment/`, termasuk `layout.json` dengan 64 penempatan.
- Untuk Blender: gunakan **File → Import → glTF 2.0**, lalu pilih GLB. Bangunan berukuran meter dengan fasad lokal +Z; kendaraan menghadap -Z. Animasi ada pada GLB kendaraan.

```powershell
node tools/vehicles/build-vehicles.mjs
node tools/vehicles/build-environment.mjs
node tools/vehicles/verify-assets.mjs
node tools/vehicles/verify-environment.mjs
```

| Model | Segitiga | Ukuran GLB kira-kira |
| --- | ---: | ---: |
| Mobil | 16.716 | 1.18 MiB |
| Motor | 7.196 | 525 KiB |
| Truk | 21.158 | 1.50 MiB |
| Rumah, per variasi | 1.638 | 122 KiB |
| Ruko | 696 | 54 KiB |
| Pohon | 480 | 36 KiB |
| Lampu jalan | 100 | 10 KiB |

Rumah digabung menjadi sembilan kelompok material, dan detail tepi/marka browser menjadi empat mesh. Texture aspal dan paving dibuat deterministik secara lokal, masing-masing 128 × 128 piksel. Kamera browser membatasi jarak gambar ke 430 meter.

## Hasil pemeriksaan dan batasnya

Validasi aset memeriksa hash, batas ukuran/segitiga, posisi dasar model, koordinat finite, kesetaraan resep Unity, serta animasi kendaraan. TypeScript, lint pada komponen baru/lingkungan, dan kompilasi sumber C# terhadap Unity 6000.5.8f1 berhasil. Kompilasi C# masih mengeluarkan peringatan nullable/deprecation; editor Unity dan build headset belum dijalankan.

Pengujian Chrome memeriksa ketiga pratinjau kendaraan, layout responsif, masuk kabin, kontak mesin, persiapan, dan akselerasi tanpa exception runtime. Screenshot tersedia di `.artifacts/environment/`. Pengujian otomatis menunggu frame browser agar input tetap dapat diproses pada renderer software yang lambat. Belum ada pengukuran FPS pada headset fisik; anggaran geometri bukan jaminan frame rate.
