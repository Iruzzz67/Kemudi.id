using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using Kemudi.App.Data;
using Kemudi.Domain.Entities;
using AppDbContext = Kemudi.Infrastructure.Data.AppDbContext;
using Kemudi.Web.Components.Pages;
using Kemudi.Web.Services;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var failures = 0;
void Check(bool condition, string name)
{
    Console.WriteLine($"{(condition ? "PASS" : "FAIL")} {name}");
    if (!condition) failures++;
}

foreach (var type in new[] { "MOTOR", "MOBIL", "TRUK" })
    Check(VehicleData.ByType(type)?.Type == type, $"Vehicle lookup {type}");
Check(VehicleData.ByType("UNKNOWN") is null && VehicleData.ByType("mobil") is null,
    "Unknown and case-mismatched vehicle types remain null");

using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
    .UseSqlite("Data Source=:memory:").Options);
var comparer = (ValueComparer<double[]>)db.Model.FindEntityType(typeof(Vehicle))!
    .FindProperty(nameof(Vehicle.GearRatios))!.GetValueComparer()!;
var equal = comparer.EqualsExpression.Compile();
try
{
    Check(equal(null, null) && !equal(null, new[] { 1d }) && !equal(new[] { 1d }, null),
        "Gear ratio comparer handles both and either null operand");
}
catch (Exception error)
{
    Check(false, $"Gear ratio null operands: {error.GetType().Name}");
}
Check(equal(new[] { 3d, 2d }, new[] { 3d, 2d })
    && !equal(new[] { 3d, 2d }, new[] { 2d, 3d }), "Gear ratio equality is ordered and structural");
Check(comparer.GetHashCode(new[] { 3d, 2d }) == comparer.GetHashCode(new[] { 3d, 2d }),
    "Equal gear ratios have equal hashes");
var vehicle = new Vehicle { GearRatios = new[] { 3d, 2d, 1d } };
db.Attach(vehicle);
vehicle.GearRatios = new[] { 3d, 2d, 1d };
db.ChangeTracker.DetectChanges();
Check(!db.Entry(vehicle).Property(v => v.GearRatios).IsModified,
    "Replacing gear ratios with equal values does not mark modified");
vehicle.GearRatios[0] = 4d;
db.ChangeTracker.DetectChanges();
Check(db.Entry(vehicle).Property(v => v.GearRatios).IsModified
    && db.Entry(vehicle).Property(v => v.GearRatios).OriginalValue[0] == 3d,
    "In-place gear ratio mutation is tracked without mutating its snapshot");

// Local rendering fixture only: no real account, token, HTTP server or database writes.
var httpContext = new DefaultHttpContext();
httpContext.Request.Headers.Cookie = "kemudi_token=render-fixture";
httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
    { new Claim(ClaimTypes.Email, "admin@render.example.test") }, "render-fixture"));
await using var services = new ServiceCollection().AddLogging()
    .AddSingleton<IHttpContextAccessor>(new HttpContextAccessor { HttpContext = httpContext })
    .AddSingleton(new HttpClient(new CourseFixtureHandler()) { BaseAddress = new Uri("http://render.invalid") })
    .AddSingleton<ApiClient>().AddSingleton<AuthService>()
    .AddSingleton<NavigationManager, FixtureNavigation>()
    .BuildServiceProvider();
Check(!services.GetRequiredService<AuthService>().IsAdmin,
    "Admin-looking email and cookie do not imply a verified admin role");
Check(await services.GetRequiredService<AuthService>().LoadAdminAsync(),
    "Active backend admin profile enables admin UI access");
foreach (var profile in new[] { (HttpStatusCode.Forbidden, true), (HttpStatusCode.OK, false), (HttpStatusCode.ServiceUnavailable, true) })
{
    using var profileClient = new HttpClient(new AdminProfileFixtureHandler(profile.Item1, profile.Item2))
        { BaseAddress = new Uri("http://render.invalid") };
    var auth = new AuthService(new ApiClient(profileClient, services.GetRequiredService<IHttpContextAccessor>()),
        services.GetRequiredService<IHttpContextAccessor>());
    Check(!await auth.LoadAdminAsync() && !auth.IsAdmin
        && (profile.Item1 == HttpStatusCode.ServiceUnavailable ? auth.AdminAccessError is not null : auth.AdminAccessError is null),
        $"Denied or inactive backend admin profile stays non-admin ({profile.Item1}, active={profile.Item2})");
    if (profile.Item1 == HttpStatusCode.ServiceUnavailable)
    {
        await using var unavailableServices = new ServiceCollection().AddLogging().AddSingleton(auth)
            .AddSingleton<NavigationManager, FixtureNavigation>().BuildServiceProvider();
        await using var unavailableRenderer = new HtmlRenderer(unavailableServices, unavailableServices.GetRequiredService<ILoggerFactory>());
        var unavailableHtml = await unavailableRenderer.Dispatcher.InvokeAsync(async () =>
            (await unavailableRenderer.RenderComponentAsync<Kemudi.Web.Components.Layout.AdminLayout>(
                ParameterView.FromDictionary(new Dictionary<string, object?>
                {
                    ["Body"] = (RenderFragment)(builder => builder.AddContent(0, "PROTECTED_TEST_CONTENT"))
                }))).ToHtmlString());
        Check(unavailableHtml.Contains("Layanan verifikasi admin belum tersedia") && !unavailableHtml.Contains("PROTECTED_TEST_CONTENT"),
            "Admin outage renders an unavailable state without protected content or login redirect");
    }
}
await using var renderer = new HtmlRenderer(services, services.GetRequiredService<ILoggerFactory>());
var html = await renderer.Dispatcher.InvokeAsync(async () =>
    (await renderer.RenderComponentAsync<AdminKursus>(ParameterView.Empty)).ToHtmlString());
Check(html.Contains("<span class=\"badge badge-green\">Aktif</span>")
    && !html.Contains("<AdminBadge", StringComparison.OrdinalIgnoreCase),
    "Admin course page renders the status component instead of an unknown HTML tag");
failures += await PaymentSecurityTests.RunAsync();
failures += await PaymentPageTests.RunAsync();
Environment.ExitCode = failures == 0 ? 0 : 1;

sealed class FixtureNavigation : NavigationManager
{
    public FixtureNavigation() => Initialize("http://render.invalid/", "http://render.invalid/admin/kursus");
    protected override void NavigateToCore(string uri, bool forceLoad) =>
        throw new InvalidOperationException($"Unexpected fixture navigation: {uri}");
}

sealed class CourseFixtureHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
        Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(request.RequestUri!.AbsolutePath == "/api/admin/auth/me"
                ? "{\"id\":\"render-admin\",\"name\":\"Fixture\",\"email\":\"fixture@example.test\",\"isActive\":true}"
                : request.RequestUri.AbsolutePath.EndsWith("/packages")
                ? "[{\"id\":\"00000000-0000-0000-0000-000000000002\",\"label\":\"Fixture\",\"status\":\"ACTIVE\"}]"
                : "[]", System.Text.Encoding.UTF8, "application/json")
        });
}

sealed class AdminProfileFixtureHandler(HttpStatusCode status, bool active) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
        Task.FromResult(new HttpResponseMessage(status)
        {
            Content = JsonContent.Create(new { id = "fixture-admin", name = "Fixture", email = "fixture@example.test", isActive = active })
        });
}
