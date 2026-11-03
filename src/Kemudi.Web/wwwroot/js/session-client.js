export async function submit(action, body = {}) {
    try {
        const session = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
        if (!session.ok) throw new Error('Sesi tidak tersedia.');
        const { requestToken } = await session.json();
        const response = await fetch('/api/session/' + action, {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': requestToken },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return response.ok ? null : (data.error || 'Permintaan gagal. Coba lagi.');
    } catch {
        return 'Server belum dapat dihubungi. Coba lagi.';
    }
}
