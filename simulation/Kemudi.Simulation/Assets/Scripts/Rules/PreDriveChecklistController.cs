using Kemudi.Simulation.Core;
using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Checklist pra-berkendara (§43) — bagian yang berasal dari tindakan
    /// pengemudi di kabin: sabuk/helm &amp; perlengkapan, atur kursi, atur spion.
    ///
    /// Item lain dicatat otomatis oleh sistem yang bersangkutan:
    ///   - Masuk kendaraan &amp; tutup pintu → SimulationManager.BeginPreDrive
    ///   - Mesin menyala, rem tangan, kopling, gigi satu → VehicleController
    ///
    /// Hanya aktif pada fase PreDrive (SIMULASI.md §5 langkah 4).
    /// </summary>
    public sealed class PreDriveChecklistController : MonoBehaviour
    {
        private SimulationManager _simulation = null!;
        private ChecklistManager _checklist = null!;

        public void Initialize(SimulationManager simulation, ChecklistManager checklist)
        {
            _simulation = simulation;
            _checklist = checklist;
        }

        private void Update()
        {
            if (_simulation == null || _checklist == null) return;
            if (_simulation.CurrentPhase != SimulationManager.Phase.PreDrive) return;

            // Perlengkapan pengendara: sabuk (Mobil/Truk) atau helm dkk (Motor).
            if (Down(KeyCode.B)) _checklist.MarkDone(ChecklistManager.Item.Seatbelt);
            if (Down(KeyCode.H)) _checklist.MarkDone(ChecklistManager.Item.Helmet);
            if (Down(KeyCode.J)) _checklist.MarkDone(ChecklistManager.Item.Jacket);
            if (Down(KeyCode.G)) _checklist.MarkDone(ChecklistManager.Item.Gloves);
            if (Down(KeyCode.F)) _checklist.MarkDone(ChecklistManager.Item.Boots);

            // Posisi duduk [ dan spion ] (sama dengan petunjuk HUD).
            if (Down(KeyCode.LeftBracket)) _checklist.MarkDone(ChecklistManager.Item.SeatAdjusted);
            if (Down(KeyCode.RightBracket) || Down(KeyCode.M))
                _checklist.MarkDone(ChecklistManager.Item.MirrorsAdjusted);
        }

        // 'Input' polos bentrok dengan namespace Kemudi.Simulation.Input.
        private static bool Down(KeyCode code) => UnityEngine.Input.GetKeyDown(code);
    }
}
