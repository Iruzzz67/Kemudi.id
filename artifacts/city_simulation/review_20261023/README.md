# City simulation — revisi 23 Oktober 2026

Buka `city_simulation_final.blend`. Tekan Numpad 0 untuk tampilan kamera, lalu Space untuk playback. Timeline 1–240 pada 24 FPS berlangsung 10 detik. Kamera berpindah otomatis pada frame 1, 49, 121, 169, dan 217.

## Isi

- Mobil sport merah metalik dengan interior sederhana dan empat roda.
- Motor sport biru dengan dua roda, jok, setang, lampu, dan knalpot.
- Truk box putih dengan empat roda, kaca, spion, lampu, dan bumper.
- Tiga rumah modern, rumah utama, carport, jalan utama dan percabangan, trotoar, marka, pagar, taman, 15 pohon, dan enam lampu jalan.
- Sembilan collection wajib serta lima kamera presentasi.

## Riwayat pengerjaan

Scene lengkap dan checkpoint pembangunan sudah ditemukan saat audit awal. Scene tersebut dipertahankan dan diperiksa langsung di aplikasi Blender yang aktif melalui server add-on Blender MCP pada localhost:9876. Folder ini menyimpan revisi terpisah; sumber pada folder induk tidak ditimpa.

`preserved_original.blend` merupakan salinan keadaan awal. Checkpoint v01–v06 di folder ini merekam tahap audit dan penyempurnaan scene lengkap yang sudah ada, bukan pembangunan ulang dari scene kosong. Checkpoint pembangunan awal tersedia pada folder induk.

1. v01: audit awal, collection wajib, dan cadangan scene.
2. v02: verifikasi skala meter, ground, jalan, trotoar, dan marka.
3. v03_vehicles: verifikasi seluruh nama komponen dan hierarchy kendaraan.
4. v04_environment: verifikasi rumah, carport, pagar, taman, pohon, dan lampu jalan.
5. v05_lookdev: clearcoat cat kendaraan, microtexture aspal/beton/ban/dinding, lighting, kontras AgX, ray tracing EEVEE, dan margin kamera truk yang lebih lebar.
6. v06_animation: verifikasi pergerakan, sepuluh driver roda, durasi, dan penamaan penanda shot.
7. final: lulus QA seluruh 240 frame dan disiapkan untuk playback/render.

## Urutan animasi

| Waktu | Frame | Adegan |
|---|---|---|
| 0–2 detik | 1–48 | Overview lingkungan |
| 2–5 detik | 49–120 | Mobil bergerak 26 meter |
| 5–7 detik | 121–168 | Motor bergerak 24 meter |
| 7–9 detik | 169–216 | Truk bergerak 11 meter pada jalur berlawanan |
| 9–10 detik | 217–240 | Shot lebar seluruh kendaraan dan rumah |

## Verifikasi

`qa_report.json` merekam pemeriksaan ulang menggunakan bounding box mesh yang telah dievaluasi pada seluruh 240 frame: tidak ditemukan tumpang tindih kendaraan, benturan terhadap rumah/props, pelanggaran batas jalan, ataupun kendaraan terpotong pada shot fokus. Sudut lebar diperiksa pada kedua ujung shot. Seluruh material dan parent kendaraan tersedia. Selisih sinkronisasi rotasi roda maksimum sekitar 0,00000372 radian. Ban berada 1 cm di atas permukaan dasar aspal.

Scene memiliki 917 objek dan 14.273 face mesh dasar; modifier bevel tetap dapat diedit. Objek awal tersimpan pada `Archive_Original`; swatch material tersembunyi pada `Materials`. Tidak memerlukan tekstur unduhan.

Lima PNG preview memperlihatkan overview, mobil, motor, truk, dan finale. Final disetel untuk render EEVEE 1600 × 900 ke sequence PNG pada `frames/city_`. Animasi tersedia dalam file Blender; video MP4 belum dirender. Animasi bersifat kinematik dengan roda mengikuti jarak/radius; scene ini tidak menggunakan solver rigid-body atau AI lalu lintas.

Script tahap dan file `.receipt.json` disimpan untuk jejak eksekusi MCP. Script tersebut sudah dijalankan; file Blender dapat langsung digunakan tanpa menjalankannya kembali.
