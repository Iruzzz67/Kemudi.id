# AGENTS.md — Kemudi.id

Panduan kerja agen untuk repositori ini. Verifikasi source aktual; dokumen rencana
dan laporan sesi lama bukan bukti bahwa sebuah fitur sudah selesai.

## Mulai setiap sesi

1. Baca `README.md`, lalu jalankan `git status --short` sebelum mengubah file.
2. Untuk simulator, baca `docs/REALISM_PROGRESS.md`,
   `docs/REALISM_SESSION_LOG.md`, dan `docs/REALISM_QA_REPORT.md`.
3. Untuk gamepad, baca juga `docs/GAMEPAD_PROGRESS.md`,
   `docs/GAMEPAD_CONTRACT.md`, dan `docs/GAMEPAD_QA.md`.
4. Hormati perubahan staged/unstaged dan penghapusan milik pengguna. Jangan
   memulihkan file terhapus, menghapus artefak, melakukan reset, atau menimpa
   pekerjaan lain hanya untuk mendapatkan working tree bersih.

## Arsitektur aktual

- `Kemudi.slnx`: solusi C#; proyek menargetkan `net8.0`. Gunakan SDK yang
  mendukung format `.slnx`; lingkungan terakhir memakai SDK10.
- `src/Kemudi.Web/`: website utama Blazor / Interactive Server.
- `src/Kemudi.Api/`: ASP.NET Core API.
- `src/Kemudi.Infrastructure/`: EF Core, SQLite, Identity, JWT dan migrasi.
- `src/Kemudi.Domain/`, `src/Kemudi.Shared/`: domain dan DTO.
- `src/Kemudi.App/`: proyek web tambahan dalam solusi, bukan entry utama website.
- **Runtime simulator:** `src/Kemudi.Web/wwwroot/simulation-3d/`.
  `Simulasi.razor` menangani `/simulasi` dan `/simulasi/play`, dengan iframe
  same-origin. `SimulasiPlay.razor` merupakan placeholder, bukan integrator aktif.
- Simulator memakai Three.js lokal dan classic scripts/window exports, bukan
  React/Next.js atau ES-module bundler.
- `tools/webgl/`: build/server/tes Node.js dan Playwright.
- `Builds/WebGL/`: output generate; jangan diedit sebagai source.
- `simulation/Kemudi.Simulation/`: proyek Unity terpisah, jangan disentuh untuk
  pekerjaan simulator browser kecuali diminta eksplisit.

## Aturan implementasi

- Kerjakan langkah lokal yang jelas dan reversible sampai terverifikasi. Tanyakan
  hanya untuk ambiguitas material, operasi destruktif, akses kredensial atau produksi.
- Jaga diff kecil; gunakan pola/utilitas existing. Jangan tambah dependency tanpa
  permintaan eksplisit. Refactor/cleanup memerlukan rencana dan regression lock.
- Pertahankan alur pilih kendaraan/transmisi → berjalan → masuk → mesin → rem
  tangan → mengemudi → selesai/gagal → hasil. Jangan membajak binding keyboard.
- Kendaraan tetap `MOTOR|MOBIL|TRUK`, manual/automatic; URL `map=unified`,
  `autostart=1` dan alias lama harus kompatibel.
- Satu RAF dan fixed-tick pipeline existing; jangan membuat loop fisika/input
  kedua. Gerak pemain/AI memakai shared collision, propose→resolve→commit.
- Input keyboard/gamepad masuk domain yang sama, satu sumber aktif, edge toggle
  sekali. Jangan memakai KeyboardEvent palsu untuk gamepad.
- Pause/blur/visibility/disconnect harus membersihkan input dan menjaga gerak
  pemain aman. Neutral gate setelah resume tidak boleh mematikan pembaruan AI
  dan lingkungan. Jangan menghilangkan guard kopling atau arah transmisi.
- HUD/kokpit/lampu membaca state kendaraan yang sama. Jangan memalsukan GLB;
  fallback karakter/kokpit prosedural harus dilaporkan sebagai prosedural.
- Jangan mengubah kontrak `results.js`, skor, counter, `AttemptId`, retry atau
  gateway `/api/simulation/results` tanpa alasan dan tes terarah.
- Build harus menyertakan modul/aset baru tanpa melemahkan validasi hash/GLB.

## Delegasi dan ownership

Default bekerja langsung. Gunakan native subagent untuk tugas independen yang
benar-benar membantu; tentukan ownership file dan bukti yang harus dilaporkan.
Sampaikan bahwa agen lain bekerja di repo dan perubahan mereka tidak boleh
di-revert. Integrator memiliki `main.js`, `controls.js`, entry dan build/package;
hindari dua penulis paralel pada file yang sama. Gunakan role specialist yang
sesuai; `worker` hanya untuk runtime Team aktif, bukan delegasi biasa.

## Perintah lokal

Semua dari root, contoh PowerShell:

```powershell
# Simulator mandiri: http://localhost:8080/
npm.cmd --prefix tools/webgl start

# Validasi tanpa server
npm.cmd --prefix tools/webgl run build
npm.cmd --prefix tools/webgl run test:syntax
npm.cmd --prefix tools/webgl run test:functions
npm.cmd --prefix tools/webgl run test:realism
npm.cmd --prefix tools/webgl run test:gamepad

# Browser tests: server simulator harus aktif
npm.cmd --prefix tools/webgl run test:realism:browser
npm.cmd --prefix tools/webgl run test:gamepad:browser

# Website/API dan database uji harus aktif untuk integrasi
$env:WEB_URL = 'http://127.0.0.1:5891'
$env:API_URL = 'http://127.0.0.1:5890'
npm.cmd --prefix tools/webgl run test:realism:iframe
npm.cmd --prefix tools/webgl run test:backend

dotnet build Kemudi.slnx
```

Setup Playwright: `npm.cmd --prefix tools/webgl ci`, lalu
`npm.cmd --prefix tools/webgl exec -- playwright install chromium`.
Package tidak memiliki script lint/typecheck khusus; syntax check bukan pengganti
tes perilaku. Detail startup Web/API dan koneksi DB terisolasi ada di `README.md`.

Jika DLL terkunci server lain, jangan menghentikan proses yang bukan milik sesi.
Validasi alternatif: `dotnet build Kemudi.slnx --artifacts-path artifacts/dotnet-realism`.
Output alternatif tidak mengganti binary default `dotnet run --no-build`.

## Keamanan dan pembuktian

- Tes backend membuat akun/hasil; gunakan database lokal uji, bukan produksi.
  `artifacts/realism/preview.db*` diabaikan Git. Jangan commit DB, token, cookie,
  password atau secret. Secret JWT development bukan konfigurasi deployment.
- Baca gamepad lokal; jangan kirim device ID/raw input ke backend. Gunakan
  textContent untuk nama perangkat, validasi storage/mapping dan tangkap error API.
- Jangan melonggarkan iframe, CORS atau Permissions-Policy tanpa bukti kebutuhan.
- Jalankan tes terkecil untuk perubahan, lalu regresi/build relevan. Baca exit
  code dan output; bedakan PASS, FAIL, NOT RUN serta warning lingkungan.
- Tes gamepad sintetis bukan bukti perangkat USB/Bluetooth. Screenshot/state
  bukan bukti suara speaker, kualitas visual manusia atau FPS perangkat pengguna.
- Simpan bukti di `artifacts/` dan batas cakupan di QA. Jangan mengubah tes hanya
  agar hijau, menelan kegagalan, atau menyebut partial run sebagai matrix lengkap.

## Akhir sesi dan kelanjutan

Perbarui progress/QA terkait dan tambahkan entri ke `docs/REALISM_SESSION_LOG.md`:
tanggal, file/perubahan, command dan hasil aktual, lokasi bukti, gap/blocker,
proses preview yang sengaja dibiarkan hidup, serta langkah lanjut spesifik.
Pertahankan riwayat; ringkasan akhir harus membedakan implementasi dari acceptance.

## Panduan legacy Next.js — hanya bila mengedit kode Next.js

Blok berikut dipertahankan untuk aset/pekerjaan legacy. Ini **bukan** penjelasan
stack utama Blazor/Three.js saat ini.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Realism simulation — continuity between sessions

For work on the realism simulation plan, first read `docs/REALISM_PROGRESS.md`,
`docs/REALISM_SESSION_LOG.md`, and `docs/REALISM_QA_REPORT.md`. Check actual source
and git status before continuing. Before ending each session, update the progress
file and append a dated journal entry with changed files, executed tests and
PASS/FAIL/NOT RUN evidence, unresolved gaps, and the exact next step. Preserve
previous entries and never record secrets. An unchecked plan or passing unit test
alone is not proof of runtime acceptance or release completion.

For gamepad work also read `docs/GAMEPAD_PROGRESS.md`, `docs/GAMEPAD_CONTRACT.md`,
and `docs/GAMEPAD_QA.md`. Update that progress and append session evidence to
`docs/REALISM_SESSION_LOG.md` before ending. Physical-controller verification
must be distinguished from synthetic Gamepad API tests.
