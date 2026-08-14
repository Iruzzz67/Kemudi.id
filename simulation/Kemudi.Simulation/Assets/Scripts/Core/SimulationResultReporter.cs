using System;
using System.Collections;
using Kemudi.Simulation.Rules;
using UnityEngine;
using UnityEngine.Networking;

namespace Kemudi.Simulation.Core
{
    /// <summary>
    /// Melaporkan hasil simulasi ke Kemudi.Api (§61-62).
    ///
    /// Alur: Blazor Website → Luncurkan Unity App → simulasi selesai →
    /// POST ke <c>{ApiBaseUrl}/api/progress</c> → Kemudi.Api → Database.
    ///
    /// JSON yang dikirim PERSIS mengikuti dokumen §62 (field lowercase):
    /// <code>
    /// {
    ///   "vehicleType": "MOBIL",      // MOTOR | MOBIL | TRUK
    ///   "score": 87,
    ///   "timeTakenMs": 92000,
    ///   "violations": 2,
    ///   "offRoadCount": 1,
    ///   "obstacleHits": 0,
    ///   "completed": true
    /// }
    /// </code>
    ///
    /// Skor TIDAK dipercaya mentah dari klien — API memvalidasi 0-100 (§8, §62).
    /// Standalone VR memakai API HTTPS langsung; build desktop bisa lewat
    /// launcher website. Token JWT didapat dari login (via API / Blazor).
    /// </summary>
    public sealed class SimulationResultReporter : MonoBehaviour
    {
        // Field lowercase agar JsonUtility menghasilkan key yang sama dgn §62
        // tanpa perlu kamus mapping manual.
        [Serializable]
        private sealed class ResultPayload
        {
            public string vehicleType = "MOBIL";
            public int score;
            public long timeTakenMs;
            public int violations;
            public int offRoadCount;
            public int obstacleHits;
            public bool completed;
        }

        [Serializable]
        private sealed class ApiError
        {
            public string error = "";
        }

        [Header("API Kemudi.Api (§61)")]
        [Tooltip("Base URL API. Dev: http://localhost:5077. Diisi aplikasi launcher / PlayerPrefs.")]
        [SerializeField] private string apiBaseUrl = "http://localhost:5077";
        [SerializeField] private string authToken = "";

        [Header("Sumber data hasil simulasi")]
        [SerializeField] private SimulationManager simulation = null!;
        [SerializeField] private Rules.ScoringSystem scoring = null!;
        [SerializeField] private ViolationSystem violations = null!;

        /// <summary>Sedang mengirim ke API (cegah kirim ganda).</summary>
        public bool SendInProgress { get; private set; }

        /// <summary>Konfigurasi endpoint + token (dipanggil launcher/login Unity).</summary>
        public void Configure(string baseUrl, string token)
        {
            apiBaseUrl = baseUrl;
            authToken = token;
        }

        /// <summary>
        /// Kirim hasil simulasi saat Finished/Failed. Nilai diambil dari
        /// SimulationManager (fase & waktu), ScoringSystem, ViolationSystem.
        /// </summary>
        public void SendResult()
        {
            if (SendInProgress || string.IsNullOrWhiteSpace(apiBaseUrl)) return;

            var payload = new ResultPayload
            {
                vehicleType = simulation != null
                    ? simulation.CurrentVehicleType.ToString().ToUpperInvariant()
                    : "MOBIL",
                score = scoring != null ? scoring.RoundedScore : 0,
                timeTakenMs = simulation != null ? (long)simulation.ElapsedMs : 0L,
                // violations = aturan lalu lintas SAJA (ObstacleHit dipisah,
                // konsisten dengan web: rintangan ≠ pelanggaran).
                violations = violations != null
                    ? violations.Count - violations.CountOf(ViolationSystem.ViolationType.ObstacleHit)
                    : 0,
                offRoadCount = violations != null ? violations.CountOf(ViolationSystem.ViolationType.OffRoad) : 0,
                obstacleHits = violations != null ? violations.CountOf(ViolationSystem.ViolationType.ObstacleHit) : 0,
                completed = scoring == null || !scoring.Failed
            };

            StartCoroutine(PostResult(payload));
        }

        private IEnumerator PostResult(ResultPayload payload)
        {
            SendInProgress = true;
            var url = apiBaseUrl.TrimEnd('/') + "/api/progress";

            using var request = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST);
            request.SetRequestHeader("Content-Type", "application/json");
            if (!string.IsNullOrEmpty(authToken))
                request.SetRequestHeader("Authorization", "Bearer " + authToken);

            var json = JsonUtility.ToJson(payload);
            request.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.timeout = 15;

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log($"[Kemudi.Result] Hasil terkirim ke API: {json}");
            }
            else
            {
                var message = request.downloadHandler != null ? request.downloadHandler.text : string.Empty;
                var error = string.IsNullOrWhiteSpace(message)
                    ? request.error
                    : JsonUtility.FromJson<ApiError>(message).error;
                Debug.LogWarning($"[Kemudi.Result] Gagal kirim hasil ({request.responseCode}): {error}");
            }

            SendInProgress = false;
        }
    }
}
