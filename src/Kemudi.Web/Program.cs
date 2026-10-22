using Kemudi.Web.Components;
using Kemudi.Web.Services;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Akses HttpContext dari komponen & service (dipakai AuthService untuk cookie).
builder.Services.AddHttpContextAccessor();

// Klien HTTP ke backend API.
var apiBaseUrl = builder.Configuration["Api:BaseUrl"] ?? "http://localhost:5077";
if (!apiBaseUrl.EndsWith('/')) apiBaseUrl += "/";
builder.Services.AddHttpClient<ApiClient>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddScoped<AuthService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAntiforgery();

app.MapPost("/auth/session", (HttpContext context, SessionCookieRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Token))
        return Results.BadRequest(new { error = "Token wajib diisi." });

    context.Response.Cookies.Append(
        ApiClient.TokenCookie,
        request.Token,
        new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = context.Request.IsHttps,
            MaxAge = TimeSpan.FromDays(7)
        });

    return Results.NoContent();
});

app.MapDelete("/auth/session", (HttpContext context) =>
{
    context.Response.Cookies.Delete(ApiClient.TokenCookie);
    context.Response.Cookies.Delete("kemudi_session");
    return Results.NoContent();
});

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();

internal sealed record SessionCookieRequest(string Token);
