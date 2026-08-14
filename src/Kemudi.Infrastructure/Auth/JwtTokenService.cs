using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Kemudi.Infrastructure.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Kemudi.Infrastructure.Auth;

/// <summary>Opsi konfigurasi JWT.</summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = "Kemudi.Api";
    public string Audience { get; set; } = "Kemudi.Clients";
    public string SecretKey { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 480; // 8 jam
}

/// <summary>Pembuat token JWT untuk autentikasi API & klien (Web/Unity).</summary>
public sealed class JwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options) => _options = options.Value;

    public string CreateToken(ApplicationUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id),
        };
        if (!string.IsNullOrEmpty(user.FullName))
            claims.Add(new Claim(ClaimTypes.Name, user.FullName));

        var now = DateTime.UtcNow;
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_options.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
