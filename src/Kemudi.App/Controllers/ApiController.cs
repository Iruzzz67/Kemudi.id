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
    //  NextAuth-compatible endpoints (/api/auth/*)
    //  The static Next.js frontend expects these exact paths.
    // ══════════════════════════════════════════════════════

    /// <summary>
    /// NextAuth CSRF token — GET /api/auth/csrf
    /// </summary>
    [HttpGet("api/auth/csrf")]
    public IActionResult GetCsrf()
    {
        return Ok(new { csrfToken = GenerateCsrfToken() });
    }

    /// <summary>
    /// NextAuth sign-in — POST /api/auth/callback/credentials
    /// </summary>
    [HttpPost("api/auth/callback/credentials")]
    public async Task<IActionResult> SignInCredentials()
    {
        // NextAuth sends form-urlencoded: email, password, csrfToken, callbackUrl, json=true
        var form = await Request.ReadFormAsync();
        var email = form["email"].FirstOrDefault()?.Trim().ToLower() ?? "";
        var password = form["password"].FirstOrDefault() ?? "";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            // Return NextAuth-style redirect to login with error
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

        // Set a cookie-based session that the frontend can read from /api/auth/session
        var cookieOptions = new CookieOptions
        {
            HttpOnly = false, // Frontend JS reads this
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

    /// <summary>
    /// NextAuth session — GET /api/auth/session
    /// </summary>
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

    /// <summary>
    /// NextAuth signout — POST /api/auth/signout  +  GET /api/auth/signout
    /// </summary>
    [HttpPost("api/auth/signout")]
    [HttpGet("api/auth/signout")]
    public new async Task<IActionResult> SignOut()
    {
        await _signInManager.SignOutAsync();
        Response.Cookies.Delete("kemudi_session");
        return Ok(new { url = "/login" });
    }

    // ══════════════════════════════════════════════════════
    //  Register — POST /api/register
    // ══════════════════════════════════════════════════════

    [HttpPost("api/register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var name = req.Name?.Trim() ?? "";
        var email = req.Email?.Trim().ToLower() ?? "";
        var password = req.Password ?? "";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password) || password.Length < 6)
        {
            return BadRequest(new { error = "Email valid dan password minimal 6 karakter diperlukan." });
        }

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            return Conflict(new { error = "Email sudah terdaftar." });
        }

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

    // ══════════════════════════════════════════════════════
    //  Static data endpoints (used by the frontend)
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

    // ── Helpers ──────────────────────────────────────────

    private static string GenerateCsrfToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    // ── DTOs ──────────────────────────────────────────────

    public record RegisterRequest(string? Name, string Email, string Password);

    public record SubmitSimulationRequest(
        string VehicleType, int Score, long TimeTakenMs,
        int Violations, int OffRoadCount, int CollisionCount, bool Completed);
}
