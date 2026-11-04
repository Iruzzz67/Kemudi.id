using Kemudi.Web.Components;
using Kemudi.Web.Services;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Akses HttpContext dari komponen & service (dipakai AuthService untuk cookie).
builder.Services.AddHttpContextAccessor();

// Klien HTTP ke backend API.
var apiBaseUrl = builder.Configuration["Api:BaseUrl"] ?? "http://localhost:5077";
builder.Services.AddHttpClient<ApiClient>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddScoped<AuthService>();
builder.Services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");
builder.Services.AddHttpClient("BrowserBackend", client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(15);
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = new FileExtensionContentTypeProvider
    {
        Mappings =
        {
            [".glb"] = "model/gltf-binary",
            [".gltf"] = "model/gltf+json",
        }
    }
});
app.UseAntiforgery();
app.MapBrowserApi();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
