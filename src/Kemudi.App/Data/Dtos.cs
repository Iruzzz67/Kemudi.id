namespace Kemudi.App.Data;

// ===== User DTOs =====
public record AdminUserDto(string Id, string? Name, string Email, bool IsAdmin, bool IsActive, int Registrations, DateTime CreatedAt);
public record AdminUserDetailDto(string Id, string? Name, string Email, bool IsAdmin, bool IsActive, int Registrations, int Attempts, DateTime CreatedAt);
public record AdminUserUpdateRequest(string? Role, bool? IsActive);

// ===== Auth DTOs =====
public record UserProfileDto(string Id, string? Name, string Email, DateTime CreatedAt);
public record AdminAccountDto(string Id, string? Name, string Email, bool IsActive, DateTime CreatedAt);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// ===== Dashboard DTOs =====
public record AdminDashboardDto(
    int TotalUsers, int NewUsers7d, int TotalRegistrations, int PendingRegistrations,
    int PaidRegistrations, int RejectedRegistrations, int TotalMentors, int ActiveCourses,
    decimal TotalRevenue, AdminChartPoint[] RegistrationsChart, AdminChartPoint[] PaymentsChart,
    AdminRecentRegistrationDto[] RecentRegistrations, AdminAuditLogDto[] RecentAuditLogs);

public record AdminChartPoint(string Label, int Value);
public record AdminRecentRegistrationDto(string Id, string Name, string Email, string Status, decimal Amount, DateTime CreatedAt);
public record AdminAuditLogDto(string Id, string AdminEmail, string Action, string Target, DateTime CreatedAt);

// ===== Stats DTOs =====
public record AdminStatsDto(
    int TotalUsers, int NewUsersMonth, int UsersWithAttempts, int TotalTransactions,
    decimal TotalRevenue, int PendingPayments, int PaidPayments, int RejectedPayments,
    AdminChartPoint[] AttemptsByVehicle, AdminChartPoint[] RegistrationsByMentor,
    int RegistrationsToday, int RegistrationsWeek, int RegistrationsMonth);

// ===== Mentor DTOs =====
public record AdminMentorDto(Guid Id, string Name, string Title, string VehicleTypes, int ExperienceYears, double Rating, int StudentsTrained, string Bio, string Status, string? Phone);
public class AdminMentorUpsertRequest
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
}

// ===== Schedule DTOs =====
public record AdminScheduleDto(Guid Id, Guid MentorId, string MentorName, DateTime Date, string StartTime, string EndTime, string VehicleType, string Location, int TotalSlots, int FilledSlots, string Status);
public class AdminScheduleUpsertRequest
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
}

// ===== Registration DTOs =====
public record AdminRegistrationDto(Guid Id, string? UserId, string Name, string Email, string Phone, string NIK, string Address, string Status, string PaymentMethod, decimal Amount, DateTime StartDate, DateTime CreatedAt, string MentorName, string PackageLabel);
public record AdminRegistrationUpdateRequest(string Status);

// ===== Payment DTOs =====
public record AdminPaymentDto(Guid Id, Guid RegistrationId, string Method, string Status, decimal Amount, string? Reference, DateTime? PaidAt, DateTime CreatedAt, string RegistrantName, string RegistrantEmail, string RegistrationStatus);
public record AdminPaymentUpdateRequest(string Status);

// ===== Course DTOs =====
public record AdminCourseDto(Guid Id, string Title, string Slug, string VehicleType, string? Description);
public record AdminCoursePackageDto(Guid Id, Guid CourseId, string Slug, string Label, string Level, decimal Price, int Sessions, int SessionDurationMin, string Description, string Includes, string Status);
public class AdminCoursePackageUpsertRequest
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
}

// ===== Promotion =====
public record AdminPromoteRequest(string Email);
