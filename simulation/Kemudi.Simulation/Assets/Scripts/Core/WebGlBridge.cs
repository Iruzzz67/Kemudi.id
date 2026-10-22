namespace Kemudi.Simulation.Core
{
    /// <summary>
    /// Jembatan C# ↔ JS untuk build WebGL.
    ///
    /// Launcher Blazor (/simulasi) membuka build dengan query string:
    ///   /unity/index.html?token=JWT&vehicle=MOBIL
    /// Template WebGL (Assets/WebGLTemplates/Kemudi) membaca nilai tersebut dan
    /// menyimpannya ke <c>window.kemudiAuthToken</c> / <c>window.kemudiVehicleType</c>.
    /// Di editor / build desktop fungsi internal tidak ada → mengembalikan kosong.
    /// </summary>
    public static class WebGlBridge
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern string GetAuthToken();

        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern string GetVehicleType();
#else
        private static string GetAuthToken() => "";
        private static string GetVehicleType() => "";
#endif

        /// <summary>Token JWT dari query string launcher (kosong di editor/desktop).</summary>
        public static string AuthToken => GetAuthToken() ?? "";

        /// <summary>Jenis kendaraan dari query string (MOTOR/MOBIL/TRUK), kosong bila tidak ada.</summary>
        public static string VehicleType => (GetVehicleType() ?? "").ToUpperInvariant();
    }
}
