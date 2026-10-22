using Kemudi.Api.Controllers.Admin;
using Kemudi.Infrastructure.Auth;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Kemudi.Api.Controllers;

/// <summary>Autentikasi khusus admin — user biasa ditolak (403).</summary>
[ApiController]
[Route("api/admin/auth")]
public sealed class AdminAuthController : ControllerBase
{
    public const string AdminRole = "Admin";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _tokenService;
    private readonly JwtOptions _jwtOptions;
    private readonly AppDbContext _db;

    public AdminAuthController(
        UserManager<ApplicationUser> userManager,
        JwtTokenService tokenService,
        IOptions<JwtOptions> jwtOptions,
        AppDbContext db)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions.Value;
        _db = db;
    }

    /// <summary>Login admin. Hanya akun berperan Admin yang boleh login.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Email dan password wajib diisi." });

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { error = "Email atau password salah." });
        if (!user.IsActive)
            return Unauthorized(new { error = "Akun dinonaktifkan." });

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(AdminRole))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Akun ini tidak memiliki akses admin." });

        await AdminHelpers.LogAsync(_db, User, "auth.login", "admin");

        return Ok(new AuthResponse(
            Token: _tokenService.CreateToken(user, roles),
            UserId: user.Id,
            Name: user.FullName,
            Email: user.Email ?? string.Empty,
            ExpiresAt: DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiryMinutes),
            Roles: roles.ToArray()));
    }

    /// <summary>Profil admin yang sedang login.</summary>
    [HttpGet("me")]
    [Authorize(Roles = AdminRole)]
    [ProducesResponseType(typeof(AdminAccountDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me()
    {
        var userId = User.AdminId();
        if (userId is null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        return Ok(new AdminAccountDto(
            Id: user.Id,
            Name: user.FullName,
            Email: user.Email ?? string.Empty,
            IsActive: user.IsActive,
            CreatedAt: user.CreatedAt));
    }
}
