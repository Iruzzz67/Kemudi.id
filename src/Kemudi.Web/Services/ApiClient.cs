using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Kemudi.Web.Services;

/// <summary>
/// Klien HTTP ke API backend (Kemudi.Api). Token JWT diambil dari cookie
/// <c>kemudi_token</c> dan disisipkan otomatis ke header Authorization.
/// </summary>
public sealed class ApiClient
{
    public const string TokenCookie = "kemudi_token";

    private readonly HttpClient _http;
    private readonly IHttpContextAccessor _httpContext;

    public ApiClient(HttpClient http, IHttpContextAccessor httpContext)
    {
        _http = http;
        _httpContext = httpContext;
    }

    // Token dicache dari cookie pada render awal (prerender) agar tetap tersedia
    // saat sirkuit Blazor Server berjalan (HttpContext null di dalam circuit).
    private string? _cachedToken;

    public string? Token
    {
        get
        {
            var fromCookie = _httpContext.HttpContext?.Request.Cookies[TokenCookie];
            if (!string.IsNullOrEmpty(fromCookie))
            {
                _cachedToken = fromCookie;
                return fromCookie;
            }
            return _cachedToken;
        }
    }

    public async Task<T?> GetAsync<T>(string path, CancellationToken ct = default)
    {
        using var request = CreateRequest(HttpMethod.Get, path);
        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return default;
        return await response.Content.ReadFromJsonAsync<T>(cancellationToken: ct);
    }

    public async Task<TResult?> PostAsync<TBody, TResult>(
        string path, TBody body, CancellationToken ct = default)
    {
        using var request = CreateRequest(HttpMethod.Post, path, body);
        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return default;
        return await response.Content.ReadFromJsonAsync<TResult>(cancellationToken: ct);
    }

    public async Task<(bool Success, string? Error)> PostVoidAsync<TBody>(
        string path, TBody body, CancellationToken ct = default)
        => await SendVoidAsync(HttpMethod.Post, path, body, ct);

    public async Task<(bool Success, string? Error)> PutVoidAsync<TBody>(
        string path, TBody body, CancellationToken ct = default)
        => await SendVoidAsync(HttpMethod.Put, path, body, ct);

    public async Task<(bool Success, string? Error)> PatchVoidAsync<TBody>(
        string path, TBody body, CancellationToken ct = default)
        => await SendVoidAsync(HttpMethod.Patch, path, body, ct);

    public async Task<(bool Success, string? Error)> DeleteVoidAsync(
        string path, CancellationToken ct = default)
        => await SendVoidAsync<object?>(HttpMethod.Delete, path, null, ct);

    private async Task<(bool Success, string? Error)> SendVoidAsync<TBody>(
        HttpMethod method, string path, TBody body, CancellationToken ct)
    {
        using var request = CreateRequest(method, path, body);
        using var response = await _http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode) return (true, null);

        var content = await response.Content.ReadAsStringAsync(ct);
        var error = string.Empty;
        try
        {
            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("error", out var err))
                error = err.GetString();
        }
        catch
        {
            error = content;
        }
        return (false, string.IsNullOrWhiteSpace(error) ? $"HTTP {(int)response.StatusCode}" : error);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path, object? body = null)
    {
        var request = new HttpRequestMessage(method, path);
        if (!string.IsNullOrEmpty(Token))
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", Token);

        if (body is not null)
        {
            request.Content = new StringContent(
                JsonSerializer.Serialize(body),
                Encoding.UTF8,
                "application/json");
        }

        return request;
    }
}
