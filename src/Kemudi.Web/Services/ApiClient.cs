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

    public string? Token =>
        _httpContext.HttpContext?.Request.Cookies[TokenCookie];

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
    {
        using var request = CreateRequest(HttpMethod.Post, path, body);
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
