using System.Text;
using Kemudi.Infrastructure;
using Kemudi.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Kemudi.Infrastructure: EF Core + Identity + JWT token service
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Kemudi.id API",
        Version = "v1",
        Description = "Backend untuk website dan simulasi mengemudi Kemudi.id."
    });

    // Dukungan tombol "Authorize" di Swagger untuk token JWT.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Masukkan token JWT di bawah. Contoh: {token}"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Autentikasi JWT
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
          ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt.SecretKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

// CORS — izinkan semua origin untuk development (Web Blazor & Unity build lokal).
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

// Pastikan role "Admin" dan akun admin awal selalu ada (dibuat bila belum).
await SeedAdminRoleAsync(app.Services, builder.Configuration);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

/// <summary>
/// Menjamin role "Admin" ada dan membuat akun admin default bila belum ada
/// (konfigurasi <c>Admin:Email</c>/<c>Admin:Password</c>, default
/// admin@kemudi.id / admin1234).
/// </summary>
static async Task SeedAdminRoleAsync(IServiceProvider services, IConfiguration configuration)
{
    using var scope = services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    if (!await roleManager.RoleExistsAsync(Kemudi.Api.Controllers.AdminAuthController.AdminRole))
    {
        await roleManager.CreateAsync(new IdentityRole(Kemudi.Api.Controllers.AdminAuthController.AdminRole));
    }

    var email = configuration["Admin:Email"] ?? "admin@kemudi.id";
    if (await userManager.FindByEmailAsync(email) is not null) return;

    var admin = new ApplicationUser
    {
        UserName = email,
        Email = email,
        FullName = "Admin Kemudi",
        IsActive = true
    };
    var password = configuration["Admin:Password"] ?? "admin1234";
    var result = await userManager.CreateAsync(admin, password);
    if (result.Succeeded)
    {
        await userManager.AddToRoleAsync(admin, Kemudi.Api.Controllers.AdminAuthController.AdminRole);
    }
}
