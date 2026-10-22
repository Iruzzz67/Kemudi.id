using System.Text;
using Kemudi.App.Data;
using Kemudi.App.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// EF Core + SQLite
var dbPath = builder.Configuration.GetConnectionString("KemudiDb") ?? "Data Source=kemudi.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(dbPath));

// DataProtection (required by Identity token providers)
builder.Services.AddDataProtection();

// TimeProvider (required by Identity in .NET 8+)
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);

// Authentication — Identity.Application scheme for SignInManager
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, options =>
    {
        options.LoginPath = "/login";
        options.LogoutPath = "/logout";
        options.AccessDeniedPath = "/login";
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
    });

// ASP.NET Core Identity
builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequiredLength = 6;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate + seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    await SeedData.InitializeAsync(scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true,
    DefaultContentType = "application/octet-stream"
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Fallback: serve route-specific HTML files, then index.html for unknown routes
app.MapFallback(async (HttpContext context) =>
{
    var path = context.Request.Path.Value?.TrimStart('/');
    if (!string.IsNullOrEmpty(path))
    {
        var htmlFile = Path.Combine(app.Environment.WebRootPath, $"{path}.html");
        if (File.Exists(htmlFile))
        {
            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.SendFileAsync(htmlFile);
            return;
        }
    }
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath, "index.html"));
});

app.Run();
