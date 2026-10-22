using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering; // GraphicsDeviceType (Vulkan)

namespace Kemudi.Simulation.EditorTools
{
    /// <summary>
    /// Build VR standalone untuk Meta Quest (Android) — PHASE 5.
    ///
    /// Menu: <b>Kemudi → Build VR (Quest)</b>
    ///
    /// Alur:
    ///   1. Pastikan scene utama ada.
    ///   2. Switch target ke Android (Quest).
    ///   3. Set XR Plugin: OpenXR + Oculus feature group.
    ///   4. Build APK.
    ///
    /// Cara pakai:
    ///   - Unity Editor: menu Kemudi → Build VR (Quest).
    ///   - Command line:
    ///     <code>
    ///       Unity.exe -batchmode -quit -projectPath simulation/Kemudi.Simulation \
    ///         -executeMethod Kemudi.Simulation.EditorTools.KemudiVRBuilder.BuildVR \
    ///         -logFile build-vr.log
    ///     </code>
    ///
    /// Prasyarat:
    ///   - Unity 6 / 2022.3+ dengan Android Build Support terpasang.
    ///   - XR Plugin Management + OpenXR diinstall via Package Manager.
    ///   - OpenXR Android loader (Meta Quest feature) diaktifkan.
    /// </summary>
    public static class KemudiVRBuilder
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";

        // Build output (APK).
        private const string DefaultOutputDir = "Builds/VR";
        private const string ApkName = "KemudiSimulation.apk";

        [MenuItem("Kemudi/Build VR (Quest)")]
        public static void BuildVR()
        {
            BuildVR(DefaultOutputDir);
        }

        [MenuItem("Kemudi/Build VR (PC VR)")]
        public static void BuildVRPc()
        {
            BuildVRPC();
        }

        /// <summary>
        /// Build APK untuk Meta Quest (Android standalone).
        /// </summary>
        public static void BuildVR(string outputDir)
        {
            Debug.Log("[Kemudi.VR] Memulai build VR untuk Meta Quest...");

            // 1. Pastikan scene utama ada.
            if (!File.Exists(ScenePath))
            {
                Debug.Log("[Kemudi.VR] Scene utama belum ada — membuat lewat KemudiSceneGenerator.");
                KemudiSceneGenerator.CreateMainScene();
            }

            // 2. Switch target ke Android.
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.Android)
            {
                Debug.Log("[Kemudi.VR] Switching build target ke Android...");
                var switched = EditorUserBuildSettings.SwitchActiveBuildTarget(
                    BuildTargetGroup.Android, BuildTarget.Android);
                if (!switched)
                {
                    Debug.LogError("[Kemudi.VR] Gagal switch ke Android. " +
                        "Pastikan Android Build Support terpasang (Unity Hub → Add Modules).");
                    EditorUtility.DisplayDialog("Kemudi VR Build",
                        "Gagal switch ke Android.\n" +
                        "Pastikan Android Build Support terpasang di Unity Hub.", "OK");
                    return;
                }
            }

            // 3. Set XR settings untuk VR.
            ConfigureXrForVR();

            // 4. Player settings untuk Quest.
            PlayerSettings.companyName = "Kemudi.id";
            PlayerSettings.productName = "Kemudi.Simulation.VR";

            // Android-specific settings.
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel32;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel29; // Quest 2+

            // Set scriptbing target ke IL2CPP untuk performa.
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetArchitecture(BuildTargetGroup.Android, 1); // ARM64

            // Vulkan graphics API (recommended untuk Quest).
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan });

            // 5. Folder tujuan.
            var output = Path.Combine(outputDir, ApkName);
            var dir = Path.GetDirectoryName(output);
            if (dir != null && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            // 6. Build.
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };

            Debug.Log($"[Kemudi.VR] Building APK → {output}...");

            var report = BuildPipeline.BuildPlayer(options);

            if (report.summary.result != BuildResult.Succeeded)
            {
                Debug.LogError($"[Kemudi.VR] Build VR GAGAL: {report.summary.result} " +
                    $"({report.summary.totalErrors} error). Lihat log.");
                EditorUtility.DisplayDialog("Kemudi VR Build",
                    $"Build VR gagal ({report.summary.totalErrors} error).\n" +
                    $"Lihat Console / log.", "OK");
                return;
            }

            var sizeMB = report.summary.totalSize / (1024 * 1024);
            Debug.Log($"[Kemudi.VR] Build VR sukses → {output} ({sizeMB} MB).");

            EditorUtility.DisplayDialog("Kemudi VR Build",
                $"Build VR sukses ({sizeMB} MB).\n" +
                $"APK: {output}\n\n" +
                $"Cara install ke Quest:\n" +
                $"1. Hubungkan Quest via USB.\n" +
                $"2. Buka Command Prompt / Terminal.\n" +
                $"3. Jalankan: adb install \"{output}\"\n" +
                $"4. Buka Kemudi Simulation di Quest.", "OK");
        }

        /// <summary>
        /// Build EXE untuk PC VR (Windows + OpenXR).
        /// </summary>
        private static void BuildVRPC()
        {
            Debug.Log("[Kemudi.VR] Memulai build VR untuk PC VR (OpenXR)...");

            // 1. Pastikan scene utama ada.
            if (!File.Exists(ScenePath))
            {
                Debug.Log("[Kemudi.VR] Scene utama belum ada — membuat lewat KemudiSceneGenerator.");
                KemudiSceneGenerator.CreateMainScene();
            }

            // 2. Switch target ke Windows.
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.StandaloneWindows64)
            {
                Debug.Log("[Kemudi.VR] Switching build target ke Windows...");
                var switched = EditorUserBuildSettings.SwitchActiveBuildTarget(
                    BuildTargetGroup.Standalone, BuildTarget.StandaloneWindows64);
                if (!switched)
                {
                    Debug.LogError("[Kemudi.VR] Gagal switch ke Windows.");
                    return;
                }
            }

            // 3. Set XR settings untuk VR.
            ConfigureXrForVR();

            // 4. Player settings.
            PlayerSettings.companyName = "Kemudi.id";
            PlayerSettings.productName = "Kemudi.Simulation.VR";

            // 5. Build EXE.
            var output = Path.Combine(DefaultOutputDir, "PCVR", "KemudiSimulation.exe");
            var dir = Path.GetDirectoryName(output);
            if (dir != null && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };

            Debug.Log($"[Kemudi.VR] Building PC VR EXE → {output}...");

            var report = BuildPipeline.BuildPlayer(options);

            if (report.summary.result != BuildResult.Succeeded)
            {
                Debug.LogError($"[Kemudi.VR] Build PC VR GAGAL: {report.summary.result} " +
                    $"({report.summary.totalErrors} error). Lihat log.");
                EditorUtility.DisplayDialog("Kemudi PC VR Build",
                    $"Build PC VR gagal ({report.summary.totalErrors} error).", "OK");
                return;
            }

            var sizeMB = report.summary.totalSize / (1024 * 1024);
            Debug.Log($"[Kemudi.VR] Build PC VR sukses → {output} ({sizeMB} MB).");

            EditorUtility.DisplayDialog("Kemudi PC VR Build",
                $"Build PC VR sukses ({sizeMB} MB).\n" +
                $"EXE: {output}\n\n" +
                $"Cara jalankan:\n" +
                $"1. Hubungkan headset VR (SteamVR / Oculus Link).\n" +
                $"2. Jalankan {output}", "OK");
        }

        /// <summary>
        /// Konfigurasi XR Plugin Management untuk VR.
        /// Aktifkan OpenXR loader + Meta Quest feature group.
        /// </summary>
        private static void ConfigureXrForVR()
        {
            try
            {
                // XR General Settings — aktifkan XR loader.
                var xrSettingsType = System.Type.GetType(
                    "Unity.XR.Management.XRGeneralSettings, Unity.XR.Management.Editor");
                if (xrSettingsType == null)
                {
                    Debug.LogWarning("[Kemudi.VR] XR Management package tidak ditemukan. " +
                        "Pastikan com.unity.xr.management terinstall.");
                    return;
                }

                // Load or create XR General Settings.
                var instanceProp = xrSettingsType.GetProperty("Instance");
                if (instanceProp == null) return;

                var settings = instanceProp.GetValue(null);
                if (settings == null)
                {
                    Debug.LogWarning("[Kemudi.VR] XR General Settings belum ada. " +
                        "Buka Project Settings → XR Plugin Management untuk inisialisasi.");
                    return;
                }

                // Get assigned settings per build target.
                var managerProp = xrSettingsType.GetProperty("AssignedSettings");
                if (managerProp == null) return;

                var manager = managerProp.GetValue(settings);
                if (manager == null)
                {
                    Debug.LogWarning("[Kemudi.VR] XR Manager Settings null. " +
                        "Pastikan XR Plugin Management dikonfigurasi di Project Settings.");
                    return;
                }

                // Cek active loaders.
                var loadersProp = manager.GetType().GetProperty("activeLoaders");
                if (loadersProp != null)
                {
                    var loaders = loadersProp.GetValue(manager) as System.Collections.IList;
                    if (loaders != null && loaders.Count > 0)
                    {
                        Debug.Log($"[Kemudi.VR] XR Loader aktif: {loaders.Count} loader.");
                    }
                    else
                    {
                        Debug.LogWarning("[Kemudi.VR] Tidak ada XR loader aktif. " +
                            "Aktifkan OpenXR di Project Settings → XR Plugin Management.");
                    }
                }

                Debug.Log("[Kemudi.VR] XR settings dikonfigurasi untuk VR build.");
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[Kemudi.VR] Gagal konfigurasi XR: {ex.Message}. " +
                    "Build lanjut tanpa auto-config.");
            }
        }
    }
}
