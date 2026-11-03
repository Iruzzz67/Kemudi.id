/** Save completed/failed runs through the website's same-origin gateway. */
window.attachResultSaving = function (screen, payload) {
  const panel = document.createElement('div');
  panel.className = 'result-save';
  panel.style.cssText = 'margin:18px 0;padding:14px;background:#17283d;border-radius:10px;font-size:14px;line-height:1.5';
  const status = document.createElement('p');
  status.className = 'result-save-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const retry = document.createElement('button');
  retry.type = 'button'; retry.textContent = 'Coba simpan lagi'; retry.hidden = true;
  retry.style.cssText = 'margin-top:10px;padding:10px 16px;min-height:44px;border:1px solid #7dd3fc;border-radius:8px;background:#1d4ed8;color:white;cursor:pointer';
  const link = document.createElement('a');
  link.target = '_blank'; link.rel = 'noopener'; link.hidden = true;
  link.style.cssText = 'display:inline-block;margin:10px;color:#7dd3fc';
  // Inline display must not override the native hidden attribute.
  link.style.removeProperty('display');
  panel.append(status, retry, link);
  screen.firstElementChild.append(panel);
  let busy = false, saved = false;

  async function save() {
    if (busy || saved) return;
    busy = true; retry.hidden = true; link.hidden = true;
    status.textContent = 'Menyimpan hasil latihan...';
    try {
      const session = await fetch('/api/session', {
        credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000)
      });
      if (session.status === 404) {
        status.textContent = 'Mode mandiri: buka simulasi melalui website Kemudi.id dan login untuk menyimpan hasil.';
        return;
      }
      if (!session.ok) throw new Error('Sesi server belum tersedia.');
      const { requestToken } = await session.json();
      const response = await fetch('/api/simulation/results', {
        method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': requestToken },
        body: JSON.stringify(payload)
      });
      if (response.status === 401) {
        status.textContent = 'Hasil belum tersimpan. Login di tab baru, lalu kembali dan klik Coba simpan lagi.';
        link.href = '/login'; link.textContent = 'Login'; link.hidden = false;
        retry.hidden = false;
        return;
      }
      if (!response.ok) throw new Error('Penyimpanan gagal.');
      const result = await response.json();
      if (result.id !== payload.attemptId) throw new Error('Konfirmasi penyimpanan tidak valid.');
      saved = true;
      panel.dataset.attemptId = result.id;
      status.textContent = 'Hasil latihan tersimpan di akun Anda.';
      link.href = '/dashboard'; link.textContent = 'Lihat riwayat latihan'; link.hidden = false;
    } catch {
      status.textContent = 'Hasil belum tersimpan. Periksa koneksi lalu coba lagi sebelum meninggalkan halaman ini.';
      retry.hidden = false;
    } finally { busy = false; }
  }
  retry.addEventListener('click', save);
  save();
};
