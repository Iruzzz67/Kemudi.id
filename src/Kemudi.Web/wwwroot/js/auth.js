// Cookie auth untuk Blazor Server.
// Di dalam sirkuit SignalR, respons HTTP sudah terkirim ke browser sehingga
// Response.Cookies.Append dari server melempar exception. Token JWT karena itu
// ditulis dari sisi klien via document.cookie; server tetap membacanya dari
// Request.Cookies pada render berikutnya (lihat ApiClient.Token).
window.setAuthCookie = function (name, token, days) {
    days = days || 7;
    var secure = window.location.protocol === 'https:' ? '; secure' : '';
    var expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(token) +
        '; expires=' + expires + '; path=/; samesite=lax' + secure;
};

window.clearAuthCookie = function (name) {
    document.cookie = encodeURIComponent(name) +
        '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax';
};
