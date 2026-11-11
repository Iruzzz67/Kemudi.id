using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using Kemudi.Api.Controllers;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

internal static class PaymentSecurityTests
{
    public static async Task<int> RunAsync()
    {
        var failures = 0;
        async Task Case(string name, Func<Task> test)
        {
            try { await test(); Console.WriteLine("PASS Payment: " + name); }
            catch (Exception error) { failures++; Console.WriteLine($"FAIL Payment: {name}: {error.GetType().Name}: {error.Message}"); }
        }

        await Case("customer endpoints require authorization, without anonymous override", () =>
        {
            foreach (var type in new[] { typeof(PaymentsController), typeof(CourseRegistrationController) })
            {
                Expect(type.GetCustomAttribute<AuthorizeAttribute>() is not null, type.Name + " requires Authorize");
                Expect(type.GetCustomAttribute<AllowAnonymousAttribute>() is null
                    && !type.GetMethods().Any(m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null),
                    type.Name + " must not allow anonymous access");
            }
            return Task.CompletedTask;
        });
        await Case("registration without an owner claim does not create an orphan", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var body = await f.RegistrationRequestAsync("cash");
            ExpectStatus(await User(new CourseRegistrationController(f.Db), null).Register(body), 401);
            Expect(await f.Db.CourseRegistrations.CountAsync() == 0, "No orphan registration");
        });
        foreach (var method in new string?[] { null, "bitcoin" })
            await Case("registration rejects invalid method " + (method ?? "null"), async () =>
            {
                await using var f = await Fixture.CreateAsync();
                var body = await f.RegistrationRequestAsync(method!);
                ExpectStatus(await User(new CourseRegistrationController(f.Db)).Register(body), 400);
                Expect(await f.Db.CourseRegistrations.CountAsync() == 0, "Invalid method must not persist");
            });
        await Case("registration details are visible only to their owner", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            ExpectStatus(await User(new CourseRegistrationController(f.Db), "other").GetById(r.Id), 404);
            ExpectStatus(await User(new CourseRegistrationController(f.Db)).GetById(r.Id), 200);
            r.UserId = "";
            await f.Db.SaveChangesAsync();
            ExpectStatus(await User(new CourseRegistrationController(f.Db)).GetById(r.Id), 404);
        });
        await Case("another user cannot submit payment for an owned registration", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            ExpectStatus(await User(new PaymentsController(f.Db), "other").Confirm(Request(r)), 404);
            Expect(await f.Db.Payments.CountAsync() == 0, "No foreign payment");
        });
        await Case("customer submission remains pending with trusted amount and no settlement date", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(Request(r)), 200);
            var p = await f.Db.Payments.SingleAsync();
            Expect(p.Status == PaymentStatus.Pending && p.PaidAt is null && r.Status == RegistrationStatus.Pending,
                "Customer assertion must never mean Paid");
            Expect(p.Amount == r.CoursePackage!.Price && p.Amount > 0, "Server package price is authoritative");
        });
        await Case("payment status lookup exposes only the registration owner's record", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            await f.PaymentAsync(r);
            var owned = Payment(await User(new PaymentsController(f.Db)).GetForRegistration(r.Id));
            Expect(owned.Status == "pending" && owned.PaidAt is null, "Readback accurately reports pending review");
            ExpectStatus(await User(new PaymentsController(f.Db), "other").GetForRegistration(r.Id), 404);
            ExpectStatus(await User(new PaymentsController(f.Db), null).GetForRegistration(r.Id), 401);
        });
        foreach (var reference in new[] { "", "ab", new string('x', 129) })
            await Case("digital reference validates length " + reference.Length, async () =>
            {
                await using var f = await Fixture.CreateAsync();
                var r = await f.RegistrationAsync();
                ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(Request(r, reference)), 400);
                Expect(await f.Db.Payments.CountAsync() == 0, "Invalid reference must not persist");
            });
        await Case("a client cannot override the registered method", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(new(r.Id.ToString(), "cash", null)), 409);
            Expect(await f.Db.Payments.CountAsync() == 0, "Mismatched method does not persist");
        });
        await Case("equivalent payment retry returns the same logical submission", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var c = User(new PaymentsController(f.Db));
            var first = Payment(await c.Confirm(Request(r)));
            var second = Payment(await c.Confirm(Request(r)));
            Expect(first.Id == second.Id && await f.Db.Payments.CountAsync() == 1, "Retry is idempotent");
        });
        await Case("retry cannot silently replace its reconciliation reference", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var c = User(new PaymentsController(f.Db));
            await c.Confirm(Request(r));
            ExpectStatus(await c.Confirm(Request(r, "changed-reference")), 409);
            Expect((await f.Db.Payments.SingleAsync()).Reference == "customer-transfer-001", "Original reference remains");
        });
        await Case("rejected registration cannot be reopened by a customer payment", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            r.Status = RegistrationStatus.Rejected;
            await f.Db.SaveChangesAsync();
            ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(Request(r)), 409);
            Expect(await f.Db.Payments.CountAsync() == 0 && r.Status == RegistrationStatus.Rejected, "Rejection remains intact");
        });
        await Case("cancelled payment cannot be customer-reopened", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            await f.PaymentAsync(r, PaymentStatus.Cancelled);
            ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(Request(r)), 409);
            Expect(await f.Db.Payments.CountAsync() == 1, "No replacement payment");
        });
        await Case("zero-priced package is not accepted as a payment amount", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            r.CoursePackage!.Price = 0;
            await f.Db.SaveChangesAsync();
            var result = await User(new PaymentsController(f.Db)).Confirm(Request(r));
            Expect(Status(result) is 400 or 409, "Invalid trusted amount must fail closed");
            Expect(await f.Db.Payments.CountAsync() == 0, "No zero-value payment");
        });
        await Case("legacy duplicate rows require reconciliation rather than automatic settlement", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var p = await f.PaymentAsync(r);
            f.Db.Payments.Add(new Payment { Registration = r, Method = r.PaymentMethod,
                Amount = r.CoursePackage!.Price, Reference = "legacy-duplicate", Status = PaymentStatus.Pending });
            await f.Db.SaveChangesAsync();
            ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(Request(r)), 409);
            ExpectStatus(await User(new AdminPaymentsController(f.Db), "admin").UpdateStatus(p.Id, AdminRequest("paid", "receipt-legacy")), 409);
            Expect(await f.Db.Payments.AllAsync(payment => payment.Status == PaymentStatus.Pending)
                && await f.Db.AuditLogs.CountAsync() == 0, "Ambiguous legacy records remain untouched");
        });
        await Case("admin settlement needs an independent reconciliation reference", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var p = await f.PaymentAsync(r);
            ExpectStatus(await User(new AdminPaymentsController(f.Db), "admin").UpdateStatus(p.Id, AdminRequest("paid")), 400);
            Expect(p.Status == PaymentStatus.Pending && await f.Db.AuditLogs.CountAsync() == 0, "No settlement or audit without verification");
        });
        await Case("verified admin settlement synchronizes statuses and is replay-safe", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var p = await f.PaymentAsync(r);
            var c = User(new AdminPaymentsController(f.Db), "admin");
            ExpectStatus(await c.UpdateStatus(p.Id, AdminRequest("paid", "bank-statement-001")), 200);
            var paidAt = p.PaidAt;
            Expect(p.Status == PaymentStatus.Paid && r.Status == RegistrationStatus.Paid && paidAt is not null, "Both statuses settled together");
            var audit = await f.Db.AuditLogs.SingleAsync();
            Expect(audit.AdminId == "admin" && audit.Action == "payment.confirm"
                && audit.Metadata!.Contains("bank-statement-001"), "Settlement audit identifies operator and reconciliation reference");
            ExpectStatus(await c.UpdateStatus(p.Id, AdminRequest("paid", "bank-statement-001")), 200);
            Expect(p.PaidAt == paidAt && await f.Db.AuditLogs.CountAsync() == 1, "Repeated confirmation changes neither date nor audit count");
            ExpectStatus(await c.UpdateStatus(p.Id, AdminRequest("paid", "different-bank-reference")), 409);
            Expect(p.PaidAt == paidAt && await f.Db.AuditLogs.CountAsync() == 1, "Conflicting replay cannot rewrite settled history");
            ExpectStatus(await User(new PaymentsController(f.Db)).Confirm(Request(r)), 200);
            Expect(await f.Db.Payments.CountAsync() == 1 && p.PaidAt == paidAt, "Customer retry cannot create a second paid payment");
        });
        await Case("inconsistent historical settlement cannot return a successful paid replay", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var registration = await f.RegistrationAsync();
            var payment = await f.PaymentAsync(registration, PaymentStatus.Paid);
            registration.Status = RegistrationStatus.Pending;
            await f.Db.SaveChangesAsync();
            ExpectStatus(await User(new AdminPaymentsController(f.Db), "admin")
                .UpdateStatus(payment.Id, AdminRequest("paid", payment.Reference)), 409);
            Expect(registration.Status == RegistrationStatus.Pending && !await f.Db.AuditLogs.AnyAsync(), "Do not silently rewrite historical inconsistencies");
        });
        foreach (var target in new[] { "pending", "cancelled" })
            await Case("settled payment cannot be reset to " + target, async () =>
            {
                await using var f = await Fixture.CreateAsync();
                var r = await f.RegistrationAsync();
                var p = await f.PaymentAsync(r, PaymentStatus.Paid);
                ExpectStatus(await User(new AdminPaymentsController(f.Db), "admin").UpdateStatus(p.Id, AdminRequest(target)), 409);
                Expect(p.Status == PaymentStatus.Paid && p.PaidAt is not null, "Financial history stays settled");
            });
        await Case("cancelled payment needs explicit reopen before settlement", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var p = await f.PaymentAsync(r, PaymentStatus.Cancelled);
            var c = User(new AdminPaymentsController(f.Db), "admin");
            ExpectStatus(await c.UpdateStatus(p.Id, AdminRequest("paid", "receipt-001")), 409);
            ExpectStatus(await c.UpdateStatus(p.Id, AdminRequest("pending")), 200);
            Expect(p.Status == PaymentStatus.Pending && p.PaidAt is null && r.Status == RegistrationStatus.Pending,
                "Explicit reopen restores only pending review");
        });
        await Case("registration endpoint cannot bypass payment reconciliation", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var c = User(new AdminRegistrationsController(f.Db), "admin");
            ExpectStatus(await c.UpdateStatus(r.Id, new("paid")), 409);
            Expect(await f.Db.Payments.CountAsync() == 0 && r.Status == RegistrationStatus.Pending, "No alternate paid path");
            await f.PaymentAsync(r);
            ExpectStatus(await c.UpdateStatus(r.Id, new("rejected")), 409);
            Expect(r.Status == RegistrationStatus.Pending, "Existing payment must be managed in payment workflow");
        });
        await Case("audit failure rolls back both settlement states", async () =>
        {
            await using var f = await Fixture.CreateAsync();
            var r = await f.RegistrationAsync();
            var p = await f.PaymentAsync(r);
            await f.Db.Database.ExecuteSqlRawAsync("CREATE TRIGGER fixture_audit_failure BEFORE INSERT ON AuditLogs BEGIN SELECT RAISE(ABORT, 'fixture audit unavailable'); END;");
            try { await User(new AdminPaymentsController(f.Db), "admin").UpdateStatus(p.Id, AdminRequest("paid", "receipt-atomic")); }
            catch (DbUpdateException) { }
            f.Db.ChangeTracker.Clear();
            Expect((await f.Db.Payments.SingleAsync()).Status == PaymentStatus.Pending
                && (await f.Db.CourseRegistrations.SingleAsync()).Status == RegistrationStatus.Pending
                && await f.Db.AuditLogs.CountAsync() == 0, "No partial settlement survives missing audit");
        });
        await Case("independent concurrent submissions persist one payment", ConcurrentSubmissionAsync);
        return failures;
    }

    private static async Task ConcurrentSubmissionAsync()
    {
        var file = Path.Combine(Path.GetTempPath(), "kemudi-payment-test-" + Guid.NewGuid().ToString("N") + ".db");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite("Data Source=" + file + ";Pooling=False;Default Timeout=30").Options;
        Guid registrationId;
        try
        {
            await using (var db = new AppDbContext(options))
            {
                await db.Database.EnsureCreatedAsync();
                registrationId = (await AddRegistrationAsync(db)).Id;
            }
            using var ready = new CountdownEvent(2);
            var go = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            async Task<PaymentDto> Submit()
            {
                await using var db = new AppDbContext(options);
                ready.Signal();
                await go.Task;
                return Payment(await User(new PaymentsController(db)).Confirm(new(registrationId.ToString(), "transfer", "customer-transfer-001")));
            }
            var first = Task.Run(Submit);
            var second = Task.Run(Submit);
            Expect(ready.Wait(TimeSpan.FromSeconds(10)), "Both independent requests reach the race barrier");
            go.SetResult();
            var results = await Task.WhenAll(first, second);
            await using var verify = new AppDbContext(options);
            Expect(results[0].Id == results[1].Id && await verify.Payments.CountAsync() == 1, "Concurrent calls return one logical record");
            Expect((await verify.Payments.SingleAsync()).Status == PaymentStatus.Pending, "Concurrent calls do not settle funds");
        }
        finally
        {
            // These exact freshly generated fixture files contain no credentials or user data.
            foreach (var suffix in new[] { "", "-wal", "-shm" }) File.Delete(file + suffix);
        }
    }

    private static T User<T>(T controller, string? userId = "owner") where T : ControllerBase
    {
        var claims = userId is null ? Array.Empty<Claim>() : new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Email, userId + "@fixture.example.test"),
            new Claim(ClaimTypes.Role, userId == "admin" ? "Admin" : "User")
        };
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext
            { User = new ClaimsPrincipal(new ClaimsIdentity(claims, userId is null ? null : "fixture")) } };
        return controller;
    }
    private static PaymentRequest Request(CourseRegistration r, string? reference = "customer-transfer-001") => new(r.Id.ToString(), "transfer", reference);
    private static AdminPaymentUpdateRequest AdminRequest(string status, string? reference = null) =>
        JsonSerializer.Deserialize<AdminPaymentUpdateRequest>(JsonSerializer.Serialize(new { Status = status, VerificationReference = reference }))!;
    private static PaymentDto Payment(IActionResult result)
    {
        ExpectStatus(result, 200);
        return (PaymentDto)((OkObjectResult)result).Value!;
    }
    private static int? Status(IActionResult result) => (result as IStatusCodeActionResult)?.StatusCode;
    private static void ExpectStatus(IActionResult result, int status) => Expect(Status(result) == status, $"Expected HTTP{status}, got {Status(result)}");
    private static void Expect(bool condition, string message) { if (!condition) throw new InvalidOperationException(message); }
    private static async Task<CourseRegistration> AddRegistrationAsync(AppDbContext db)
    {
        var r = new CourseRegistration
        {
            UserId = "owner", CoursePackage = await db.CoursePackages.FirstAsync(p => p.Price > 0),
            Mentor = await db.Mentors.FirstAsync(), Name = "Payment Fixture", Email = "owner@fixture.example.test",
            NIK = "0000000000000000", Address = "Fixture only", PaymentMethod = PaymentMethod.Transfer,
            Status = RegistrationStatus.Pending, StartDate = DateTime.UtcNow.AddDays(7)
        };
        db.CourseRegistrations.Add(r);
        await db.SaveChangesAsync();
        return r;
    }
    private sealed class Fixture : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        public AppDbContext Db { get; }
        private Fixture(SqliteConnection connection) { _connection = connection; Db = new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options); }
        public static async Task<Fixture> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var fixture = new Fixture(connection);
            await fixture.Db.Database.EnsureCreatedAsync();
            return fixture;
        }
        public Task<CourseRegistration> RegistrationAsync() => AddRegistrationAsync(Db);
        public async Task<CourseRegistrationRequest> RegistrationRequestAsync(string method) => new(
            (await Db.Mentors.FirstAsync()).Slug, (await Db.CoursePackages.FirstAsync(p => p.Price > 0)).Slug,
            "Fixture", "owner@fixture.example.test", "", "0000000000000000", "Fixture only", method);
        public async Task<Payment> PaymentAsync(CourseRegistration r, PaymentStatus status = PaymentStatus.Pending)
        {
            var p = new Payment { Id = r.Id, Registration = r, Method = r.PaymentMethod, Amount = r.CoursePackage!.Price,
                Reference = "customer-transfer-001", Status = status, PaidAt = status == PaymentStatus.Paid ? DateTime.UtcNow.AddMinutes(-1) : null };
            if (status == PaymentStatus.Paid) r.Status = RegistrationStatus.Paid;
            Db.Payments.Add(p);
            await Db.SaveChangesAsync();
            return p;
        }
        public async ValueTask DisposeAsync() { await Db.DisposeAsync(); await _connection.DisposeAsync(); }
    }
}
