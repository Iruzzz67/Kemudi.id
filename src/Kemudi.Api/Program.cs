using System.Text;
using System.Security.Claims;
using Kemudi.Infrastructure;
using Kemudi.Infrastructure.Auth;
using Kemudi.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
if (Encoding.UTF8.GetByteCount(jwt.SecretKey) < 32 ||
    (!builder.Environment.IsDevelopment() && jwt.SecretKey.StartsWith("KEMUDI-DEV-", StringComparison.Ordinal)))
    throw new InvalidOperationException("Konfigurasikan Jwt:SecretKey privat minimal 32 byte; kunci development tidak boleh dipakai di produksi.");
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
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var users = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
                var id = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var user = id is null ? null : await users.FindByIdAsync(id);
                if (user is null || !user.IsActive ||
                    (context.Principal!.IsInRole("Admin") && !await users.IsInRoleAsync(user, "Admin")))
                    context.Fail("Akun atau akses admin tidak lagi aktif.");
            }
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

// Auto-apply EF Core migrations on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

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
