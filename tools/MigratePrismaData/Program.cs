using System.Globalization;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Auth;
using Kemudi.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

// ===========================================================================
// Migrasi data dari database Next.js (Prisma, prisma/dev.db) ke database
// .NET (EF Core, src/Kemudi.Api/kemudi.db).
//
//   dotnet run --project tools/MigratePrismaData
//
// Catatan:
//  - Password bcrypt Prisma TIDAK kompatibel dengan hashing Identity (PBKDF2),
//    jadi akun impor diberi password default "password123".
//  - Mentor & paket kursus tidak diimpor (sudah ter-seed identik di EF).
//  - Aman dijalankan ulang: akun yang emailnya sudah ada dilewati, pendaftaran
//    & jadwal yang identik juga dilewati.
// ===========================================================================

const string DefaultPassword = "password123";

var root = FindRepoRoot();
var prismaPath = Path.Combine(root, "prisma", "dev.db");
var efPath = Path.Combine(root, "src", "Kemudi.Api", "kemudi.db");

if (!File.Exists(prismaPath)) { Console.Error.WriteLine($"Prisma DB tidak ditemukan: {prismaPath}"); return 1; }
if (!File.Exists(efPath)) { Console.Error.WriteLine($"EF DB tidak ditemukan: {efPath}"); return 1; }

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseSqlite($"Data Source={efPath}")
    .Options;

await using var db = new AppDbContext(options);
await using var src = new SqliteConnection($"Data Source={prismaPath}");
await src.OpenAsync();
await db.Database.EnsureCreatedAsync();

var report = new Report();
var passwordHasher = new PasswordHasher<ApplicationUser>();

// ---------------------------------------------------------------------------
// 1) Mentor & paket (referensi untuk mapping)
// ---------------------------------------------------------------------------
var mentors = await db.Mentors.AsNoTracking().ToDictionaryAsync(m => m.Slug, m => m);
var firstMentor = (await db.Mentors.AsNoTracking().FirstOrDefaultAsync());
var packages = await db.CoursePackages.AsNoTracking().ToListAsync();
var adminRoleId = await db.Roles
    .Where(r => r.Name == "Admin")
    .Select(r => r.Id)
    .FirstOrDefaultAsync();

// ---------------------------------------------------------------------------
// 2) Pengguna
// ---------------------------------------------------------------------------
var existingEmails = (await db.Users.AsNoTracking().Select(u => u.Email).ToListAsync())
    .Where(e => e != null).ToHashSet(StringComparer.OrdinalIgnoreCase);

Console.WriteLine("— Mengimpor pengguna —");
var prismaUsers = await QueryAsync(src,
    "SELECT id, name, email, role, active, createdAt FROM \"User\" ORDER BY createdAt");

var emailToNewUserId = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
foreach (var u in prismaUsers)
{
    var email = (string)u["email"];
    if (existingEmails.Contains(email))
    {
        Console.WriteLine($"  ⏭ {email} (sudah ada)");
        var existing = await db.Users.FirstAsync(x => x.Email == email);
        emailToNewUserId[email] = existing.Id;
        continue;
    }

    var user = new ApplicationUser
    {
        Id = Guid.NewGuid().ToString(),
        UserName = email,
        NormalizedUserName = email.ToUpperInvariant(),
        Email = email,
        NormalizedEmail = email.ToUpperInvariant(),
        EmailConfirmed = true,
        FullName = u["name"] as string,
        IsActive = ConvertToBool(u["active"]),
        CreatedAt = ConvertToDateTime(u["createdAt"]) ?? DateTime.UtcNow,
        SecurityStamp = Guid.NewGuid().ToString(),
        ConcurrencyStamp = Guid.NewGuid().ToString(),
        PasswordHash = passwordHasher.HashPassword(new ApplicationUser(), DefaultPassword)
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    if (string.Equals(u["role"] as string, "ADMIN", StringComparison.OrdinalIgnoreCase) &&
        !string.IsNullOrEmpty(adminRoleId))
    {
        db.UserRoles.Add(new IdentityUserRole<string> { UserId = user.Id, RoleId = adminRoleId });
        await db.SaveChangesAsync();
    }

    emailToNewUserId[email] = user.Id;
    Console.WriteLine($"  ✅ {email} ({(string.Equals(u["role"] as string, "ADMIN", StringComparison.OrdinalIgnoreCase) ? "ADMIN" : "USER")})");
    report.Users++;
}

// ---------------------------------------------------------------------------
// 3) Pendaftaran kursus
// ---------------------------------------------------------------------------
Console.WriteLine("\n— Mengimpor pendaftaran —");
var existingRegKeys = (await db.CourseRegistrations.AsNoTracking()
        .Select(r => r.Email + "|" + r.CreatedAt).ToListAsync())
    .ToHashSet();

var prismaRegs = await QueryAsync(src,
    "SELECT id, userId, mentorId, name, email, phone, nik, address, paymentMethod, amount, status, startDate, createdAt FROM CourseRegistration ORDER BY createdAt");

foreach (var r in prismaRegs)
{
    var email = (string)r["email"];
    var createdAt = ConvertToDateTime(r["createdAt"]) ?? DateTime.UtcNow;
    var key = email + "|" + createdAt.ToString("O", CultureInfo.InvariantCulture);
    if (existingRegKeys.Contains(key))
    {
        Console.WriteLine($"  ⏭ {email} @ {createdAt:yyyy-MM-dd HH:mm} (sudah ada)");
        continue;
    }

    // Mentor: cocokkan slug; fallback ke mentor pertama.
    var mentorSlug = r["mentorId"] as string ?? "";
    var mentor = mentors.GetValueOrDefault(mentorSlug) ?? firstMentor;
    if (mentor is null)
    {
        Console.WriteLine($"  ⚠ {email} dilewati (tidak ada mentor di EF)");
        continue;
    }

    // Paket: cocokkan harga; fallback ke paket pertama.
    var amount = Convert.ToDecimal(r["amount"], CultureInfo.InvariantCulture);
    var package = packages.FirstOrDefault(p => p.Price == amount) ?? packages.FirstOrDefault();

    var userId = r["userId"] as string;
    var userEmail = prismaUsers.FirstOrDefault(pu => string.Equals(pu["id"] as string, userId, StringComparison.Ordinal))?["email"] as string;

    var registration = new CourseRegistration
    {
        Id = Guid.NewGuid(),
        UserId = userEmail is not null && emailToNewUserId.TryGetValue(userEmail, out var nid) ? nid : string.Empty,
        CoursePackageId = package?.Id ?? Guid.Empty,
        MentorId = mentor.Id,
        Name = r["name"] as string ?? "",
        Email = email,
        Phone = r["phone"] as string ?? "",
        NIK = r["nik"] as string ?? "",
        Address = r["address"] as string ?? "",
        Status = ParseRegistrationStatus(r["status"] as string),
        PaymentMethod = ParsePaymentMethod(r["paymentMethod"] as string),
        StartDate = ParseStartDate(r["startDate"] as string) ?? createdAt,
        CreatedAt = createdAt
    };

    db.CourseRegistrations.Add(registration);

    // Pendaftaran "paid" → catat pembayaran berhasil (agar revenue konsisten).
    if (registration.Status == RegistrationStatus.Paid)
    {
        db.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(),
            RegistrationId = registration.Id,
            Method = registration.PaymentMethod,
            Status = PaymentStatus.Paid,
            Amount = amount,
            PaidAt = createdAt,
            CreatedAt = createdAt
        });
    }

    await db.SaveChangesAsync();
    Console.WriteLine($"  ✅ {email} ({registration.Status}) Rp {amount:N0}");
    report.Registrations++;
}

// ---------------------------------------------------------------------------
// 4) Jadwal
// ---------------------------------------------------------------------------
Console.WriteLine("\n— Mengimpor jadwal —");
var existingSchedules = (await db.Schedules.AsNoTracking().ToListAsync())
    .Select(s => s.MentorId + "|" + s.Date.ToString("O") + "|" + s.StartTime)
    .ToHashSet();

var prismaSchedules = await QueryAsync(src,
    "SELECT id, mentorId, date, startTime, endTime, vehicleType, location, totalSlots, filledSlots, status, createdAt, updatedAt FROM Schedule ORDER BY date");

foreach (var s in prismaSchedules)
{
    var mentor = mentors.GetValueOrDefault(s["mentorId"] as string ?? "") ?? firstMentor;
    if (mentor is null) continue;

    var date = ConvertToDateTime(s["date"]) ?? DateTime.UtcNow;
    var startTime = s["startTime"] as string ?? "08:00";
    var key = mentor.Id + "|" + date.ToString("O") + "|" + startTime;
    if (existingSchedules.Contains(key))
    {
        Console.WriteLine($"  ⏭ {date:yyyy-MM-dd} {startTime} ({mentor.Name}) sudah ada");
        continue;
    }

    db.Schedules.Add(new Schedule
    {
        Id = Guid.NewGuid(),
        MentorId = mentor.Id,
        Date = date,
        StartTime = startTime,
        EndTime = s["endTime"] as string ?? "10:00",
        VehicleType = Enum.TryParse<VehicleType>((s["vehicleType"] as string ?? ""), true, out var vt) ? vt : VehicleType.MOBIL,
        Location = s["location"] as string ?? "",
        TotalSlots = Convert.ToInt32(s["totalSlots"], CultureInfo.InvariantCulture),
        FilledSlots = Convert.ToInt32(s["filledSlots"], CultureInfo.InvariantCulture),
        Status = s["status"] as string ?? "AVAILABLE",
        CreatedAt = ConvertToDateTime(s["createdAt"]) ?? DateTime.UtcNow,
        UpdatedAt = ConvertToDateTime(s["updatedAt"]) ?? DateTime.UtcNow
    });

    await db.SaveChangesAsync();
    Console.WriteLine($"  ✅ {date:yyyy-MM-dd} {startTime}-{s["endTime"]} ({mentor.Name})");
    report.Schedules++;
}

// ---------------------------------------------------------------------------
// 5) Riwayat simulasi
// ---------------------------------------------------------------------------
Console.WriteLine("\n— Mengimpor riwayat simulasi —");
var prismaAttempts = await QueryAsync(src,
    "SELECT id, userId, vehicleType, score, timeTakenMs, violations, offRoadCount, completed, createdAt FROM SimulationAttempt ORDER BY createdAt");

var prismaUserEmailById = prismaUsers.ToDictionary(pu => pu["id"] as string ?? "", pu => pu["email"] as string ?? "");

foreach (var a in prismaAttempts)
{
    var oldUserId = a["userId"] as string ?? "";
    var userEmail = prismaUserEmailById.GetValueOrDefault(oldUserId);
    if (userEmail is null || !emailToNewUserId.TryGetValue(userEmail, out var newUserId))
    {
        Console.WriteLine($"  ⚠ attempt {a["id"]} dilewati (user tidak ditemukan)");
        continue;
    }

    db.SimulationAttempts.Add(new SimulationAttempt
    {
        Id = Guid.NewGuid(),
        UserId = newUserId,
        VehicleType = Enum.TryParse<VehicleType>((a["vehicleType"] as string ?? ""), true, out var vt) ? vt : VehicleType.MOBIL,
        Score = Convert.ToInt32(a["score"], CultureInfo.InvariantCulture),
        TimeTakenMs = Convert.ToInt64(a["timeTakenMs"], CultureInfo.InvariantCulture),
        Violations = Convert.ToInt32(a["violations"], CultureInfo.InvariantCulture),
        OffRoadCount = Convert.ToInt32(a["offRoadCount"], CultureInfo.InvariantCulture),
        Completed = ConvertToBool(a["completed"]),
        CreatedAt = ConvertToDateTime(a["createdAt"]) ?? DateTime.UtcNow
    });

    await db.SaveChangesAsync();
    Console.WriteLine($"  ✅ {userEmail} — {a["vehicleType"]} skor {a["score"]}");
    report.Attempts++;
}

// ---------------------------------------------------------------------------
// 6) Audit log
// ---------------------------------------------------------------------------
Console.WriteLine("\n— Mengimpor audit log —");
var existingAuditKeys = (await db.AuditLogs.AsNoTracking()
        .Select(l => l.AdminEmail + "|" + l.Action + "|" + l.CreatedAt).ToListAsync())
    .ToHashSet();

var prismaLogs = await QueryAsync(src,
    "SELECT id, adminId, adminEmail, action, target, targetId, metadata, createdAt FROM AuditLog ORDER BY createdAt");

foreach (var l in prismaLogs)
{
    var adminEmail = l["adminEmail"] as string ?? "";
    var createdAt = ConvertToDateTime(l["createdAt"]) ?? DateTime.UtcNow;
    var key = adminEmail + "|" + (l["action"] as string ?? "") + "|" + createdAt.ToString("O", CultureInfo.InvariantCulture);
    if (existingAuditKeys.Contains(key)) continue;

    db.AuditLogs.Add(new AuditLog
    {
        Id = Guid.NewGuid(),
        AdminId = emailToNewUserId.GetValueOrDefault(adminEmail),
        AdminEmail = adminEmail,
        Action = l["action"] as string ?? "",
        Target = l["target"] as string ?? "",
        TargetId = l["targetId"] as string,
        Metadata = l["metadata"] as string,
        CreatedAt = createdAt
    });

    await db.SaveChangesAsync();
    Console.WriteLine($"  ✅ {adminEmail} — {l["action"]}");
    report.AuditLogs++;
}

Console.WriteLine("\n==============================================");
Console.WriteLine($"Selesai. Impor: {report.Users} user, {report.Registrations} pendaftaran, " +
                  $"{report.Schedules} jadwal, {report.Attempts} simulasi, {report.AuditLogs} audit log.");
Console.WriteLine("Password akun impor (default): " + DefaultPassword);
Console.WriteLine("==============================================");
return 0;

// ===========================================================================
// Helper
// ===========================================================================

static async Task<List<Dictionary<string, object?>>> QueryAsync(SqliteConnection conn, string sql)
{
    using var cmd = conn.CreateCommand();
    cmd.CommandText = sql;
    await using var reader = await cmd.ExecuteReaderAsync();

    var rows = new List<Dictionary<string, object?>>();
    while (await reader.ReadAsync())
    {
        var row = new Dictionary<string, object?>();
        for (var i = 0; i < reader.FieldCount; i++)
        {
            var value = reader.GetValue(i);
            row[reader.GetName(i)] = value is DBNull ? null : value;
        }
        rows.Add(row);
    }
    return rows;
}

static DateTime? ConvertToDateTime(object? value) =>
    value switch
    {
        null => null,
        DateTime dt => dt,
        string s => DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var d) ? d : null,
        long unix => DateTimeOffset.FromUnixTimeMilliseconds(unix).UtcDateTime,
        _ => null
    };

static bool ConvertToBool(object? value) => value switch
{
    null => true,
    bool b => b,
    long i => i != 0,
    string s => s is "1" or "true" or "True",
    _ => true
};

static RegistrationStatus ParseRegistrationStatus(string? s) => s?.ToLowerInvariant() switch
{
    "paid" => RegistrationStatus.Paid,
    "rejected" => RegistrationStatus.Rejected,
    _ => RegistrationStatus.Pending
};

static PaymentMethod ParsePaymentMethod(string? s) => s?.ToLowerInvariant() switch
{
    "e-wallet" => PaymentMethod.EWallet,
    "cash" => PaymentMethod.Cash,
    _ => PaymentMethod.Transfer
};

static DateTime? ParseStartDate(string? s)
{
    if (string.IsNullOrWhiteSpace(s)) return null;
    if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var iso))
        return iso;
    // Format lama aplikasi Next.js: "20 Agu 2026"
    if (DateTime.TryParseExact(s, "dd MMM yyyy", CultureInfo.GetCultureInfo("id-ID"),
            DateTimeStyles.None, out var id))
        return id;
    return null;
}

static string FindRepoRoot()
{
    var dir = new DirectoryInfo(AppContext.BaseDirectory);
    while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "Kemudi.slnx")))
        dir = dir.Parent;
    return dir?.FullName ?? Directory.GetCurrentDirectory();
}

sealed class Report
{
    public int Users;
    public int Registrations;
    public int Schedules;
    public int Attempts;
    public int AuditLogs;
}
