using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Infrastructure.Data;

public sealed class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<SimulationAttempt> SimulationAttempts => Set<SimulationAttempt>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CoursePackage> CoursePackages => Set<CoursePackage>();
    public DbSet<Mentor> Mentors => Set<Mentor>();
    public DbSet<CourseRegistration> CourseRegistrations => Set<CourseRegistration>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<TrainingSession> TrainingSessions => Set<TrainingSession>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        SeedData.Seed(builder);

        builder.Entity<SimulationAttempt>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Score).HasDefaultValue(0);
            e.Property(x => x.TimeTakenMs).HasDefaultValue(0);
            e.Property(x => x.Violations).HasDefaultValue(0);
            e.Property(x => x.OffRoadCount).HasDefaultValue(0);
            e.Property(x => x.ObstacleHits).HasDefaultValue(0);
            e.Property(x => x.Completed).HasDefaultValue(false);
            e.Property(x => x.VehicleType).HasConversion<string>();
            e.Property(x => x.TrainingMode)
                .HasConversion(
                    v => v == null ? null : v.Value.ToString(),
                    v => v == null ? (TrainingMode?)null : Enum.Parse<TrainingMode>(v));
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.CreatedAt);
        });

        builder.Entity<Vehicle>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Type).IsUnique();
            e.Property(x => x.Type).HasConversion<string>();
            // double[] disimpan sebagai CSV di SQLite/PostgreSQL
            var gearRatios = e.Property(x => x.GearRatios)
                .HasConversion(
                    v => string.Join(",", v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries)
                          .Select(double.Parse)
                          .ToArray());
            gearRatios.Metadata.SetValueComparer(
                new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<double[]>(
                    (a, b) => a.SequenceEqual(b),
                    v => v.Aggregate(0, (hash, d) => HashCode.Combine(hash, d)),
                    v => v.ToArray()));
        });

        builder.Entity<Course>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.VehicleType).HasConversion<string>();
        });

        builder.Entity<CoursePackage>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Level).HasConversion<string>();
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.HasOne(x => x.Course)
                .WithMany(c => c.Packages)
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Mentor>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        builder.Entity<CourseRegistration>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.Email);
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.PaymentMethod).HasConversion<string>();
            e.HasOne(x => x.CoursePackage)
                .WithMany()
                .HasForeignKey(x => x.CoursePackageId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Mentor)
                .WithMany(m => m.Registrations)
                .HasForeignKey(x => x.MentorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Payment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Method).HasConversion<string>();
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Registration)
                .WithMany(r => r.Payments)
                .HasForeignKey(x => x.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<TrainingSession>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.RegistrationId);
            e.HasOne(x => x.Registration)
                .WithMany()
                .HasForeignKey(x => x.RegistrationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
