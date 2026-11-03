using UnityEngine;
using UnityEngine.UI;

namespace Kemudi.Simulation.XR
{
    /// <summary>
    /// Dashboard world-space di dalam kabin (bukan floating HUD). Menampilkan
    /// speed, RPM, gigi, indikator lampu/sein, dan peringatan.
    /// </summary>
    public sealed class XRDashboard : MonoBehaviour
    {
        [SerializeField] private Text speedText = null!;
        [SerializeField] private Text gearText = null!;
        [SerializeField] private Image rpmFill = null!;
        [SerializeField] private Text warningText = null!;

        public void UpdateDashboard(float speedKmh, string gear, float rpmRatio, string? warning)
        {
            if (speedText != null) speedText.text = $"{Mathf.RoundToInt(speedKmh)} km/j";
            if (gearText != null) gearText.text = gear;
            if (rpmFill != null) rpmFill.fillAmount = Mathf.Clamp01(rpmRatio);
            if (warningText != null)
            {
                warningText.text = warning ?? string.Empty;
                warningText.gameObject.SetActive(!string.IsNullOrEmpty(warning));
            }
        }
    }
}
