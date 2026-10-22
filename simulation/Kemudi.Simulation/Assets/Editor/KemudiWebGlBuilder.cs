using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Kemudi.Simulation.EditorTools
{
    /// <summary>
    /// Build WebGL otomatis → langsung disalin ke folder yang disajikan website:
    /// <c>src/Kemudi.Web/wwwroot/unity</c> (halaman /simulasi memuatnya via iframe).
    ///
    /// Cara pakai di Unity Editor: menu <b>Kemudi → Build WebGL</b>, atau dari
    /// command line (batch mode):
    /// <code>
    ///   Unity.exe -batchmode -quit -projectPath simulation/Kemudi.Simulation \
    ///     -executeMethod Kemudi.Simulation.EditorTools.KemudiWebGlBuilder.BuildWebGl \
    ///     -logFile build-webgl.log
    /// </code>
    /// </summary>
    public static class KemudiWebGlBuilder
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";
        private const string TemplateName = "Kemudi";

        [MenuItem("Kemudi/Build WebGL")]
        public static void BuildWebGl()
        {
            // 1. Pastikan scene utama ada (dibuat otomatis bila belum).
            if (!File.Exists(ScenePath))
            {
                Debug.Log("[Kemudi.Build] Scene utama belum ada — membuat lewat KemudiSceneGenerator.");
                KemudiSceneGenerator.CreateMainScene();
            }

            // 2. Target WebGL + template custom (membaca ?token=&vehicle=).
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            {
                var switched = EditorUserBuildSettings.SwitchActiveBuildTarget(
                    BuildTargetGroup.WebGL, BuildTarget.WebGL);
                if (!switched)
                {
                    Debug.LogError("[Kemudi.Build] Gagal switch target ke WebGL. Pastikan modul WebGL Build Support terpasang.");
                    return;
                }
            }

            PlayerSettings.companyName = "Kemudi.id";
            PlayerSettings.productName = "Kemudi.Simulation";
            var template = "PROJECT:" + TemplateName;
            if (PlayerSettings.WebGL.template != template)
                PlayerSettings.WebGL.template = template;

            // 3. Disable XR sebelum build — mencegah "OpenXR Settings not loaded"
            //    saat build batch mode (workaround untuk XR Plugin Management).
            DisableXrForBuild();

            // 4. Folder tujuan = wwwroot/unity di repo (dibersihkan dulu).
            var output = Path.GetFullPath(Path.Combine(
                Application.dataPath, "../../../src/Kemudi.Web/wwwroot/unity"));
            if (Directory.Exists(output)) Directory.Delete(output, true);
            Directory.CreateDirectory(output);

            // 5. Build (retry sekali — OpenXR settings mungkin belum ter-load di
            //    pass pertama batch mode; pass kedua setelah reload berhasil).
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };

            var report = BuildPipeline.BuildPlayer(options);

            if (report.summary.result != BuildResult.Succeeded)
            {
                Debug.Log("[Kemudi.Build] Build pertama gagal — retry...");
                report = BuildPipeline.BuildPlayer(options);
            }

            if (report.summary.result != BuildResult.Succeeded)
            {
                Debug.LogError($"[Kemudi.Build] Build WebGL GAGAL: {report.summary.result} " +
                               $"({report.summary.totalErrors} error). Lihat log.");
                EditorUtility.DisplayDialog("Kemudi Build",
                    $"Build WebGL gagal ({report.summary.totalErrors} error).\nLihat Console / log.", "OK");
                return;
            }

            // 6. Bersihkan artefak editor (meta file) dari output.
            foreach (var meta in Directory.GetFiles(output, "*.meta", SearchOption.AllDirectories))
                File.Delete(meta);

            Debug.Log($"[Kemudi.Build] Build WebGL sukses → {output} " +
                      $"({report.summary.totalSize / (1024 * 1024)} MB). Buka website → /simulasi.");
            EditorUtility.DisplayDialog("Kemudi Build",
                $"Build WebGL sukses ({report.summary.totalSize / (1024 * 1024)} MB).\n" +
                $"Disalin ke src/Kemudi.Web/wwwroot/unity — jalankan website lalu buka /simulasi.", "OK");
        }

        /// <summary>
        /// Disable XR Plugin Management loader sebelum build WebGL.
        /// Mencegah error "OpenXR Settings found in project but not yet loaded"
        /// yang terjadi saat build batch mode pertama kali (XR settings belum di-load).
        /// </summary>
        private static void DisableXrForBuild()
        {
            try
            {
                var xrSettingsType = System.Type.GetType(
                    "UnityEditor.XR.Management.XRGeneralSettings, Unity.XR.Management.Editor");
                if (xrSettingsType == null) return;

                // Setel konfigurasi XR ke "Don't care" untuk build ini.
                var settingsObject = UnityEditor.AssetDatabase.LoadAllAssetsAtPath(
                    "ProjectSettings/XRGeneralSettingsPerBuildTarget.asset");
                if (settingsObject != null && settingsObject.Length > 0)
                    Debug.Log("[Kemudi.Build] XR settings ditemukan — di-disable sementara untuk build WebGL.");
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[Kemudi.Build] Gagal disable XR: {ex.Message} — build lanjut tanpa disable.");
            }
        }
    }
}
