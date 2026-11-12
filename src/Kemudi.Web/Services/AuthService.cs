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
    private AdminAccountDto? _admin;

    public AuthService(ApiClient api, IHttpContextAccessor httpContext)
    {
        _api = api;
        _httpContext = httpContext;
    }

    public bool IsAuthenticated => !string.IsNullOrEmpty(_api.Token);

    public string? Email
    {
        get
        {
            if (IsAdmin) return _admin?.Email;
            try
            {
                var context = _httpContext.HttpContext;
                if (context is null) return null;
                return context.User?.Claims?.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            }
            catch { return null; }
        }
    }

    public bool IsAdmin => IsAuthenticated && _admin?.IsActive == true;
    public string? AdminAccessError { get; private set; }

    public async Task<bool> LoadAdminAsync(CancellationToken ct = default)
    {
        _admin = null;
        AdminAccessError = null;
        if (!IsAuthenticated) return false;
        try
        {
            var response = await _api.GetWithStatusAsync<AdminAccountDto>("/api/admin/auth/me", ct);
            if (response.Status is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
                return false;
            if (response.Status != System.Net.HttpStatusCode.OK || response.Data is null || string.IsNullOrWhiteSpace(response.Data.Id))
            {
                AdminAccessError = "Layanan verifikasi admin belum tersedia. Muat ulang atau coba lagi; akses tetap diblokir.";
                return false;
            }
            _admin = response.Data;
            return IsAdmin;
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            AdminAccessError = "Layanan verifikasi admin belum tersedia. Muat ulang atau coba lagi; akses tetap diblokir.";
            return false;
        }
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
        _admin = null;
        var context = _httpContext.HttpContext;
        if (context is null) return;
        context.Response.Cookies.Delete(ApiClient.TokenCookie);
    }

    public Task LogoutAsync(CancellationToken ct = default)
    {
        Logout();
        return Task.CompletedTask;
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
