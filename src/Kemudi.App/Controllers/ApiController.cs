using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Kemudi.App.Data;
using Kemudi.App.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.App.Controllers;

[ApiController]
public class ApiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;

    public ApiController(AppDbContext db, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager)
    {
        _db = db;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    // ══════════════════════════════════════════════════════
    //  Auth endpoints (NextAuth-compatible + standard)
    // ══════════════════════════════════════════════════════

    [HttpGet("api/auth/csrf")]
    public IActionResult GetCsrf() => Ok(new { csrfToken = GenerateCsrfToken() });

    [HttpPost("api/auth/callback/credentials")]
    public async Task<IActionResult> SignInCredentials()
    {
        var form = await Request.ReadFormAsync();
        var email = form["email"].FirstOrDefault()?.Trim().ToLower() ?? "";
        var password = form["password"].FirstOrDefault() ?? "";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            var callbackUrl = form["callbackUrl"].FirstOrDefault() ?? "/login";
            return Redirect($"{callbackUrl}?error=CredentialsSignin");
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            var callbackUrl = form["callbackUrl"].FirstOrDefault() ?? "/login";
            return Redirect($"{callbackUrl}?error=CredentialsSignin");
        }

        var result = await _signInManager.PasswordSignInAsync(user, password, isPersistent: true, lockoutOnFailure: false);
        if (!result.Succeeded)
        {
            var callbackUrl = form["callbackUrl"].FirstOrDefault() ?? "/login";
            return Redirect($"{callbackUrl}?error=CredentialsSignin");
        }

        var cookieOptions = new CookieOptions
        {
            HttpOnly = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromDays(7)
        };
        Response.Cookies.Append("kemudi_session", JsonSerializer.Serialize(new
        {
            user = new { id = user.Id, name = user.DisplayName, email = user.Email }
        }), cookieOptions);

        var redirectUrl = form["callbackUrl"].FirstOrDefault() ?? "/dashboard";
        return Redirect(redirectUrl);
    }

    [HttpGet("api/auth/session")]
    public IActionResult GetSession()
    {
        if (Request.Cookies.TryGetValue("kemudi_session", out var sessionJson))
        {
            try
            {
                var session = JsonSerializer.Deserialize<JsonElement>(sessionJson);
                return Ok(session);
            }
            catch { }
        }
        return Ok(new { });
    }

    [HttpPost("api/auth/signout")]
    [HttpGet("api/auth/signout")]
    public new async Task<IActionResult> SignOut()
    {
        await _signInManager.SignOutAsync();
        Response.Cookies.Delete("kemudi_session");
        return Ok(new { url = "/login" });
    }

    // ══════════════════════════════════════════════════════
    //  Standard auth endpoints (register, login, me)
    // ══════════════════════════════════════════════════════

    [HttpPost("api/register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var name = req.Name?.Trim() ?? "";
        var email = req.Email?.Trim().ToLower() ?? "";
        var password = req.Password ?? "";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password) || password.Length < 6)
            return BadRequest(new { error = "Email valid dan password minimal 6 karakter diperlukan." });

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
            return Conflict(new { error = "Email sudah terdaftar." });

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            DisplayName = string.IsNullOrEmpty(name) ? null : name,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        return Ok(new { id = user.Id, email = user.Email });
    }

    [HttpPost("api/auth/login")]
    public async Task<IActionResult> Login([FromBody] LoginBody body)
    {
        var email = body.Email?.Trim().ToLower() ?? "";
        var password = body.Password ?? "";

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return Unauthorized(new { error = "Email atau password salah." });

        var result = await _signInManager.PasswordSignInAsync(user, password, isPersistent: true, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized(new { error = "Email atau password salah." });

        // Set session cookie for Blazor Server
        var cookieOptions = new CookieOptions
        {
            HttpOnly = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromDays(7)
        };
        Response.Cookies.Append("kemudi_session", JsonSerializer.Serialize(new
        {
            user = new { id = user.Id, name = user.DisplayName, email = user.Email }
        }), cookieOptions);

        return Ok(new
        {
            token = "session-" + user.Id,
            userId = user.Id,
            name = user.DisplayName,
            email = user.Email,
            expiresAt = DateTime.UtcNow.AddDays(7),
            isAdmin = await _userManager.IsInRoleAsync(user, "ADMIN")
        });
    }

    [HttpGet("api/auth/me")]
    public IActionResult GetMe()
    {
        if (Request.Cookies.TryGetValue("kemudi_session", out var sessionJson))
        {
            try
            {
                var doc = JsonSerializer.Deserialize<JsonElement>(sessionJson);
                var user = doc.GetProperty("user");
                return Ok(new
                {
                    id = user.GetProperty("id").GetString(),
                    name = user.TryGetProperty("name", out var n) ? n.GetString() : null,
                    email = user.GetProperty("email").GetString(),
                    createdAt = DateTime.UtcNow
                });
            }
            catch { }
        }
        return Unauthorized();
    }

    // ══════════════════════════════════════════════════════
    //  Static data endpoints
    // ══════════════════════════════════════════════════════

    [HttpGet("api/vehicles")]
    public IActionResult GetVehicles() => Ok(VehicleData.List);

    [HttpGet("api/courses")]
    public IActionResult GetCourses() => Ok(CourseData.Packages);

    [HttpGet("api/mentors")]
    public IActionResult GetMentors() => Ok(MentorData.List);

    [HttpGet("api/mentors/{id}")]
    public IActionResult GetMentor(string id)
    {
        var mentor = MentorData.ById(id);
        return mentor != null ? Ok(mentor) : NotFound();
    }

    // ══════════════════════════════════════════════════════
    //  Simulation Progress
    // ══════════════════════════════════════════════════════

    [HttpGet("api/progress")]
    [Authorize]
    public async Task<IActionResult> GetProgress()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var attempts = await _db.SimulationAttempts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(attempts.Select(a => new
        {
            a.Id, a.VehicleType, a.Score, a.TimeTakenMs,
            a.Violations, a.OffRoadCount, a.CollisionCount,
            a.Completed, a.CreatedAt
        }));
    }

    [HttpPost("api/progress")]
    [Authorize]
    public async Task<IActionResult> SubmitProgress([FromBody] SubmitSimulationRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var attempt = new SimulationAttempt
        {
            UserId = userId,
            VehicleType = req.VehicleType,
            Score = req.Score,
            TimeTakenMs = req.TimeTakenMs,
            Violations = req.Violations,
            OffRoadCount = req.OffRoadCount,
            CollisionCount = req.CollisionCount,
            Completed = req.Completed
        };

        _db.SimulationAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        return Ok(attempt);
    }

    // ══════════════════════════════════════════════════════
    //  Course Registration & Payment
    // ══════════════════════════════════════════════════════

    [HttpPost("api/course-registration")]
    public async Task<IActionResult> CreateCourseRegistration([FromBody] CourseRegistrationBody body)
    {
        var reg = new CourseRegistration
        {
            MentorId = Guid.TryParse(body.MentorId, out var mId) ? mId : Guid.Empty,
            CoursePackageId = body.CoursePackageId,
            Name = body.Name,
            Email = body.Email,
            Phone = body.Phone,
            NIK = body.NIK,
            Address = body.Address,
            PaymentMethod = body.PaymentMethod,
            Amount = CourseData.Packages.FirstOrDefault(p => p.Id == body.CoursePackageId)?.Price ?? 0,
            Status = "pending",
            StartDate = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _db.CourseRegistrations.Add(reg);
        await _db.SaveChangesAsync();

        return Ok(new CourseRegistrationResponse(
            reg.Id.ToString(), reg.MentorId.ToString(), reg.CoursePackageId,
            reg.Name, reg.Status, reg.Amount, reg.PaymentMethod, reg.StartDate, reg.CreatedAt));
    }

    [HttpGet("api/course-registration/{id}")]
    public async Task<IActionResult> GetCourseRegistration(string id)
    {
        if (!Guid.TryParse(id, out var guid)) return NotFound();
        var reg = await _db.CourseRegistrations.FindAsync(guid);
        if (reg == null) return NotFound();
        return Ok(new CourseRegistrationResponse(
            reg.Id.ToString(), reg.MentorId.ToString(), reg.CoursePackageId,
            reg.Name, reg.Status, reg.Amount, reg.PaymentMethod, reg.StartDate, reg.CreatedAt));
    }

    [HttpPost("api/payment")]
    public async Task<IActionResult> ConfirmPayment([FromBody] PaymentBody body)
    {
        if (!Guid.TryParse(body.RegistrationId, out var regId)) return BadRequest();
        var reg = await _db.CourseRegistrations.FindAsync(regId);
        if (reg == null) return NotFound();

        var payment = new Payment
        {
            RegistrationId = regId,
            Method = body.Method,
            Reference = body.Reference,
            Amount = reg.Amount,
            Status = "paid",
            PaidAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        reg.Status = "paid";
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(new PaymentResponse(
            payment.Id.ToString(), payment.RegistrationId.ToString(),
            payment.Method, payment.Status, payment.Reference, payment.Amount, payment.PaidAt));
    }

    // ══════════════════════════════════════════════════════
    //  Admin endpoints
    // ══════════════════════════════════════════════════════

    [HttpGet("api/admin/dashboard")]
    public async Task<IActionResult> AdminDashboard()
    {
        var totalUsers = await _db.Users.CountAsync();
        var newUsers7d = await _db.Users.CountAsync(u => u.CreatedAt > DateTime.UtcNow.AddDays(-7));
        var totalRegistrations = await _db.CourseRegistrations.CountAsync();
        var pendingRegistrations = await _db.CourseRegistrations.CountAsync(r => r.Status == "pending");
        var paidRegistrations = await _db.CourseRegistrations.CountAsync(r => r.Status == "paid");
        var totalMentors = MentorData.List.Count;
        var activeCourses = CourseData.Packages.Count;
        var totalRevenue = await _db.Payments.Where(p => p.Status == "paid").SumAsync(p => p.Amount);

        var recentRegs = await _db.CourseRegistrations
            .OrderByDescending(r => r.CreatedAt)
            .Take(5)
            .Select(r => new AdminRecentRegistrationDto(
                r.Id.ToString(), r.Name, r.Email, r.Status, r.Amount, r.CreatedAt))
            .ToListAsync();

        return Ok(new AdminDashboardDto(
            totalUsers, newUsers7d, totalRegistrations, pendingRegistrations,
            paidRegistrations, 0, totalMentors, activeCourses, totalRevenue,
            new AdminChartPoint[0], new AdminChartPoint[0],
            recentRegs.ToArray(), new AdminAuditLogDto[0]));
    }

    [HttpGet("api/admin/users")]
    public async Task<IActionResult> AdminUsers([FromQuery] string? q, [FromQuery] string? role)
    {
        var query = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u => u.Email!.Contains(q) || (u.DisplayName != null && u.DisplayName.Contains(q)));
        if (role == "ADMIN")
            query = query.Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == "ADMIN"));
        else if (role == "USER")
            query = query.Where(u => !_db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == "ADMIN"));

        var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync();
        return Ok(users.Select(u => new AdminUserDto(
            u.Id, u.DisplayName, u.Email!,
            _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == "ADMIN"),
            true,
            _db.CourseRegistrations.Count(r => r.Email == u.Email),
            u.CreatedAt)));
    }

    [HttpGet("api/admin/users/{id}")]
    public async Task<IActionResult> AdminUserDetail(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        return Ok(new AdminUserDetailDto(
            user.Id, user.DisplayName, user.Email!,
            await _userManager.IsInRoleAsync(user, "ADMIN"),
            true,
            _db.CourseRegistrations.Count(r => r.Email == user.Email),
            _db.SimulationAttempts.Count(a => a.UserId == user.Id),
            user.CreatedAt));
    }

    [HttpPatch("api/admin/users/{id}")]
    public async Task<IActionResult> AdminUpdateUser(string id, [FromBody] AdminUserUpdateRequest body)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        if (!string.IsNullOrEmpty(body.Role))
        {
            if (body.Role == "ADMIN")
                await _userManager.AddToRoleAsync(user, "ADMIN");
            else
                await _userManager.RemoveFromRoleAsync(user, "ADMIN");
        }
        return Ok();
    }

    [HttpGet("api/admin/auth/me")]
    public async Task<IActionResult> AdminGetMe()
    {
        if (Request.Cookies.TryGetValue("kemudi_session", out var sessionJson))
        {
            try
            {
                var doc = JsonSerializer.Deserialize<JsonElement>(sessionJson);
                var uid = doc.GetProperty("user").GetProperty("id").GetString();
                var user = uid != null ? await _userManager.FindByIdAsync(uid) : null;
                if (user != null)
                {
                    return Ok(new AdminAccountDto(
                        user.Id, user.DisplayName, user.Email!,
                        true, user.CreatedAt));
                }
            }
            catch { }
        }
        return Unauthorized();
    }

    [HttpPost("api/admin/login")]
    public async Task<IActionResult> AdminLogin([FromBody] LoginBody body)
    {
        var email = body.Email?.Trim().ToLower() ?? "";
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || body.Password == null || !(await _userManager.CheckPasswordAsync(user, body.Password)))
            return Unauthorized(new { error = "Email atau password salah." });

        var isAdmin = await _userManager.IsInRoleAsync(user, "ADMIN");
        if (!isAdmin) return Unauthorized(new { error = "Akun ini bukan admin." });

        await _signInManager.SignInAsync(user, isPersistent: true);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromDays(7)
        };
        Response.Cookies.Append("kemudi_session", JsonSerializer.Serialize(new
        {
            user = new { id = user.Id, name = user.DisplayName, email = user.Email, isAdmin = true }
        }), cookieOptions);

        return Ok(new { success = true });
    }

    [HttpGet("api/admin/mentors")]
    public IActionResult AdminMentors()
    {
        return Ok(MentorData.List.Select(m => new AdminMentorDto(
            Guid.NewGuid(), m.Name, m.Title, string.Join(",", m.VehicleTypes),
            m.ExperienceYears, m.Rating, m.StudentsTrained, m.Bio, "ACTIVE", m.Phone)));
    }

    [HttpGet("api/admin/courses")]
    public IActionResult AdminCourses()
    {
        return Ok(CourseData.Packages.GroupBy(p => p.VehicleType).Select(g =>
            new AdminCourseDto(Guid.NewGuid(), g.Key + " Course", g.Key.ToLower(),
                g.Key, "Kursus " + g.Key)));
    }

    [HttpGet("api/admin/courses/packages")]
    public IActionResult AdminCoursePackages()
    {
        return Ok(CourseData.Packages.Select(p =>
            new AdminCoursePackageDto(Guid.NewGuid(), Guid.NewGuid(), p.Id, p.Label, p.Level,
                p.Price, p.Sessions, p.SessionDurationMin, p.Description,
                string.Join("\n", p.Includes), "ACTIVE")));
    }

    [HttpGet("api/admin/stats")]
    public async Task<IActionResult> AdminStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        return Ok(new AdminStatsDto(
            totalUsers,
            await _db.Users.CountAsync(u => u.CreatedAt > DateTime.UtcNow.AddMonths(-1)),
            await _db.SimulationAttempts.Select(a => a.UserId).Distinct().CountAsync(),
            await _db.Payments.CountAsync(),
            await _db.Payments.Where(p => p.Status == "paid").SumAsync(p => p.Amount),
            await _db.Payments.CountAsync(p => p.Status == "pending"),
            await _db.Payments.CountAsync(p => p.Status == "paid"),
            await _db.Payments.CountAsync(p => p.Status == "rejected"),
            new[] { new AdminChartPoint("MOTOR", 0), new AdminChartPoint("MOBIL", 0), new AdminChartPoint("TRUK", 0) },
            new AdminChartPoint[0], 0, 0, 0));
    }

    // ── Helpers ──────────────────────────────────────────
    private static string GenerateCsrfToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    // ── DTOs ──────────────────────────────────────────────
    public record RegisterRequest(string? Name, string Email, string Password);
    public record LoginBody(string Email, string Password);
    public record SubmitSimulationRequest(string VehicleType, int Score, long TimeTakenMs, int Violations, int OffRoadCount, int CollisionCount, bool Completed);
    public record CourseRegistrationBody(string? MentorId, string CoursePackageId, string Name, string Email, string Phone, string NIK, string Address, string PaymentMethod);
    public record CourseRegistrationResponse(string Id, string MentorId, string CoursePackageId, string Name, string Status, decimal Amount, string PaymentMethod, DateTime StartDate, DateTime CreatedAt);
    public record PaymentBody(string RegistrationId, string Method, string? Reference);
    public record PaymentResponse(string Id, string RegistrationId, string Method, string Status, string? Reference, decimal Amount, DateTime? PaidAt);
}
