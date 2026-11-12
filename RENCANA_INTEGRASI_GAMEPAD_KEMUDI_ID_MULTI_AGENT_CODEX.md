# RENCANA IMPLEMENTASI GAMEPAD — KEMUDI.ID (THREE.JS / WEBGL)

> **Dokumen eksekusi Codex multi-agent — versi 1.0, 4 November 2026**  
> **Status:** RENCANA / KONTRAK IMPLEMENTASI; **bukan bukti fitur sudah terpasang**.  
> **Target:** simulator browser yang dipakai halaman `/simulasi` dan `/simulasi/play`, **bukan Unity**.  
> **Perangkat MVP:** gamepad dengan layout `standard` (Xbox, PlayStation yang dipetakan standar oleh browser, dan gamepad generik yang kompatibel).  
> **Sumber proyek:** `DOKUMENTASI_WEBSITE_DAN_SIMULASI.md` dan `RENCANA_REALISME_SIMULASI_KEMUDI_ID_MULTI_AGENT_CODEX.md`.  
> **Sumber platform eksternal:** dokumentasi MDN Gamepad API dan Permissions Policy (tautan di akhir dokumen).

---

## 0. INSTRUKSI PERTAMA UNTUK CODEX LEAD AGENT

Baca **SELURUH** dokumen ini sebelum mengedit source. Audit repositori dan ambil keputusan berdasarkan implementasi nyata, **jangan** berasumsi bahwa nama fungsi di contoh rancangan ini sudah ada. Kerjakan melalui beberapa sub-agent hanya setelah kontrak dan ownership file disepakati.

**Misi:** Tambahkan dukungan gamepad penuh untuk mengoperasikan **MOTOR, MOBIL, TRUK**, pada **transmisi otomatis dan manual** (sesuai fitur yang benar-benar tersedia di runtime), tanpa mengorbankan keyboard, rem tangan, interaksi, kamera, aturan lalu lintas, sistem hasil, atau kestabilan `iframe`.

**Output yang wajib nyata:**

1. Perangkat dikenali melalui browser dan informasi status tampil di simulator.
2. Steering analog, gas analog, rem analog, fungsi penting tombol, serta fungsi kendaraan khusus dapat dipakai.
3. Profil mapping dan kalibrasi dapat diatur; tombol/aksi tidak saling bentrok.
4. Saat disconnect/focus hilang, kendaraan tidak menerima input throttle yang tertinggal dan sesi masuk kondisi aman.
5. Controller bekerja pada simulator WebGL mandiri dan pada simulasi di dalam website.
6. Automated tests unit/integration menggunakan **input gamepad sintetis**, ditambah skenario pengujian perangkat fisik.
7. Build, tes, bukti integrasi, dan dokumentasi diperbarui. Fitur yang tidak bisa diverifikasi diberi status **belum teruji**, bukan dianggap selesai.

> **Jangan menyentuh `simulation/Kemudi.Simulation/`** untuk tugas ini. Gamepad API berbasis browser adalah jalur implementasi, bukan `Unity Input System`.

---

## 1. KONTEKS REPOSITORI DAN BATAS KEPERCAYAAN

### 1.1 Fakta dari dokumentasi yang tersedia

| Area | Kondisi terdokumentasi | Implikasi implementasi |
| --- | --- | --- |
| Website | ASP.NET Core/.NET 8, Blazor Web App | Simulator disematkan lewat halaman `Simulasi.razor`. |
| Simulator aktif | Three.js/WebGL + aset GLB lokal di `src/Kemudi.Web/wwwroot/simulation-3d/` | Modul gamepad dipasang di runtime JavaScript browser ini. |
| Komponen utama | `main.js`, `controls.js`, `vehicle.js`, `hud.js`, `screens.js`, `audio.js`, `results.js` | Reuse loop, state, update kendaraan, HUD, dan sesi yang ada. |
| Pilihan sesi | `vehicle=MOTOR|MOBIL|TRUK`, `transmission=manual|...`, `map=unified`, `autostart=1` | Input gamepad mengikuti kendaraan/transmisi aktif, tidak mengubah URL dan map. |
| Interaksi kendaraan | Dekati kendaraan, `Enter` masuk; `I` mesin; `Space` rem tangan | Aksi setara harus dapat diakses dari gamepad. |
| Kontrol mengemudi | `W/S` gas/rem, `A/D` setir; `R` untuk maju/mundur otomatis **saat berhenti** | Gamepad mengeksekusi *aksi domain* yang sama, bukan menyimulasikan `KeyboardEvent`. |
| Transmisi manual | Tahan `Shift` untuk kopling, `Q/E` untuk turun/naik gigi | Kopling + perpindahan gigi perlu layout gamepad yang dapat dipakai. |
| Lainnya | `C` kamera; `P`/`Esc` pause; `B` sabuk mobil/truk; `H/J/G/F` perlengkapan motor | Tambahkan menu *aksi kontekstual* agar seluruh aksi dapat dijangkau. |
| Hasil | `results.js` mengirim hasil akhir ke gateway `/api/simulation/results` | Jangan mengubah pencatatan/progres/score saat menambah input. |
| Build & tes | `tools/webgl/build.cjs` serta `tools/webgl` test suite | Source of truth adalah `wwwroot/simulation-3d/`, bukan `Builds/WebGL/`. |
| Implementasi terpisah | Proyek Unity bukan runtime `/simulasi` | C# dan XR Unity di luar cakupan. |

### 1.2 Yang **belum** terbukti dari dokumen

Dokumentasi **tidak** menjelaskan signature eksport `controls.js`, struktur state input internal, urutan update setiap frame, cara `vehicle.js` menerima throttle/brake/steering, implementasi UI event, elemen `iframe` lengkap, cara pause saat background, maupun dukungan gamepad yang sudah ada/belum ada. Semua ini adalah **target audit source**, bukan fakta yang boleh diciptakan.

Jika fungsi yang direkomendasikan di sini tidak cocok dengan kode aktual, buat **adapter minimal** ke API existing. Hindari refactor masif jika tidak diperlukan.

### 1.3 Tujuan dan non-tujuan

**Dalam cakupan:** satu gamepad aktif untuk satu pemain, pengendalian 3 tipe kendaraan, analog input, mapping, kontekstual menu peralatan, settings, keyboard fallback, disconnect/pause, same-origin iframe, automated tests, manual QA.

**Di luar MVP:** setir/pedal racing wheel, dua pemain lokal, force feedback wajib, fitur vibration sebagai inti, gamepad untuk kendaraan AI, proyek Unity, native mobile controller drivers, VR/WebXR remapping menyeluruh. Arsitektur dapat disiapkan agar XR/input lain mudah ditambahkan kemudian.

---

## 2. PRINSIP ARSITEKTUR YANG WAJIB

1. **Satu jalur input domain:** keyboard dan gamepad menghasilkan *aksi kendaraan* yang sama. Jangan membuat dua sistem fisika, transmisi, scoring, atau vehicle movement.
2. **Raw device terpisah dari domain:** `navigator.getGamepads()` hanya dibaca di adapter gamepad; `vehicle.js` tidak mengetahui tombol A/B/RT atau browser API.
3. **Satu otoritas input setiap frame:** tentukan perangkat aktif menggunakan aturan arbitration; jangan menjumlahkan steering keyboard+gamepad atau menggunakan `Math.max()` untuk gas dari dua sumber tanpa keputusan eksplisit.
4. **Edge-trigger untuk toggle:** mesin, lampu, kamera, rem tangan, gigi, hazard, pause, dan menu dipicu satu kali pada perubahan tombol **lepas → tekan**; tidak diulang terus per frame.
5. **Level-trigger untuk aksi kontinu:** gas, rem, setir, kopling, dan klakson membaca besaran selama tombol/axis aktif.
6. **Context-aware:** input diproses sesuai `MENU`, `ON_FOOT`, `DRIVING`, `PAUSED`, `RESULT`. Tombol yang sama boleh berbeda fungsi hanya bila konteks UI jelas.
7. **State aman:** input menjadi netral ketika perangkat dicabut, halaman kehilangan fokus, input diblokir overlay, atau data perangkat tidak valid. Tidak boleh ada throttle *stuck*.
8. **Feature flag + rollback:** gamepad dapat dimatikan melalui setting / flag; keyboard masih berfungsi meskipun gamepad error.
9. **Tidak membuat key event palsu:** jangan gunakan `dispatchEvent(new KeyboardEvent(...))` untuk menjalankan input gamepad. Serahkan *action intent* ke kontrol domain existing.
10. **Jangan memblokir AI:** input gamepad berlaku **hanya pada kendaraan pemain**; logic kendaraan AI tidak terpengaruh.

### 2.1 Diagram arsitektur

```text
       keyboard events                       browser Gamepad API
              |                                      |
     existing controls.js                     gamepad-adapter.js
              |                                      |
       keyboard snapshot                       raw Gamepad snapshot
              |                                      |
              +-----------> input-manager.js <-------+
                                |
                         action snapshot
                                |
                session + context action router
                                |
              +-----------------+------------------+
              |                 |                  |
      vehicle.js /       screens.js /         hud.js / audio.js
      existing motion     session actions     status prompts
              |
       world / collision / AI (tidak diubah oleh input provider)
              |
     scoring + results.js (kontrak tetap)
```

### 2.2 Antarmuka konseptual (harus diadaptasi saat audit)

```ts
// TypeScript semu untuk menyamakan kontrak; runtime boleh tetap JavaScript.
// Semua besaran dinormalisasi dan tidak dibaca langsung dari device oleh vehicle.js.

type VehicleInput = {
  steer: number;      // [-1, +1] kiri negatif, kanan positif
  throttle: number;   // [0, 1]
  brake: number;      // [0, 1]
  clutch: number;     // [0, 1], 1 = kopling diinjak/ditahan
  horn: boolean;      // ditahan
};

type ActionEdges = {
  interact: boolean;
  engineToggle: boolean;
  cameraNext: boolean;
  pauseToggle: boolean;
  parkingBrakeToggle: boolean;
  headlightToggle: boolean;
  turnLeftToggle: boolean;
  turnRightToggle: boolean;
  hazardToggle: boolean;
  gearUp: boolean;
  gearDown: boolean;
  selectDrive: boolean;
  selectReverse: boolean;
  contextualMenuToggle: boolean;
  menuConfirm: boolean;
  menuBack: boolean;
  // menuDirection dapat diwakili satu enum (UP/DOWN/LEFT/RIGHT/NONE).
};

type InputFrame = {
  continuous: VehicleInput;
  edges: ActionEdges;
  activeSource: 'keyboard' | 'gamepad' | 'none';
  controllerStatus: 'unsupported' | 'disconnected' | 'connected' | 'active' | 'error';
  context: 'MENU' | 'ON_FOOT' | 'DRIVING' | 'PAUSED' | 'RESULT';
  dt: number;
};

interface InputProvider {
  poll(dt: number): InputFrame | ProviderFrame;
  reset(reason?: string): void;
  dispose(): void;
}
```

*Catatan:* `ActionEdges` adalah contoh kontrak. Lead memetakan ke nama fungsi eksisting. `dt` harus finite, clamp sesuai aturan loop runtime; jangan menambahkan loop render kedua.

### 2.3 Pipeline frame yang disarankan

```text
requestAnimationFrame / loop utama yang SUDAH ada
  1. cek visibility/focus & session context
  2. poll keyboard snapshot dan gamepad snapshot
  3. normalisasi axes/buttons + edge detector per device
  4. pilih source input aktif secara deterministik
  5. router aksi UI/mesin/rem tangan/transmisi (validasi guard)
  6. jika DRIVING dan tidak pause: apply continuous vehicle input
  7. simulasikan satu tick kendaraan/AI/collision sesuai loop existing
  8. update HUD + status gamepad + help overlay
  9. render (satu renderer loop)
```

**Penting:** action toggle jangan dieksekusi dua kali saat gamepad dan keyboard menekan bersamaan. Reset edge state setelah context berganti atau pause agar tombol yang masih ditahan tidak mengaktifkan aksi tak sengaja ketika gameplay kembali.

---

## 3. GAMEPAD API DAN DUKUNGAN PLATFORM

### 3.1 Implementasi browser

- Periksa `typeof navigator.getGamepads === 'function'`. Jika tidak ada, tampilkan `Gamepad tidak didukung`, jangan crash.
- Baca `navigator.getGamepads()` **sekali per frame** (atau sekali per fixed update yang relevan) saat simulasi aktif. Array dapat berisi `null`.
- `gamepadconnected` / `gamepaddisconnected` digunakan untuk status dan discovery; **polling tetap sumber data tombol/axes**. Jangan menyimpan objek `Gamepad` lama sebagai snapshot permanen.
- Pada sebagian browser, perangkat baru terlihat setelah pengguna menekan sebuah tombol/gerakkan analog sambil halaman aktif; UI harus memberi petunjuk `Tekan tombol pada gamepad`.
- Gunakan `gamepad.mapping === 'standard'` sebagai profil default yang diketahui. Bila kosong/nonstandard, jangan percaya indeks standar; masuk ke layar kalibrasi dan mapping custom, atau status `perangkat belum didukung` yang jelas.
- Perlakukan `buttons[i]?.value`, `buttons[i]?.pressed`, dan `axes[i]` sebagai nilai tak tepercaya: cek array, `Number.isFinite`, dan clamp.
- Polling dan listeners dibersihkan saat lifecycle berakhir; jangan membuat `requestAnimationFrame` baru yang terpisah dari loop utama.

### 3.2 Gamepad standard mapping yang menjadi dasar

| Indeks | Kontrol standar | Kegunaan default Kemudi.id |
| --- | --- | --- |
| `axes[0]` | Left stick horizontal | Steering `[-1, 1]` |
| `axes[1]` | Left stick vertical | Tidak digunakan untuk gas; hindari input ganda |
| `axes[2]` | Right stick horizontal | Kamera melihat kiri/kanan (opsional, jika implementasi kamera mendukung) |
| `axes[3]` | Right stick vertical | Kamera melihat atas/bawah (opsional) |
| `buttons[0]` | A / Cross | Interaksi / konfirmasi dalam menu |
| `buttons[1]` | B / Circle | Klakson tahan; kembali dari menu |
| `buttons[2]` | X / Square | Toggle mesin (dengan guard) |
| `buttons[3]` | Y / Triangle | Ganti kamera |
| `buttons[4]` | LB / L1 | Sein kiri |
| `buttons[5]` | RB / R1 | Sein kanan |
| `buttons[6]` | LT / L2 | Rem analog |
| `buttons[7]` | RT / R2 | Gas analog |
| `buttons[8]` | View / Share | Menu aksi kontekstual / bantuan |
| `buttons[9]` | Menu / Options | Pause / resume |
| `buttons[10]` | Left-stick click (L3) | Kopling untuk manual (tahan) |
| `buttons[11]` | Right-stick click (R3) | Hazard toggle |
| `buttons[12]` | D-pad atas | Lampu utama toggle |
| `buttons[13]` | D-pad bawah | Rem tangan toggle |
| `buttons[14]` | D-pad kiri | Manual: turun gigi; otomatis: pilih mundur |
| `buttons[15]` | D-pad kanan | Manual: naik gigi; otomatis: pilih maju |

**Ini adalah mapping usulan Kemudi.id**, bukan aturan baku semua gamepad. Konfirmasi indeks saat real-device QA. Prioritas pertama adalah tombol esensial; lampu jauh, klakson AI, atau gestur kompleks tidak wajib dipaksa ke tombol yang sudah terpakai.

### 3.3 Kondisi website `iframe`

Dokumentasi proyek menyebut halaman Blazor memuat `/simulation-3d/index.html` pada `iframe`. Audit elemen `iframe` yang nyata dan header `Permissions-Policy` yang dikirim website/proxy:

- Jika situs dan iframe satu origin serta header tidak memblokir, Gamepad API **dapat** tersedia tanpa konfigurasi permission tambahan. **Jangan otomatis mengubah header** jika tidak perlu.
- Bila policy atau embedding memerlukan delegasi, `allow="gamepad"` pada iframe dapat menjadi bagian konfigurasi; untuk cross-origin pastikan juga kebijakan header pada parent mengizinkan origin yang tepat.
- Kebijakan yang menolak akses dapat membuat `navigator.getGamepads()` melempar `SecurityError`: tangkap dan tampilkan instruksi yang bisa ditindaklanjuti.
- Jalankan di HTTP `localhost` untuk development atau HTTPS untuk deployment; cek secure context dan kompatibilitas browser aktual.
- Pastikan iframe bisa mendapat fokus melalui interaksi pengguna; jangan mengandalkan keyboard focus untuk discovery tanpa menguji.
- Periksa `sandbox` iframe jika ada dan jangan melemahkan kebijakan keamanan hanya untuk menyalakan gamepad.

**Larangan:** jangan membuat endpoint API/akses database baru untuk membaca gamepad. Input perangkat dibaca lokal oleh halaman simulator.

---

## 4. DESAIN KONTROL KENDARAAN

### 4.1 Input continuous

| Input | Normalisasi | Respons yang harus terasa |
| --- | --- | --- |
| Steering | `axes[0] → [-1, 1]`, deadzone dan kurva | Proporsional dan kembali netral saat stick dilepas |
| Throttle | `buttons[7].value → [0, 1]` | Kendaraan berakselerasi sesuai tekanan trigger, bukan ON/OFF |
| Brake | `buttons[6].value → [0, 1]` | Rem bertambah dengan tekanan, dapat menghentikan kendaraan |
| Clutch (manual) | `buttons[10]` pressed/analog | Sesuai semantik `Shift` yang sekarang: kopling **ditahan** |
| Horn | `buttons[1]` pressed | Bunyi saat ditahan, mengikuti rate limiting `audio.js` bila ada |
| Camera look | `axes[2/3]`, hanya bila tersedia | Tidak boleh mengubah setir/posisi kendaraan |

**Karakteristik yang harus dikonfirmasi saat audit:** apakah throttle/brake sudah analog di `vehicle.js`, apakah steering memiliki smoothing/return behavior, apakah speedometer saat ini dihitung dari speed riil, apakah transmission state adalah string/enum. Buat adaptor nilai, bukan mengasumsikan angka mentah sudah diterima.

### 4.2 Tunable default awal (bukan ukuran pasti semua kendaraan)

```js
const DEFAULT_GAMEPAD_SETTINGS = {
  enabled: true,
  stickDeadzone: 0.12,       // tidak ada gerak kecil di tengah
  steerExponent: 1.4,       // lebih halus dekat tengah
  steerSensitivity: 1.0,    // scalar sebelum clamp
  steeringSmoothingMs: 90,  // opsional, disesuaikan respons handling existing
  triggerDeadzone: 0.03,
  triggerExponent: 1.0,
  triggerPressThreshold: 0.55,
  triggerReleaseThreshold: 0.40,
  analogActiveThreshold: 0.18,
  sourceSwitchCooldownMs: 200,
  pauseOnDisconnect: true,
  pauseOnBlur: true,
  rightStickCameraEnabled: false,
  mappingProfile: 'standard-default-v1'
};
```

- Tuning angka dapat diubah setelah real-device testing, berbeda per kendaraan bila perlu; sertakan alasan di QA.
- Deadzone memakai re-scaling agar tidak terjadi lompatan setelah deadzone: `sign(x) * ((abs(x) - dz)/(1-dz))` untuk `abs(x) > dz`, selain itu 0.
- Kurva analog: `sign(v) * abs(v) ** exponent` untuk setir; trigger `v ** exponent` setelah normalisasi.
- Jika smoothing dipakai, gunakan `dt` agar hasil tidak bergantung FPS. Jangan smoothing rem secara agresif hingga rem terasa terlambat.
- Jika steer analog terus mengubah arah karena `axes[0]` offset, pastikan deadzone bekerja saat kondisi netral.

### 4.3 Contoh fungsi normalisasi yang aman

```js
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function normalizeStick(raw, deadzone = 0.12, exponent = 1.4) {
  const value = Number.isFinite(raw) ? clamp(raw, -1, 1) : 0;
  const dz = clamp(deadzone, 0, 0.5);
  const a = Math.abs(value);
  if (a <= dz) return 0;
  const normalized = (a - dz) / (1 - dz);
  return Math.sign(value) * Math.pow(normalized, clamp(exponent, 0.5, 4));
}

export function normalizeTrigger(button, deadzone = 0.03, exponent = 1) {
  const raw = Number.isFinite(button?.value)
    ? button.value
    : button?.pressed ? 1 : 0;
  const clamped = clamp(raw, 0, 1);
  const dz = clamp(deadzone, 0, 0.5);
  if (clamped <= dz) return 0;
  return Math.pow((clamped - dz) / (1 - dz), clamp(exponent, 0.5, 4));
}
```

**Aturan keamanan:** apabila throttle dan brake sama-sama aktif, prioritaskan pengereman sesuai perilaku existing; *jangan* memperbesar gaya total secara tidak sengaja. Hindari membiarkan `NaN` atau `undefined` masuk ke gerak kendaraan.

### 4.4 Tombol untuk otomatis

- **D-pad kanan:** minta mode **maju / Drive**.
- **D-pad kiri:** minta mode **mundur / Reverse**.
- Hanya terima pergantian maju/mundur ketika kendaraan **benar-benar berhenti** menurut batas aman milik transmisi existing. Sebagai ambang awal jika belum ada: `|speed| <= 0.5 km/h` **dan** rem aktif (nilai bisa disesuaikan saat audit).
- Jangan melampaui kondisi rem tangan, mesin mati, atau kelayakan state; gunakan *guard* existing yang sama dengan `R` keyboard. Jika engine tidak memungkinkan perubahan tersebut, HUD menampilkan pesan alasan penolakan, bukan memaksa nilai state.
- `R` keyboard yang sudah ada tetap berlaku. Gamepad tidak harus menggunakan semantik toggle bila domain menyediakan fungsi `setDriveDirection` yang tervalidasi.

### 4.5 Tombol untuk manual

- **L3 ditahan = kopling**, mengikuti semantik `Shift` existing.
- **D-pad kanan (edge) = naik gigi**; **D-pad kiri (edge) = turun gigi**.
- Gunakan validasi existing terhadap posisi gear, kebutuhan kopling, dan kondisi kendaraan. Tidak boleh menulis gear index ke model tanpa validasi domain.
- Pastikan pengguna dapat **menahan kopling dengan L3** sambil menggunakan D-pad kiri/kanan dan trigger. Karena ini kombinasi yang cukup sulit, sediakan **profil alternatif aksesibilitas**: `clutchAssist` opsional, default OFF untuk manual realistis; tampilkan sebagai *bantuan* bukan manual penuh.
- Manual pada MOTOR, MOBIL, TRUK diuji jika mode tersebut benar-benar tersedia di runtime. Jika tipe kendaraan tidak mengizinkan manual menurut source, UI menonaktifkan profil manual dan memberi pesan yang benar.

### 4.6 Aksi mesin, rem tangan, lampu, hazard, kamera, pause

| Aksi | Syarat keamanan / lifecycle |
| --- | --- |
| Interaksi (`A`) | Mengikuti jarak dan state `Enter` existing, tidak teleport kendaraan |
| Mesin (`X`) | Start/stop melalui handler existing; *jangan mematikan mesin pada kecepatan tinggi* jika sistem existing melarang |
| Rem tangan (D-pad bawah) | Toggle melalui guard existing; input tidak menembus pause/menu |
| Kamera (`Y`) | Memutar mode kamera yang telah ada; first-person dashboard bila fitur tersebut sudah terintegrasi |
| Lampu utama (D-pad atas) | Toggle status lampu pemain; jika modul lampu realisme belum tersedia, sediakan adaptor/no-op dengan status UI, jangan klaim lampu aktif |
| Sein kiri/kanan (LB/RB) | Toggle state lampu belok bila modul mendukung; tidak menimpa gerak steering |
| Hazard (R3) | Toggle; singkronkan indikator HUD dan visual lampu bila modul mendukung |
| Pause (Menu/Options) | Sekali per tekan; hentikan input kendaraan, jangan mengirim dua toggle dari keyboard + gamepad |
| Menu kontekstual (View/Share) | Buka/tutup overlay aksi tambahan pada state sesuai sesi |

**Ketergantungan dengan roadmap realisme:** fitur lampu/klakson/kokpit sebelumnya dijadwalkan oleh multi-agent A0–A8. Gamepad harus memanggil API fitur saat tersedia. Jika belum tersedia, integrasi dipisah dan dependency dicatat. Controller **tidak boleh berpura-pura** menyalakan lampu tanpa world state; jangan memaksa subagent gamepad mengimplementasikan seluruh visual lampu.

---

## 5. MENU AKSI KONTEKSTUAL: SUPAYA 1 GAMEPAD CUKUP

Masalah desain: tombol gamepad terbatas sedangkan simulator punya aksi mobil/truk (`B` sabuk) dan motor (`H/J/G/F` perlengkapan). Karena itu **wajib** buat **Action Menu** yang dapat dioperasikan hanya dengan gamepad.

### 5.1 Cara kerja

1. Tekan **View/Share** (`buttons[8]`) untuk membuka overlay *Aksi Kendaraan*.
2. Ketika overlay aktif, input mengemudi **tidak** dikirim ke kendaraan. Pilih salah satu kebijakan: **pause simulasi saat menu dibuka** (default disarankan, paling aman) atau hanya boleh membuka saat berhenti. Implementasikan satu kebijakan konsisten dan tes.
3. D-pad pindah pilihan; `A` mengonfirmasi; `B` kembali/tutup; `Menu/Options` tetap bisa pause.
4. Setiap item mengeksekusi handler domain yang sama dengan kontrol keyboard. Jangan langsung mengubah mesh/item display.
5. Setelah overlay ditutup, **wajib reset analog/edges** dan tunggu input netral bila perlu agar RT yang masih ditahan tidak langsung membuat mobil melaju.

### 5.2 Item menu adaptif

**Semuanya:** Start/stop mesin, rem tangan, bantuan kontrol, pilih device, konfigurasi sensitivitas, lampu (jika ada), hazard, kembali ke simulasi.

**MOBIL/TRUK:** Pasang/lepas sabuk, tombol gear/direction sesuai transmisi, kamera first-person, lampu jauh bila fitur tersedia.

**MOTOR:** Empat aksi perlengkapan yang sekarang dipicu oleh `H/J/G/F`, dengan **label riil hasil audit**. Jangan menebak apakah huruf tertentu berarti helm/jaket/sarung tangan/dll. Label menu harus sesuai handler keyboard dan teks UI yang ada. Boleh ditambah horn/headlights jika modul tersedia.

**Saat belum masuk kendaraan:** `A` untuk masuk kendaraan, bantuan kontrol, pilih gamepad aktif.

**Saat hasil/selesai:** navigasi hasil dan tombol yang relevan jika UI existing memungkinkan; tidak menghidupkan lagi gerak kendaraan.

### 5.3 Aksesibilitas

- Font jelas di resolusi desktop, fokus elemen terlihat, tombol tetap bisa dipakai mouse/keyboard.
- `A` konfirmasi dan `B` kembali harus selalu konsisten **di dalam menu** meski di dunia berkendara `B` adalah klakson.
- Instruksi tombol tampil sebagai fungsi, misalnya `RT — Gas`, `LT — Rem`, `L3 — Kopling`.
- Hindari overlay yang menutup speedometer kritis saat gameplay; jika overlay mem-pause, beri label jeda.
- Simpan preferensi remapping; sediakan **Reset ke default**.

---

## 6. MANAJEMEN PERANGKAT, SOURCE ARBITRATION, DAN SAFETY

### 6.1 Device discovery dan pemilihan

- Jika ada satu gamepad standar, pilih otomatis setelah pengguna memberi input.
- Jika >1 terhubung, tampilkan pilihan perangkat (nama yang tampil dari `Gamepad.id` adalah string dari platform dan **tidak boleh dipakai sebagai sumber HTML mentah**).
- Identitas runtime `Gamepad.index` bisa dipakai untuk sesi berjalan, tetapi **tidak stabil antarreconnect**. Setelah disconnect, lakukan discovery ulang; jangan asumsi indeks lama masih perangkat sama.
- Jika index terpilih hilang, null, `connected=false`, atau API throw, jadikan status `disconnected/error` dan jalankan kebijakan safe-stop.
- Preferensi mapping disimpan sebagai profil (misalnya `standard-default-v1`), bukan mengandalkan index yang bisa berubah.

### 6.2 Keyboard vs gamepad

**Pilihan default yang disarankan: `last meaningful active source`** dengan *lock per episode input*, bukan kedua input dicampur.

- Source berpindah ke gamepad hanya setelah aksi signifikan: steering melampaui `analogActiveThreshold`, trigger melampaui threshold, atau tombol ditekan.
- Keyboard menjadi aktif setelah keydown kontrol gameplay yang sah, bukan karena browser shortcut atau tombol form input.
- Tetapkan cooldown (contoh 200 ms) supaya jitter axis tidak menyebabkan HUD bolak-balik.
- Selama gamepad aktif, gunakan continuous input gamepad lengkap; **jangan** menggabungkan rem keyboard dengan throttle gamepad secara diam-diam.
- **Safety exception:** Pause, Esc, dan darurat UI harus diproses secara global sesuai desain aplikasi; *double-toggle suppression* tetap wajib.
- Jika gamepad disconnected, keyboard bisa mengambil alih setelah resume disengaja, bukan memberi throttle otomatis dari state lama.
- Untuk user yang hanya ingin keyboard, setting `gamepad.enabled=false` harus benar-benar mematikan reader/claim input.

### 6.3 Pause & resume policy

| Kejadian | Perilaku wajib |
| --- | --- |
| Gamepad terputus saat mengemudi | Clear throttle/steer/horn/clutch; masuk PAUSED atau halt yang setara; tampilkan alasan |
| Tab tersembunyi / window blur | Clear input dan pause (default); jangan lanjut driving di background |
| Iframe kehilangan fokus | Perlakukan sebagai kondisi aman yang perlu diuji; jangan tergantung event focus secara naif saat mouse pindah ke bagian website |
| Gamepad kembali tersambung | Tampilkan pilihan `Resume`; **tidak otomatis** memulihkan throttle yang masih ditekan |
| Gamepad terhubung saat game sudah berjalan | Tampilkan notifikasi, klaim perangkat hanya setelah meaningful input |
| Overlay menu dibuka | Stop input dan pause/guard sesuai kebijakan menu |
| Pause ditekan ketika trigger RT ditahan | Kosongkan input; pada resume tunggu `all critical controls neutral` atau konfirmasi eksplisit |
| Browser tak punya Gamepad API | Tampilkan fallback keyboard, tidak crash |
| `getGamepads()` melempar `SecurityError` | Tampilkan alasan browser/policy, lanjut keyboard; jangan infinite error log |

> **Invariant keselamatan:** tidak boleh ada pergerakan pemain yang terus terjadi hanya karena input lama tertahan setelah `disconnect`, `blur`, `pause`, atau `resume`. Jika pause runtime tidak benar-benar menghentikan step kendaraan, perbaiki guard di pipeline input/step sesudah audit, bukan hanya mengubah teks HUD.

### 6.4 Kontrol netral saat resume

Pertimbangkan `neutralGate` sebelum mengizinkan gerak setelah pause/disconnect: gas+rem di bawah batas, steer kembali dalam deadzone, horn tidak ditahan, tombol toggle dilepas. Bila gagal, tampilkan `Lepaskan trigger dan analog untuk melanjutkan`. Untuk pengguna aksesibilitas, gate dapat ditata ulang tetapi tidak boleh menimbulkan throttle mendadak.

### 6.5 Edge detector

Gunakan *previous pressed state* per gamepad dan per tombol. Aksi *pressed* dijalankan hanya pada transisi, dan reset state saat pergantian profil, context, device, atau resume. Jika beberapa tombol menghasilkan satu aksi di satu frame, hanya dispatch sekali.

```js
export function risingEdge(currentPressed, previousPressed) {
  return Boolean(currentPressed) && !Boolean(previousPressed);
}

export function fallingEdge(currentPressed, previousPressed) {
  return !Boolean(currentPressed) && Boolean(previousPressed);
}
```

Untuk analog button yang diperlakukan sebagai boolean, gunakan histeresis dua ambang (`press >= 0.55`, release `<= 0.40`) untuk mencegah chatter.

---

## 7. STRUKTUR FILE DAN OWNERSHIP PERUBAHAN

**Penting:** source kode tidak dilampirkan dalam percakapan; path berikut adalah **rancangan target**, bukan konfirmasi file baru sudah ada. Sesuaikan dengan style/import nyata (ES modules atau bundling) seusai audit.

```text
src/Kemudi.Web/wwwroot/simulation-3d/
├── index.html                     [EXISTING, audit script load]
├── main.js                        [EXISTING, LEAD INTEGRATOR ONLY]
├── controls.js                    [EXISTING, LEAD INTEGRATOR ONLY]
├── vehicle.js                     [EXISTING, hanya adapter kecil bila perlu]
├── hud.js                         [EXISTING, tambah status controller via owner HUD]
├── screens.js                     [EXISTING, tambah menu & settings via owner UI]
├── audio.js                       [EXISTING, reuse horn/audio]
├── results.js                     [EXISTING, JANGAN DIUBAH untuk gamepad]
└── input/                         [USULAN, jika struktur existing belum punya padanan]
    ├── gamepad-adapter.js          [BARU]
    ├── gamepad-normalize.js        [BARU]
    ├── gamepad-mappings.js         [BARU]
    ├── gamepad-settings.js         [BARU]
    ├── gamepad-action-router.js    [BARU]
    └── input-manager.js            [BARU; boleh digabung dengan controls.js jika perlu]

tools/webgl/
├── package.json                   [EXISTING, periksa scripts dulu]
└── ...                            [unit/function/browser tests existing]

docs/ atau tools/webgl/README.md    [dokumen kontrol gamepad]
```

**Jangan:** edit `Builds/WebGL/` sebagai sumber; build dari source. Jangan menyalin kode input browser ke direktori Unity. Jangan membuat salinan `controls.js` yang berjalan paralel.

---

## 8. PEMBAGIAN MULTI-AGENT — WORKSTREAM G0–G6

Workstream diberi prefiks **G** supaya tidak berbenturan dengan agent realisme **A0–A8** pada dokumen sebelumnya. **G0 = Lead/A0 integrator**; bila realisme dan gamepad dikerjakan bersamaan, Lead A0 tetap pemegang tunggal perubahan `main.js`/`controls.js`.

| Agent | Tanggung jawab | Hak edit utama | Deliverable |
| --- | --- | --- | --- |
| **G0 — Lead & Integration** | Audit arsitektur, kontrak action, integration gates, merge, regresi | `main.js`, `controls.js`; koordinasi owner lain | `GAMEPAD_AUDIT.md`, `GAMEPAD_CONTRACT.md`, integrated runtime |
| **G1 — Device Adapter** | Gamepad API polling, connect/disconnect, multi-device discovery, error-safe lifecycle | `input/gamepad-adapter.js` | Reader + tests dengan injected provider |
| **G2 — Analog & Mapping** | Normalisasi, deadzone, curves, profiles, calibration, remap dan storage | `input/gamepad-normalize.js`, `input/gamepad-mappings.js`, `input/gamepad-settings.js` | Pure functions dan mapping config + tests |
| **G3 — Domain Action Router** | State input, debounce/edge, context mapping, transmission guard adapter | `input/gamepad-action-router.js` | Action frame + tests; **bukan** edit vehicle/main langsung |
| **G4 — HUD & Menu** | Status perangkat, prompts, action menu, settings UI, tutorial | Modul UI baru; `hud.js`/`screens.js` hanya setelah koordinasi owner realisme | UI keyboard + gamepad navigable |
| **G5 — Web/iframe Compatibility** | Audit Blazor iframe, policy, secure context, diagnostic error, standalone | `Simulasi.razor` **jika perlu** dan disetujui Lead | Bukti akses Gamepad API embedded/standalone |
| **G6 — QA & Documentation** | Tests, physical-device checklist, regression, docs kontrol, profiling | test files, `tools/webgl/README.md` | Evidence test matrix, dokumentasi, issue/blockers |

### 8.1 Aturan koordinasi lintas-agent

1. G0 wajib membaca dua dokumen proyek dan inspeksi source sebelum membagi kerja.
2. G0 mempublikasikan kontrak `GAMEPAD_CONTRACT.md` **sebelum** G1–G4 membuat implementasi besar.
3. G1, G2, G3 dapat bekerja paralel setelah kontrak freeze. G4 mulai menu berdasarkan enum konteks/action final. G5 audit paralel sejak awal. G6 menyiapkan test harness paralel.
4. G0 **satu-satunya** agent yang mengintegrasikan `main.js`/`controls.js` dan memutus ownership final ketika terjadi perubahan dari workstream realisme.
5. G4 tidak mengedit `hud.js`/`screens.js` jika sedang dimiliki oleh A3/A0 dalam rencana realisme; buat extension terpisah dan ajukan hook/PR integrasi.
6. G3 tidak mengubah `vehicle.js` langsung. Ajukan adapter signature dan test ke G0; jika A5 memegang `vehicle.js`, integrasi dilakukan pemilik modul setelah koordinasi.
7. Jangan menjalankan dua refactor besar secara paralel pada file entry point yang sama. Gunakan change request, bukan overwrite.
8. G6 melaporkan PASS/FAIL/SKIPPED per test; tidak boleh menandai PASS hanya karena modul ter-import.

### 8.2 Integration request antar-agent

```md
### Integration Request — G[N]
- Modul baru / API: ...
- Butuh hook dari file existing: ...
- Event atau state yang dikonsumsi: ...
- Event atau state yang diproduksi: ...
- Kondisi: DRIVING / ON_FOOT / PAUSED / lainnya
- Pseudocode 3–10 baris: ...
- Test paling kecil: ...
- Perlu perubahan dari agent lain: ...
- Potensi konflik dan fallback: ...
```

---

## 9. RENCANA IMPLEMENTASI BERGATE (URUTAN WAJIB)

### GATE 0 — Baseline dan audit aktual (G0 + G5 + G6)

**Checklist audit:**

- [ ] Buka `main.js`, `controls.js`, `vehicle.js`, `screens.js`, `hud.js` dan catat signature aktual, state machine sesi, siapa pemilik loop frame, timing `dt`, binding keyboard, serta handler transmisi.
- [ ] Cari implementasi gamepad/keyboard/input sebelumnya agar tidak membuat reader duplikat.
- [ ] Verifikasi URL `/simulation-3d/index.html` benar dipakai di `Simulasi.razor`.
- [ ] Inspect `iframe` (`allow`, `sandbox`, origin) dan response headers (terutama `Permissions-Policy`).
- [ ] Catat perilaku enter vehicle, engine, handbrake, auto/manual, kamera, pause, peralatan motor, sabuk, horn/lights bila sudah ada.
- [ ] Periksa test scripts dalam `tools/webgl/package.json`, struktur unit/browser tests, dependency versions, dan apakah import module menggunakan ESM.
- [ ] Jalankan **baseline** build dan tests; catat hasil sebelum perubahan.
- [ ] Buat `GAMEPAD_AUDIT.md`: bukti path/line, API nyata, gap, konflik roadmap A0–A8, keputusan implementasi.

**Gate lulus:** ada audit dan test baseline tertulis, tidak ada asumsi tak terverifikasi yang dipakai sebagai dasar integrasi.

### GATE 1 — Kontrak & minimum integration skeleton (G0)

- [ ] Sepakati `InputFrame` dan adapter keyboard→action tanpa mengubah gameplay.
- [ ] Tetapkan enum aksi/konteks, semantics `pressed/held`, `source arbitration`, pause/disconnect/neutral gate, dan model error UI.
- [ ] Tentukan feature flag, lokasi storage dan schema version mapping.
- [ ] Tentukan file ownership dan rencana konflik dengan A0–A8.
- [ ] Tulis `GAMEPAD_CONTRACT.md` + minimal test fixture.

**Gate lulus:** G1/G2/G3/G4 dapat implementasi modular tanpa memodifikasi entry points secara paralel.

### GATE 2 — Device detection + reader + mock seam (G1)

- [ ] `connect`, `disconnect`, `poll`, `dispose` bekerja tanpa memory/listener leak.
- [ ] `getGamepads` dibaca aman, penanganan null/multiple/unsupported/SecurityError.
- [ ] Provider dapat di-inject untuk testing (`getGamepads: () => [...]`), tidak butuh gamepad fisik untuk unit tests.
- [ ] Ikuti `mapping=standard`, nonstandard tertangani dengan status dan jalan custom mapping bila direncanakan.
- [ ] Tidak melakukan `setInterval` polling terpisah atau loop rendering kedua.

**Gate lulus:** event dan raw snapshot valid, reader aman ketika gamepad tidak ada.

### GATE 3 — Mapping, analog, dan penyimpanan (G2)

- [ ] Pure normalization tests untuk input `-1, 0, +1`, deadzone, analog 0..1, NaN, out-of-range.
- [ ] Profile mapping default dan alternatif manual (clutch assist opsional).
- [ ] Sensitivity/deadzone menu dapat menyimpan konfigurasi dengan schema version dan validasi.
- [ ] Unknown device tidak diam-diam memakai indeks yang salah; deteksi dan tawarkan calibrate.
- [ ] Settings storage gagal (`localStorage` blocked) tidak memblokir simulation.

**Gate lulus:** mapping deterministic dan testable.

### GATE 4 — Action router dan safety (G3)

- [ ] Pisahkan continuous dan edge actions.
- [ ] Beri context guards untuk `MENU`/`ON_FOOT`/`DRIVING`/`PAUSED`/`RESULT`.
- [ ] Handle device switch/reconnect tanpa mengeksekusi tombol yang masih ditahan.
- [ ] Implementasikan arbitration dengan keyboard snapshot.
- [ ] Hard reset controller input pada pause, disconnect, blur, overlay; neutral gate saat resume.
- [ ] Aksi transmisi memakai guard eksisting, termasuk tidak boleh reverse saat maju.

**Gate lulus:** tes state machine dan safety edge case lulus.

### GATE 5 — UI/HUD dan menu peralatan (G4)

- [ ] Status disconnected / connected / active / error / unsupported terlihat pada HUD/setting.
- [ ] Prompt `Tekan tombol controller` saat belum discovered.
- [ ] Menu action kontekstual dapat dibuka, dinavigasi, dan ditutup **hanya pakai gamepad**.
- [ ] Semua aksi keyboard `B`, `H/J/G/F` dapat dijalankan dari menu, nama sesuai audit.
- [ ] Setting analog, mapping dan device picker tersedia; fallback keyboard tetap ada.
- [ ] Pause/menu tidak membuat input kendaraan berlanjut.

**Gate lulus:** tes UI DOM dan smoke visual tidak ada overlay konflik yang membuat simulator tidak bisa dimainkan.

### GATE 6 — Integrasi website/iframe dan runtime (G0 + G5)

- [ ] `main.js` memanggil **satu** input manager pada loop existing.
- [ ] Semua aksi masuk ke handler domain existing; tidak membuat KeyboardEvent sintetis.
- [ ] G0 menghubungkan motor/mobil/truk manual dan otomatis melalui API yang benar.
- [ ] `iframe` Gamepad API diuji pada website (tidak hanya standalone). Policy diubah **hanya jika perlu**.
- [ ] Tampilan status, audio horn, lampu dan camera mode disinkronkan dengan state aslinya.
- [ ] Keyboard-only tetap dapat menyelesaikan sesi.

**Gate lulus:** sesi dapat dimainkan pada build dev standalone dan embedded, gamepad dapat mengoperasikan fitur inti tanpa regression.

### GATE 7 — QA, build, docs, dan release gate (G6 + G0)

- [ ] Run build dan tests existing; laporkan hasil.
- [ ] Unit tests dan browser tests baru lulus dengan fake Gamepad.
- [ ] Uji perangkat fisik standard mapping pada Chrome/Edge; Firefox bila tersedia (catat bila SKIPPED).
- [ ] Uji 3 kendaraan × 2 mode transmisi jika benar didukung.
- [ ] Uji safe disconnect/reconnect/tab blur/iframe focus.
- [ ] Periksa performa polling: tidak ada per-frame listener atau alokasi tidak wajar.
- [ ] Periksa tidak ada console error, perubahan skor, hasil, atau network API.
- [ ] Dokumentasi pengguna dan bantuan kontrol diperbarui.
- [ ] Berikan handoff report dan leftover risk dengan bukti.

**Gate lulus:** seluruh acceptance P0 terpenuhi, atau blocker dijelaskan dan perubahan belum ditandai release-ready.

---

## 10. SKENARIO PENGUJIAN TERUKUR

### 10.1 Test matrix fungsional

| ID | Kondisi / langkah | Expected result | Prioritas |
| --- | --- | --- | --- |
| GP-01 | Browser tidak mendukung Gamepad API | Keyboard berfungsi; UI status unsupported, tanpa crash | P0 |
| GP-02 | Gamepad USB/Bluetooth terhubung, tekan A | Status berubah `connected/active`, device dikenali | P0 |
| GP-03 | Kendarai MOBIL, axes[0]=-1/+1/0 | Belok kiri/kanan/netral proporsional; tak drift | P0 |
| GP-04 | RT pada 0/0.5/1 | Throttle 0/sebagian/penuh | P0 |
| GP-05 | LT pada 0/0.5/1 | Rem bertingkat dan kendaraan dapat berhenti | P0 |
| GP-06 | RT + LT bersama | Tidak menghasilkan akselerasi tak terkendali; sesuai brake priority | P0 |
| GP-07 | Tekan X satu kali dan tahan | Mesin toggle **sekali**, bukan per-frame | P0 |
| GP-08 | Tekan D-pad bawah satu kali | Rem tangan toggle sekali | P0 |
| GP-09 | Auto: D-pad kiri saat kendaraan bergerak | Reverse ditolak, HUD memberikan alasan | P0 |
| GP-10 | Auto: kendaraan berhenti + rem, pilih mundur | Reverse sesuai domain, kendaraan dapat mundur | P0 |
| GP-11 | Manual: tahan L3 + D-pad kanan/kiri | Gigi naik/turun sesuai aturan kopling | P0 |
| GP-12 | Tahan B saat berkendara | Klakson mengikuti audio existing, tidak repeat liar | P1 |
| GP-13 | Tekan Y berulang | Kamera berpindah satu mode per klik | P1 |
| GP-14 | Tekan Start/Menu | Pause/resume sekali per klik | P0 |
| GP-15 | Pause saat throttle tinggi, lalu resume | Kendaraan tidak langsung melaju sebelum kontrol netral | P0 |
| GP-16 | Cabut gamepad saat RT penuh | Throttle clear, sesi aman/paused | P0 |
| GP-17 | Ganti tab/browser blur | Input clear; background tidak membuat pemain bergerak | P0 |
| GP-18 | Reconnect tanpa melepaskan RT | Tidak ada akselerasi spontan | P0 |
| GP-19 | Buka View/Share menu | D-pad/A/B menavigasi; kendaraan berhenti/paused | P0 |
| GP-20 | MOBIL/TRUK: buka menu → sabuk | Aksi sama dengan B keyboard; state sama | P1 |
| GP-21 | MOTOR: buka menu → tiap aksi H/J/G/F | Perlengkapan sesuai keyboard; label sesuai source | P1 |
| GP-22 | Steering analog jitter kecil | Deadzone mencegah drift | P0 |
| GP-23 | Settings disimpan lalu reload | Setting valid restored; invalid reset safe | P1 |
| GP-24 | Dua gamepad tersambung | Hanya device terpilih mengendalikan pemain | P1 |
| GP-25 | Gamepad nonstandard | Kalibrasi atau error `belum didukung`, tanpa mapping palsu | P1 |
| GP-26 | `getGamepads()` SecurityError | UI error informatif, keyboard tetap usable | P0 |
| GP-27 | Selesaikan misi dengan gamepad | Hasil/skor dikirim sesuai existing, hanya sekali | P0 |
| GP-28 | Main via `/simulasi/play` iframe | Semua P0 inti tetap bekerja (fokus/policy benar) | P0 |
| GP-29 | Main via WebGL standalone | Semua P0 inti bekerja tanpa API/login | P0 |
| GP-30 | Controller disabled di settings | Keyboard-only tetap normal tanpa device claim | P1 |
| GP-31 | Tekan beberapa tombol saat overlay tutup | Tidak ada accidental horn/toggle/gear akibat edges lama | P0 |
| GP-32 | Sesi gagal/hasil tampil | Gamepad tidak menggerakkan kendaraan di layar hasil | P0 |
| GP-33 | MOTOR, MOBIL, TRUK masing-masing | Handling dan context menu masing-masing tepat | P0 |
| GP-34 | Keyboard + gamepad dipakai bergantian | Satu source jelas, tidak blending uncontrolled | P0 |

### 10.2 Unit test minimum

- `normalizeStick`: nilai ekstrem dan deadzone; re-scaling kontinu, output tidak pernah di luar [-1,1].
- `normalizeTrigger`: `GamepadButton.value` fractional, `pressed` fallback, NaN, undefined, clamp.
- `risingEdge`: tahan tombol 60 frame menghasilkan **1** aksi toggle.
- `hysteresis`: analog button di sekitar ambang tidak berkedip.
- `provider`: array kosong/null, index berubah, disconnect, `SecurityError`, mapping nonstandard.
- `context`: `A` saat on-foot adalah interact, saat menu adalah confirm; `B` di menu back, saat driving horn.
- `manual`: gear up tanpa kopling ditolak sesuai guard; gear up dengan kopling diterima jika state valid.
- `automatic`: Reverse saat speed tinggi ditolak; saat stopped/brake guard diterima.
- `safety`: throttle reset pada pause/blur/disconnect, neutral gate saat resume.
- `arbitration`: source switches deterministically dan tidak campur steering/throttle.
- `settings`: migrasi versi konfigurasi dan fallback bila storage tidak tersedia.

### 10.3 Browser test harness dan bukti nyata

Gunakan provider dependency injection supaya unit/UI tests tidak membutuhkan alat fisik. Browser E2E dapat memasukkan **fake provider** melalui harness yang dipasang hanya saat test mode, bukan membuat endpoint publik. Pastikan fake provider memiliki **semantik button press dan axis** yang mirip Gamepad API. Browser test memverifikasi state yang berubah, bukan hanya snapshot gambar.

Untuk hardware, jalankan tes manual terpisah dengan controller nyata karena Playwright/Chromium headless tidak menjamin kemampuan meniru semua gamepad/drivers. Catat merek/model, koneksi USB/Bluetooth, OS, browser/version, `mapping`, status, hasil; jangan klaim kompatibilitas seluruh controller hanya dari mock.

### 10.4 Regression yang tidak boleh hilang

- Pilih `MOTOR|MOBIL|TRUK`, otomatis/manual, map unified.
- Enter kendaraan, hidupkan mesin, lepas rem tangan, maju/mundur, belok, kamera, pause, perlengkapan, finis.
- AI/pejalan kaki/traffic light tidak berubah kontrolnya.
- Skor, pelanggaran, collision counters, durasi, hasil dan retry `AttemptId` tetap konsisten.
- HUD asli (speedometer, lampu jika ada) tetap mencerminkan **state kendaraan**, bukan status button mentah.
- Browser tanpa controller tetap berjalan dengan performa minimal setara baseline.

---

## 11. PERINTAH VERIFIKASI PROYEK

Jalankan dari akar repositori. Skrip di bawah diambil dari dokumentasi proyek, **cek tersedia dan prasyarat lokal** sebelum eksekusi. Catat PASS/FAIL/SKIPPED.

```powershell
# Build .NET solusi (kompatibilitas website/API)
dotnet build Kemudi.slnx

# Build simulator WebGL (source => builds/WebGL)
npm.cmd --prefix tools/webgl run build

# Unit/function tests yang terdokumentasi
npm.cmd --prefix tools/webgl run test:functions

# Server simulator mandiri
npm.cmd --prefix tools/webgl start
# Buka http://localhost:8080
```

Tes tambahan yang dokumentasi sebut: `test`, `test:intersection`, `test:unified`, `test:backend`; lihat `tools/webgl/package.json` dulu. Untuk menguji website embedded dengan API lokal:

```powershell
# Terminal 1
dotnet run --project src/Kemudi.Api --no-launch-profile -- --urls http://127.0.0.1:5090 --environment Development

# Terminal 2
dotnet run --project src/Kemudi.Web --no-launch-profile -- --urls http://127.0.0.1:5290 --environment Development --Api:BaseUrl=http://127.0.0.1:5090

# Browser:
# http://127.0.0.1:5290/simulasi/play
```

**Checklist manual pemilik proyek:** hubungkan gamepad melalui USB/Bluetooth → cek input perangkat pada sistem operasi → buka browser desktop Chrome/Edge → fokuskan simulator → tekan A → lihat status controller → pilih kendaraan → tekan A dekat kendaraan → X mesin → D-pad bawah rem tangan → RT/LT analog → left stick belok → Y kamera → Start pause → uji cabut controller saat RT tertahan → periksa sesi dijeda aman.

---

## 12. PERFORMANCE, PRIVASI, DEBUG, DAN DEPLOYMENT

### 12.1 Kinerja

- Jangan buat `requestAnimationFrame`/`setInterval` tambahan untuk polling gamepad apabila loop simulasi sudah berjalan.
- Hindari alokasi array/objek besar per frame; cache mapping dan setting; ingat `getGamepads()` tetap harus dipanggil ulang.
- Jangan membangun ulang DOM UI status 60 kali per detik; update hanya ketika status atau teks berubah, plus meter visual dengan frekuensi terbatas jika diperlukan.
- Pertahankan frame rate mendekati baseline, terutama saat hujan/malam/AI padat yang direncanakan pada proyek realisme.
- Jika halaman pause, status device boleh tetap dipoll secukupnya untuk reconnect, tetapi **tidak** meneruskan drive intents.

### 12.2 Privasi dan keamanan

- Jangan mengirim `Gamepad.id`, tombol/axis mentah, atau jejak input gameplay ke backend hasil simulasi tanpa kebutuhan dan persetujuan eksplisit.
- Hindari meletakkan `Gamepad.id` ke `innerHTML`. Gunakan `textContent`.
- Setting di `localStorage` hanya data mapping/sensitivitas non-rahasia, pakai schema/version dan validasi input.
- Jangan menurunkan keamanan `iframe sandbox` atau membolehkan seluruh origin melalui header hanya karena API sempat error.
- Informasi perangkat untuk diagnostik console hanya di debug mode; log error yang berulang perlu throttle.

### 12.3 Indikator HUD minimum

- Status: `Controller tidak terhubung`, `Controller terhubung`, `Controller aktif`, `Controller tidak didukung`, `Gamepad diblokir browser`.
- Ikon input sumber aktif opsional (keyboard/gamepad) untuk menjelaskan siapa yang mengendalikan.
- Hint kontrol saat onboarding; petunjuk calibrate bila stick drift.
- Warning saat disconnect dan tombol resume dengan *neutral gate*.

### 12.4 Dokumentasi pengguna

Tambahkan petunjuk di `tools/webgl/README.md` dan layar bantuan game:

- Cara menghubungkan controller USB/Bluetooth.
- Browser yang diuji serta catatan `standard mapping`.
- Tabel tombol untuk otomatis dan manual.
- Cara membuka action menu peralatan motor/sabuk.
- Cara mengatur deadzone, sensitivitas, dan reset default.
- Cara menangani controller tidak terdeteksi: fokuskan iframe, tekan tombol, periksa kompatibilitas, policy, izin browser.
- Controller putus → sesi pause, input netral, resume sengaja.

---

## 13. DEFINISI SELESAI / RELEASE CHECKLIST

**Wajib (P0):**

- [ ] Analog setir/gas/rem berfungsi nyata pada MOBIL, MOTOR, TRUK.
- [ ] A masuk kendaraan, X mesin, D-pad bawah rem tangan, Y kamera, Menu pause.
- [ ] Manual kopling+gear dan auto drive/reverse aman pada mode yang didukung.
- [ ] Keyboard tetap bisa dipakai; tidak ada dua sumber input dicampur sembarangan.
- [ ] Pause, blur, disconnect/reconnect, dan context menu tidak meninggalkan throttle/steering aktif.
- [ ] Gamepad dapat digunakan di standalone dan `iframe` website.
- [ ] Browser tanpa controller tidak crash; error permission ditangani.
- [ ] Tests normalization/edge/state/safety dan regresi existing dijalankan.
- [ ] Build WebGL dan .NET tidak regress (atau blocker tercatat jujur).
- [ ] Semua hasil/skor/penyimpanan tetap berjalan.

**Wajib fitur lengkap (P1):**

- [ ] Klakson, sein, lampu, hazard, status HUD sinkron apabila subsistemnya sudah ada; dependency yang belum ada dinyatakan belum terpenuhi.
- [ ] Action menu mencakup sabuk mobil/truk dan keempat perlengkapan motor berdasarkan label source aktual.
- [ ] Pengaturan deadzone/sensitivitas dan remap disimpan/direset aman.
- [ ] Dua controller atau controller nonstandard tidak mengambil kontrol yang salah.
- [ ] Dokumentasi user, test manual hardware, dan evidence lengkap.

**Opsional (P2):** vibration/haptics dengan feature detection, ikon glyph Xbox/PlayStation otomatis, kamera right-stick analog, tombol rebinding penuh, calibration wizard lebih canggih, clutch assist tuning per kendaraan, overlay latency diagnostic.

**Aturan rilis:** jika P0 gagal, jangan mengklaim integrasi selesai. Jika P1 terkendala oleh fitur lampu/kokpit realisme yang belum digabung, tandai dependency secara jelas dan jangan memblokir MVP dasar yang aman.

---

## 14. FORMAT LAPORAN SETIAP SUB-AGENT

```md
## GAMEPAD HANDOFF — Agent G[N]
Status: DONE / PARTIAL / BLOCKED

### Audit / keputusan
- Referensi source nyata: ...
- Perubahan dibanding asumsi plan: ...

### Implementasi
- File dibuat/diubah: ...
- API publik / hook: ...
- Dependensi pada agent lain: ...

### Test & bukti
- Perintah: ...
- Hasil: PASS / FAIL / SKIPPED, penjelasan ...
- Bukti perubahan state / screenshot jika ada: ...

### Risiko / tersisa
- ...

### Tidak disentuh
- File/modul milik agent lain: ...
```

Laporan final Lead wajib memuat keputusan ownership, ringkasan setiap G0–G6, daftar tes beserta hasil, browser/controller yang benar-benar diuji, daftar file, cara menjalankan, serta langkah verifikasi mandiri.

---

## 15. PROMPT SIAP TEMPEL KE CODEX LEAD

```text
Kamu adalah G0 / Lead Agent untuk implementasi GAMEPAD di proyek Kemudi.id.

Sebelum coding, baca penuh:
1. RENCANA_INTEGRASI_GAMEPAD_KEMUDI_ID_MULTI_AGENT_CODEX.md
2. DOKUMENTASI_WEBSITE_DAN_SIMULASI.md
3. RENCANA_REALISME_SIMULASI_KEMUDI_ID_MULTI_AGENT_CODEX.md

Implementasi wajib di simulator BROWSER Three.js yang digunakan website
Blazor (/simulasi/play), BUKAN proyek Unity di simulation/Kemudi.Simulation.

Prioritas:
- Gamepad standard mapping: axes[0] setir, RT gas analog, LT rem analog.
- A interaksi, X mesin, D-pad bawah rem tangan, Y kamera, Start pause.
- Manual: L3 kopling + D-pad kiri/kanan gear; otomatis: kiri reverse,
  kanan drive, hanya jika guard transmisi mengizinkan.
- B klakson, LB/RB sein, R3 hazard, D-pad atas headlamp bila fitur ada.
- View/Share action menu yang memungkinkan sabuk mobil/truk dan seluruh
  aksi perlengkapan motor yang sekarang ada di keyboard H/J/G/F.
- Tidak merusak keyboard, sesi, AI, collision, camera, HUD, scoring,
  results.js, iframe integration, dan build tools.

Tindakan:
1. Mulai Gate 0: audit file nyata dan tes baseline; buat GAMEPAD_AUDIT.md.
2. Buat GAMEPAD_CONTRACT.md berdasarkan API existing, action semantics,
   ownership file, device lifecycle, safety, dan test seam.
3. Delegasikan G1–G6 berdasarkan kontrak; agent paralel tidak mengedit
   main.js/controls.js; kamu satu-satunya integrator.
4. Implementasi Gamepad API dengan getGamepads() polling tiap existing
   frame; standard mapping + graceful nonstandard error, edge detector,
   deadzone, analog curves, keyboard/gamepad arbitration, serta settings.
5. Integrasikan semua tombol lewat domain action handlers existing, bukan
   artificial KeyboardEvent; buat contextual menu dan HUD status.
6. Pastikan controller putus/blur/pause = throttle/steering clear dan
   pause/neutral gate, tanpa acceleration spontan saat resume.
7. Uji MOTOR/MOBIL/TRUK, manual/auto jika disediakan, standalone dan iframe,
   dengan synthetic gamepad provider + real hardware checklist.
8. Jalankan dotnet build, WebGL build, unit/function/browser tests yang ada;
   laporkan PASS/FAIL/SKIPPED, browser/OS/device yang diuji, dan blocker.
9. Jangan klaim bahwa lampu/horn/kokpit terintegrasi bila subsistem
   realisme yang disyaratkan memang belum tersedia di repositori.

Selesaikan pekerjaan hingga Gate 7 sejauh lingkungan dan source memungkinkan.
Jangan meminta user mengonfirmasi hal yang sudah terjawab dokumen; ambil
keputusan teknis wajar, catat sebagai asumsi dan uji sebelum release.
```

---

## 16. SUMBER TEKNIS DAN PEMBEDA FAKTA VS USULAN

**Sumber proyek:**

- `DOKUMENTASI_WEBSITE_DAN_SIMULASI.md`: arsitektur Blazor/Three.js, modul runtime, aturan keyboard, map unified, results, build, dan pemisahan Unity.
- `RENCANA_REALISME_SIMULASI_KEMUDI_ID_MULTI_AGENT_CODEX.md`: rencana agent A0–A8, lampu/klakson/kamera/AI/HUD serta aturan ownership dan regresi.

**Sumber eksternal untuk perilaku browser (bukan bukti dukungan perangkat tertentu):**

- MDN, Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
- MDN, Using the Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- MDN, Permissions-Policy gamepad: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/gamepad
- MDN, Gamepad buttons: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/buttons
- Gamepad Standard Mapping Specification: https://w3c.github.io/gamepad/

**Batas keyakinan:** nilai deadzone, sensitivitas, throttle/brake arbitration, layout tombol Kemudi.id, bentuk action menu, kontrak action frame, file baru, pembagian agent G0–G6, dan kriteria test dalam dokumen ini adalah **rekomendasi desain** yang harus diselaraskan dengan kode aktual dan diuji. Dokumentasi pengguna **tidak** membuktikan bahwa modul gamepad saat ini sudah ada, bahwa setiap model gamepad bekerja di semua browser, atau bahwa perubahan di dokumen ini telah diimplementasikan.

**Selesai menulis rencana ≠ selesai integrasi kode.**
