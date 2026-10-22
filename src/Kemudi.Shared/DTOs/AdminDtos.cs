namespace Kemudi.Shared.DTOs;

// ===== Dashboard =====

public sealed record AdminDashboardDto(
    int TotalUsers,
    int NewUsers7d,
    int TotalRegistrations,
    int PendingRegistrations,
    int PaidRegistrations,
    int RejectedRegistrations,
    int TotalMentors,
    int ActiveCourses,
    decimal TotalRevenue,
    AdminChartPoint[] RegistrationsChart,
    AdminChartPoint[] PaymentsChart,
    AdminRecentRegistrationDto[] RecentRegistrations,
    AdminAuditLogDto[] RecentAuditLogs);

public sealed record AdminChartPoint(string Label, int Value);

public sealed record AdminRecentRegistrationDto(
    string Id,
    string Name,
    string Email,
    string Status,
    decimal Amount,
    DateTime CreatedAt);

public sealed record AdminAuditLogDto(
    string Id,
    string AdminEmail,
    string Action,
    string Target,
    DateTime CreatedAt);

// ===== Pengguna =====

public sealed record AdminUserDto(
    string Id,
    string? Name,
    string Email,
    bool IsAdmin,
    bool IsActive,
    int Registrations,
    DateTime CreatedAt);

public sealed record AdminUserDetailDto(
    string Id,
    string? Name,
    string Email,
    bool IsAdmin,
    bool IsActive,
    int Registrations,
    int Attempts,
    DateTime CreatedAt);

public sealed record AdminUserUpdateRequest(string? Role, bool? IsActive);

// ===== Mentor =====

public sealed record AdminMentorDto(
    Guid Id,
    string Name,
    string Title,
    string VehicleTypes,
    int ExperienceYears,
    double Rating,
    int StudentsTrained,
    string Bio,
    string Status,
    string? Phone);

/// <summary>Payload form mentor — class mutable agar bisa dipakai @bind di Blazor.</summary>
public sealed class AdminMentorUpsertRequest
{
    public string Name { get; set; } = "";
    public string Title { get; set; } = "";
    public string VehicleTypes { get; set; } = "";
    public int ExperienceYears { get; set; }
    public double Rating { get; set; }
    public int StudentsTrained { get; set; }
    public string Bio { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";
    public string? Phone { get; set; }

    public AdminMentorUpsertRequest() { }

    public AdminMentorUpsertRequest(
        string name, string title, string vehicleTypes, int experienceYears, double rating,
        int studentsTrained, string bio, string status, string? phone)
    {
        Name = name; Title = title; VehicleTypes = vehicleTypes;
        ExperienceYears = experienceYears; Rating = rating; StudentsTrained = studentsTrained;
        Bio = bio; Status = status; Phone = phone;
    }
}

// ===== Jadwal =====

public sealed record AdminScheduleDto(
    Guid Id,
    Guid MentorId,
    string MentorName,
    DateTime Date,
    string StartTime,
    string EndTime,
    string VehicleType,
    string Location,
    int TotalSlots,
    int FilledSlots,
    string Status);

/// <summary>Payload form jadwal — class mutable agar bisa dipakai @bind di Blazor.</summary>
public sealed class AdminScheduleUpsertRequest
{
    public Guid MentorId { get; set; }
    public DateTime Date { get; set; }
    public string StartTime { get; set; } = "08:00";
    public string EndTime { get; set; } = "10:00";
    public string VehicleType { get; set; } = "MOTOR";
    public string Location { get; set; } = "";
    public int TotalSlots { get; set; } = 4;
    public int FilledSlots { get; set; }
    public string Status { get; set; } = "AVAILABLE";

    public AdminScheduleUpsertRequest() { }

    public AdminScheduleUpsertRequest(
        Guid mentorId, DateTime date, string startTime, string endTime, string vehicleType,
        string location, int totalSlots, int filledSlots, string status)
    {
        MentorId = mentorId; Date = date; StartTime = startTime; EndTime = endTime;
        VehicleType = vehicleType; Location = location;
        TotalSlots = totalSlots; FilledSlots = filledSlots; Status = status;
    }
}

// ===== Pembayaran & Pendaftaran =====

public sealed record AdminPaymentDto(
    Guid Id,
    Guid RegistrationId,
    string Method,
    string Status,
    decimal Amount,
    string? Reference,
    DateTime? PaidAt,
    DateTime CreatedAt,
    string RegistrantName,
    string RegistrantEmail,
    string RegistrationStatus);

public sealed record AdminRegistrationDto(
    Guid Id,
    string? UserId,
    string Name,
    string Email,
    string Phone,
    string NIK,
    string Address,
    string Status,
    string PaymentMethod,
    decimal Amount,
    DateTime StartDate,
    DateTime CreatedAt,
    string MentorName,
    string PackageLabel);

public sealed record AdminRegistrationUpdateRequest(string Status); // pending | paid | rejected

public sealed record AdminPaymentUpdateRequest(string Status); // pending | paid | cancelled

// ===== Kursus =====

public sealed record AdminCourseDto(
    Guid Id,
    string Title,
    string Slug,
    string VehicleType,
    string? Description);

public sealed record AdminCoursePackageDto(
    Guid Id,
    Guid CourseId,
    string Slug,
    string Label,
    string Level,
    decimal Price,
    int Sessions,
    int SessionDurationMin,
    string Description,
    string Includes,
    string Status);

/// <summary>Payload form paket kursus — class mutable agar bisa dipakai @bind di Blazor.</summary>
public sealed class AdminCoursePackageUpsertRequest
{
    public Guid CourseId { get; set; }
    public string Slug { get; set; } = "";
    public string Label { get; set; } = "";
    public string Level { get; set; } = "Pemula";
    public decimal Price { get; set; }
    public int Sessions { get; set; } = 4;
    public int SessionDurationMin { get; set; } = 60;
    public string Description { get; set; } = "";
    public string Includes { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";

    public AdminCoursePackageUpsertRequest() { }

    public AdminCoursePackageUpsertRequest(
        Guid courseId, string slug, string label, string level, decimal price, int sessions,
        int sessionDurationMin, string description, string includes, string status)
    {
        CourseId = courseId; Slug = slug; Label = label; Level = level;
        Price = price; Sessions = sessions; SessionDurationMin = sessionDurationMin;
        Description = description; Includes = includes; Status = status;
    }
}

// ===== Statistik =====

public sealed record AdminStatsDto(
    int TotalUsers,
    int NewUsersMonth,
    int UsersWithAttempts,
    int TotalTransactions,
    decimal TotalRevenue,
    int PendingPayments,
    int PaidPayments,
    int RejectedPayments,
    AdminChartPoint[] AttemptsByVehicle,
    AdminChartPoint[] RegistrationsByMentor,
    int RegistrationsToday,
    int RegistrationsWeek,
    int RegistrationsMonth);

// ===== Pengaturan =====

/// <summary>Payload ganti password — class mutable agar bisa dipakai @bind di Blazor.</summary>
public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";

    public ChangePasswordRequest() { }

    public ChangePasswordRequest(string currentPassword, string newPassword)
    {
        CurrentPassword = currentPassword;
        NewPassword = newPassword;
    }
}

public sealed record AdminAccountDto(
    string Id,
    string? Name,
    string Email,
    bool IsActive,
    DateTime CreatedAt);

public sealed record AdminPromoteRequest(string Email);
