using System.Net.Http.Headers;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Antiforgery;

namespace Kemudi.Web.Services;

/// <summary>Same-origin browser gateway. JWT never leaves its HttpOnly cookie.</summary>
public static class BrowserApiEndpoints
{
    public static void MapBrowserApi(this WebApplication app)
    {
        app.MapGet("/api/session", (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Ok(new { requestToken = tokens.RequestToken });
        });
        app.MapPost("/api/session/login", (HttpContext context, IAntiforgery csrf,
            IHttpClientFactory factory, LoginRequest body) => Authenticate(context, csrf, factory, "login", body));
        app.MapPost("/api/session/register", (HttpContext context, IAntiforgery csrf,
            IHttpClientFactory factory, RegisterRequest body) => Authenticate(context, csrf, factory, "register", body));
        app.MapPost("/api/session/logout", async (HttpContext context, IAntiforgery csrf) =>
        {
            if (!await Validate(context, csrf)) return Results.BadRequest(new { error = "Sesi formulir berakhir. Muat ulang halaman." });
            context.Response.Cookies.Delete(ApiClient.TokenCookie, new CookieOptions { Path = "/" });
            return Results.Ok(new { success = true });
        });
        app.MapPost("/api/simulation/results", async (HttpContext context, IAntiforgery csrf,
            IHttpClientFactory factory, SubmitSimulationRequest body) =>
        {
            if (!await Validate(context, csrf)) return Results.BadRequest(new { error = "Sesi formulir berakhir. Coba simpan kembali." });
            return await Forward(context, factory, HttpMethod.Post, body);
        });
        app.MapGet("/api/simulation/results", (HttpContext context, IHttpClientFactory factory) =>
            Forward(context, factory, HttpMethod.Get));
    }

    private static async Task<bool> Validate(HttpContext context, IAntiforgery csrf)
    {
        try { await csrf.ValidateRequestAsync(context); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }

    private static async Task<IResult> Authenticate<T>(HttpContext context, IAntiforgery csrf,
        IHttpClientFactory factory, string action, T body)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (!await Validate(context, csrf)) return Results.BadRequest(new { error = "Sesi formulir berakhir. Coba lagi." });
        try
        {
            using var client = factory.CreateClient("BrowserBackend");
            using var response = await client.PostAsJsonAsync("/api/auth/" + action, body, context.RequestAborted);
            if (!response.IsSuccessStatusCode)
                return Results.Json(new { error = action == "login" ? "Email atau password salah." : "Pendaftaran gagal. Periksa data atau gunakan email lain." }, statusCode: (int)response.StatusCode);
            var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(context.RequestAborted);
            if (auth is null) return Results.StatusCode(502);
            context.Response.Cookies.Append(ApiClient.TokenCookie, auth.Token, new CookieOptions
            {
                HttpOnly = true, Secure = context.Request.IsHttps, SameSite = SameSiteMode.Lax,
                Path = "/", Expires = new DateTimeOffset(DateTime.SpecifyKind(auth.ExpiresAt, DateTimeKind.Utc))
            });
            return Results.Ok(new { success = true });
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            return Results.Json(new { error = "Backend belum dapat dihubungi. Coba lagi." }, statusCode: 503);
        }
    }

    private static async Task<IResult> Forward(HttpContext context, IHttpClientFactory factory,
        HttpMethod method, SubmitSimulationRequest? body = null)
    {
        context.Response.Headers.CacheControl = "no-store";
        var token = context.Request.Cookies[ApiClient.TokenCookie];
        if (string.IsNullOrEmpty(token)) return Results.Unauthorized();
        try
        {
            using var client = factory.CreateClient("BrowserBackend");
            using var request = new HttpRequestMessage(method, "/api/progress");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            if (body is not null) request.Content = JsonContent.Create(body);
            using var response = await client.SendAsync(request, context.RequestAborted);
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized) return Results.Unauthorized();
            if (!response.IsSuccessStatusCode)
                return Results.Json(new { error = "Hasil belum tersimpan. Periksa data lalu coba lagi." }, statusCode: (int)response.StatusCode);
            return Results.Content(await response.Content.ReadAsStringAsync(context.RequestAborted), "application/json");
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            return Results.Json(new { error = "Backend belum dapat dihubungi. Coba simpan kembali." }, statusCode: 503);
        }
    }
}
