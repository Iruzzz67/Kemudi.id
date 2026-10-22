using System.Text.Json;
using Kemudi.Shared.DTOs;
using Microsoft.JSInterop;

namespace Kemudi.Web.Services;

/// <summary>
/// State autentikasi sisi server (Blazor Server). Token JWT disimpan di cookie
/// httpOnly <c>kemudi_token</c>; halaman membaca properti <see cref="IsAuthenticated"/>.
/// </summary>
public sealed class AuthService
{
    private readonly ApiClient _api;
    private readonly IHttpContextAccessor _httpContext;
    private readonly IJSRuntime _js;

    public AuthService(ApiClient api, IHttpContextAccessor httpContext, IJSRuntime js)
    {
        _api = api;
        _httpContext = httpContext;
        _js = js;
    }

    public bool IsAuthenticated => !string.IsNullOrEmpty(_api.Token) || HasSessionCookie;

    public string? Email
    {
        get
        {
            var session = GetSessionData();
            if (session == null) return null;
            try
            {
                var user = session.Value.GetProperty("user");
                return user.TryGetProperty("email", out var e) ? e.GetString() : null;
            }
            catch { return null; }
        }
    }

    public bool IsAdmin
    {
        get
        {
            var session = GetSessionData();
            if (session == null) return false;
            try
            {
                var user = session.Value.GetProperty("user");
                return user.TryGetProperty("isAdmin", out var admin) && admin.GetBoolean();
            }
            catch { return false; }
        }
    }

    private bool HasSessionCookie =>
        _httpContext.HttpContext?.Request.Cookies.ContainsKey("kemudi_session") == true;

    public async Task<(bool Success, string? Error, AuthResponse? Data)> LoginAsync(
        string email, string password, CancellationToken ct = default)
    {
        var result = await _api.PostAsync<LoginRequest, AuthResponse>(
            "/api/auth/login", new LoginRequest(email, password), ct);
        if (result is null) return (false, "Login gagal. Periksa email dan password.", null);

        await SetTokenCookieAsync(result.Token);
        return (true, null, result);
    }

    public async Task<(bool Success, string? Error)> LoginAdminAsync(
        string email, string password, CancellationToken ct = default)
    {
        var result = await _api.PostAsync<LoginBody, AuthResponse>(
            "/api/admin/login", new LoginBody(email, password), ct);
        if (result is null)
            return (false, "Login admin gagal. Pastikan akun memiliki role ADMIN.");

        await SetTokenCookieAsync(result.Token);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> RegisterAsync(
        string name, string email, string password, CancellationToken ct = default)
    {
        var result = await _api.PostAsync<RegisterRequest, AuthResponse>(
            "/api/auth/register", new RegisterRequest(name, email, password), ct);
        if (result is null) return (false, "Registrasi gagal. Email mungkin sudah terdaftar.");

        await SetTokenCookieAsync(result.Token);
        return (true, null);
    }

    public async Task LogoutAsync()
    {
        await _api.PostVoidAsync("/api/auth/signout", new { });
        await _js.InvokeVoidAsync("kemudiAuth.clearToken");
    }

    public async Task LogoutAsyncWithoutApi()
    {
        await _js.InvokeVoidAsync("kemudiAuth.clearToken");
    }

    private async Task SetTokenCookieAsync(string token)
    {
        await _js.InvokeVoidAsync("kemudiAuth.setToken", token);
    }

    private JsonElement? GetSessionData()
    {
        if (_httpContext.HttpContext?.Request.Cookies.TryGetValue("kemudi_session", out var json) != true)
            return null;
        try
        {
            return JsonSerializer.Deserialize<JsonElement>(json!);
        }
        catch { return null; }
    }

    // Internal DTOs
    private record LoginBody(string Email, string Password);
}
