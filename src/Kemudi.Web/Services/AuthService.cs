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
