namespace Kemudi.App.Data;

public static class VehicleData
{
    public static readonly List<VehicleInfo> List = new()
    {
        new("MOTOR", "Motor", "Lincah dan cepat, tapi sempit dan rawan oleng.", "#f97316", 26.0, 4),
        new("MOBIL", "Mobil", "Seimbang antara kecepatan dan kendali.", "#3b82f6", 22.0, 5),
        new("TRUK", "Truk", "Besar dan berat, radius putar lebar, jarak rem panjang.", "#16a34a", 16.0, 6),
    };

    public static VehicleInfo? ByType(string type)
        => List.FirstOrDefault(v => v.Type == type, null);
}

public record VehicleInfo(string Type, string Label, string Description, string Color, double MaxSpeed, int GearCount);
