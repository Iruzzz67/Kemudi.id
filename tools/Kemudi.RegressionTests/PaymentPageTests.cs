using System.Net;
using System.Text;
using System.Text.Json;
using Kemudi.Shared.DTOs;
using Kemudi.Web.Components.Pages;
using Kemudi.Web.Services;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

internal static class PaymentPageTests
{
    public static async Task<int> RunAsync()
    {
        var failures = 0;
        foreach (var (name, status, body, configured, allowSubmission) in new[]
        {
            ("404 alone permits a new submission", HttpStatusCode.NotFound, "{}", true, true),
            ("409 reconciliation blocks further transfer instructions", HttpStatusCode.Conflict, "{}", true, false),
            ("503 outage blocks further transfer instructions", HttpStatusCode.ServiceUnavailable, "{}", true, false),
            ("401 blocks further transfer instructions", HttpStatusCode.Unauthorized, "{}", true, false),
            ("empty successful lookup blocks further transfer instructions", HttpStatusCode.OK, "null", true, false),
            ("malformed successful lookup blocks further transfer instructions", HttpStatusCode.OK, "not-json", true, false),
            ("unconfigured digital method has no fake account or enabled submission", HttpStatusCode.NotFound, "{}", false, false)
        })
        {
            try
            {
                var id = Guid.NewGuid().ToString();
                var context = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
                context.HttpContext.Request.Headers.Cookie = "kemudi_token=render-fixture";
                var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Payments:TransferInstructions"] = configured ? "<b>OFFICIAL_TEST_ONLY</b>" : null
                }).Build();
                await using var services = new ServiceCollection().AddLogging()
                    .AddSingleton<IConfiguration>(configuration).AddSingleton<IHttpContextAccessor>(context)
                    .AddSingleton(new HttpClient(new PaymentFixtureHandler(id, status, body)) { BaseAddress = new Uri("http://render.invalid") })
                    .AddSingleton<ApiClient>().AddSingleton<NavigationManager, FixtureNavigation>()
                    .BuildServiceProvider();
                await using var renderer = new HtmlRenderer(services, services.GetRequiredService<ILoggerFactory>());
                var html = await renderer.Dispatcher.InvokeAsync(async () =>
                    (await renderer.RenderComponentAsync<Payment>(ParameterView.FromDictionary(new Dictionary<string, object?>
                    {
                        [nameof(Payment.Registration)] = id
                    }))).ToHtmlString());
                var valid = allowSubmission
                    ? html.Contains("OFFICIAL_TEST_ONLY") && !html.Contains("<b>OFFICIAL_TEST_ONLY</b>")
                        && html.Contains("Ajukan verifikasi pembayaran") && !html.Contains("disabled")
                    : configured
                        ? html.Contains("Jangan mengulang transfer") && !html.Contains("OFFICIAL_TEST_ONLY")
                            && !html.Contains("Ajukan verifikasi pembayaran")
                        : html.Contains("belum dikonfigurasi") && html.Contains("disabled")
                            && !html.Contains("1234-5678-901") && !html.Contains("0812-3456-7890");
                Console.WriteLine($"{(valid ? "PASS" : "FAIL")} Payment UI: {name}");
                if (!valid) failures++;
            }
            catch (Exception error)
            {
                Console.WriteLine($"FAIL Payment UI: {name}: {error.GetType().Name}: {error.Message}");
                failures++;
            }
        }
        return failures;
    }

    private sealed class PaymentFixtureHandler(string id, HttpStatusCode status, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var registration = request.RequestUri!.AbsolutePath.StartsWith("/api/course-registration/");
            return Task.FromResult(new HttpResponseMessage(registration ? HttpStatusCode.OK : status)
            {
                Content = new StringContent(registration
                    ? JsonSerializer.Serialize(new CourseRegistrationDto(id, "mentor", "package", "Fixture", "pending", 500_000m, "transfer", DateTime.UtcNow, DateTime.UtcNow))
                    : body, Encoding.UTF8, "application/json")
            });
        }
    }
}
