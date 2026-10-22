using System.Text;
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

// TimeProvider (required by Identity in .NET 8+)
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);

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

// Auto-create database + seed users
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    // Ensure Admin role exists
    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));

    // Seed admin user
    var adminEmail = "admin@kemudi.id";
    if (await userManager.FindByEmailAsync(adminEmail) is null)
    {
        var admin = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            FullName = "Admin Kemudi",
            IsActive = true
        };
        var result = await userManager.CreateAsync(admin, "admin123");
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(admin, "Admin");
            Console.WriteLine($"[Seed] Admin created: {adminEmail}");
        }
        else
        {
            Console.WriteLine($"[Seed] Failed to create admin: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }

    // Seed test user
    var testEmail = "test@kemudi.id";
    if (await userManager.FindByEmailAsync(testEmail) is null)
    {
        var testUser = new ApplicationUser
        {
            UserName = testEmail,
            Email = testEmail,
            FullName = "Test User",
            IsActive = true
        };
        var result = await userManager.CreateAsync(testUser, "test123");
        if (result.Succeeded)
            Console.WriteLine($"[Seed] Test user created: {testEmail}");
        else
            Console.WriteLine($"[Seed] Failed to create test user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
    }
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
