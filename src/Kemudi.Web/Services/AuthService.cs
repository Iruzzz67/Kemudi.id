using System.Text;
using System.Text.Json;
using Kemudi.Shared.DTOs;

namespace Kemudi.Web.Services;

/// <summary>
/// State autentikasi sisi server (Blazor Server). Token JWT disimpan di cookie
/// httpOnly <c>kemudi_token</c>; halaman membaca properti <see cref="IsAuthenticated"/>.
/// </summary>
public sealed class AuthService
{
    private readonly ApiClient _api;
    private readonly IHttpContextAccessor _httpContext;

    public AuthService(ApiClient api, IHttpContextAccessor httpContext)
    {
        _api = api;
        _httpContext = httpContext;
    }

    public bool IsAuthenticated => !string.IsNullOrEmpty(_api.Token);

    /// <summary>Apakah token yang tersimpan berperan Admin (klaim role di JWT).</summary>
    public bool IsAdmin => HasRole("Admin");

    /// <summary>Email pengguna yang tersimpan di token.</summary>
    public string Email => DecodeClaim("email") ?? "";

    /// <summary>Login khusus admin — user biasa ditolak oleh API (403).</summary>
    public async Task<(bool Success, string? Error)> LoginAdminAsync(
        string email, string password, CancellationToken ct = default)
    {
        var result = await _api.PostAsync<LoginRequest, AuthResponse>(
            "/api/admin/auth/login", new LoginRequest(email, password), ct);
        if (result is null) return (false, "Login gagal. Periksa email dan password.");

        SetTokenCookie(result.Token);
        return (true, null);
    }

    public async Task<(bool Success, string? Error, AuthResponse? Data)> LoginAsync(
        string email, string password, CancellationToken ct = default)
    {
        var result = await _api.PostAsync<LoginRequest, AuthResponse>(
            "/api/auth/login", new LoginRequest(email, password), ct);
        if (result is null) return (false, "Login gagal. Periksa email dan password.", null);

        SetTokenCookie(result.Token);
        return (true, null, result);
    }

    public async Task<(bool Success, string? Error)> RegisterAsync(
        string name, string email, string password, CancellationToken ct = default)
    {
        var result = await _api.PostAsync<RegisterRequest, AuthResponse>(
            "/api/auth/register", new RegisterRequest(name, email, password), ct);
        if (result is null) return (false, "Registrasi gagal. Email mungkin sudah terdaftar.");

        SetTokenCookie(result.Token);
        return (true, null);
    }

    public void Logout()
    {
        var context = _httpContext.HttpContext;
        if (context is null) return;
        context.Response.Cookies.Delete(ApiClient.TokenCookie);
    }

    private bool HasRole(string role)
    {
        var claim = DecodeClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role");
        if (claim == role) return true;
        // Fallback untuk klaim bernama pendek "role".
        return DecodeClaim("role") == role;
    }

    private string? DecodeClaim(string claimName)
    {
        var token = _api.Token;
        if (string.IsNullOrEmpty(token)) return null;
        try
        {
            var parts = token.Split('.');
            if (parts.Length < 2) return null;
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "="; break;
            }
            using var doc = JsonDocument.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(payload)));
            if (doc.RootElement.TryGetProperty(claimName, out var value))
                return value.GetString();
        }
        catch
        {
            // Token rusak — perlakukan sebagai tidak login.
        }
        return null;
    }

    private void SetTokenCookie(string token)
    {
        var context = _httpContext.HttpContext;
        if (context is null) return;
        context.Response.Cookies.Append(
            ApiClient.TokenCookie,
            token,
            new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = context.Request.IsHttps,
                MaxAge = TimeSpan.FromDays(7)
            });
    }
}
