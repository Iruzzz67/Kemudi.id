# Build WebGL Simulasi

Folder ini adalah tempat hasil **build WebGL** dari proyek Unity
(`simulation/Kemudi.Simulation`) disalin agar halaman `/simulasi` bisa
menampilkannya di browser.

## Cara mengisi

1. Buka `simulation/Kemudi.Simulation` di Unity Editor.
2. **File → Build Settings** → pilih platform **WebGL**.
3. **Player Settings** → *Resolution and Presentation* → set **Template** ke
   **Kemudi** (template custom di `Assets/WebGLTemplates/Kemudi` yang membaca
   `?token=` & `?vehicle=` dari launcher).
4. Klik **Build** ke folder sementara mana pun.
5. Salin **seluruh isi hasil build** (minimal `index.html`, folder `Build/`,
   dan `StreamingAssets/` bila ada) ke folder ini, mis.:

   ```
   src/Kemudi.Web/wwwroot/unity/
   ├── index.html
   ├── Build/          (data + framework + loader + wasm)
   └── StreamingAssets/ (opsional)
   ```

6. Jalankan website (`dotnet run --project src/Kemudi.Web`) lalu buka
   **http://localhost:5259/simulasi** → pilih kendaraan → **▶ Mulai Simulasi**.

## Alur hasil latihan

Launcher Blazor membuka `unity/index.html?token=<JWT>&vehicle=<JENIS>`.
Template membaca token dan menyimpannya ke `window.kemudiAuthToken`; di dalam
game, `SimulationResultReporter` membacanya lewat `WebGlBridge` dan mengirim
hasil ke `POST /api/progress` (CORS API sudah `AllowAnyOrigin`).

## Catatan

- Jika folder ini kosong (belum ada `index.html`), halaman `/simulasi` akan
  menampilkan panduan build — aplikasi tetap berjalan normal.
- Build WebGL cukup besar (±50-100 MB); pastikan server/hosting menyajikan
  folder ini sebagai static file (wwwroot sudah otomatis).
