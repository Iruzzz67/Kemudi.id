using System.IO;
using Kemudi.Simulation.Scene;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kemudi.Simulation.EditorTools
{
    /// <summary>
    /// PHASE 4-5 — membuat scene pertama secara otomatis di Unity Editor.
    ///
    /// Menu: <b>Kemudi → Create Main Scene</b>
    ///
    /// Membuat scene kosong (kamera + directional light bawaan Unity), lalu
    /// menempel <see cref="KemudiSceneBootstrap"/> — saat dijalankan (Play),
    /// seluruh hierarki simulasi (manager, input, track, kendaraan) dibangun
    /// dari kode. Scene disimpan ke <c>Assets/Scenes/Main.unity</c>.
    /// </summary>
    public static class KemudiSceneGenerator
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";

        [MenuItem("Kemudi/Create Main Scene")]
        public static void CreateMainScene()
        {
            EnsureFolder("Assets/Scenes");

            // Scene kosong dengan Main Camera + Directional Light bawaan.
            // (Nama scene diambil dari nama file saat SaveScene.)
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

            var bootstrapGo = new GameObject("KemudiSceneBootstrap");
            bootstrapGo.AddComponent<KemudiSceneBootstrap>();

            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"[Kemudi] Scene #1 dibuat: {ScenePath}. Tekan Play untuk menjalankan simulasi.");
        }

        [MenuItem("Kemudi/Open Main Scene")]
        public static void OpenMainScene()
        {
            if (!File.Exists(ScenePath))
            {
                Debug.LogWarning("[Kemudi] Scene belum ada. Jalankan Kemudi → Create Main Scene dulu.");
                return;
            }
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        }

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                var parent = Path.GetDirectoryName(path)!.Replace('\\', '/');
                var name = Path.GetFileName(path);
                if (!AssetDatabase.IsValidFolder(parent))
                    EnsureFolder(parent);
                AssetDatabase.CreateFolder(parent, name);
            }
        }
    }
}
