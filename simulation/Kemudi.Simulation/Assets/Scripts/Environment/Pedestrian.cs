using UnityEngine;

namespace Kemudi.Simulation.Environment
{
    /// <summary>
    /// Pejalan kaki sederhana (§38): state WAIT → CROSS → FINISH, bergerak
    /// dengan Vector3.MoveTowards — TANPA pathfinding. Satu pejalan kaki aktif
    /// per zebra cross. Update di-throttle ke 5 Hz oleh PedestrianManager.
    /// </summary>
    public sealed class Pedestrian : MonoBehaviour
    {
        public enum State { Waiting, Crossing, Finished }

        [Header("Perilaku")]
        [SerializeField] private float walkSpeed = 1.3f;
        [SerializeField] private float waitTime = 1.2f;

        public State CurrentState { get; private set; } = State.Waiting;
        public bool InRoad => CurrentState == State.Crossing;

        private Vector3 _sideA;
        private Vector3 _sideB;
        private Vector3 _target;
        private bool _headingToB;
        private float _timer;

        public void Setup(Vector3 sideA, Vector3 sideB)
        {
            _sideA = sideA;
            _sideB = sideB;
            transform.position = sideA;
            _headingToB = true;
            SetState(State.Waiting);
        }

        /// <summary>Dipanggil PedestrianManager ~5 kali/detik (§79).</summary>
        public void Tick(float delta)
        {
            switch (CurrentState)
            {
                case State.Waiting:
                    _timer -= delta;
                    if (_timer <= 0f) SetState(State.Crossing);
                    break;

                case State.Crossing:
                    transform.position = Vector3.MoveTowards(
                        transform.position, _target, walkSpeed * delta);
                    if (Vector3.Distance(transform.position, _target) < 0.05f)
                        SetState(State.Finished);
                    break;

                case State.Finished:
                    _timer -= delta;
                    if (_timer <= 0f)
                    {
                        // Berbalik ke sisi awal untuk menyeberang lagi.
                        _headingToB = !_headingToB;
                        SetState(State.Waiting);
                    }
                    break;
            }
        }

        private void SetState(State state)
        {
            CurrentState = state;
            _timer = state == State.Waiting || state == State.Finished ? waitTime : 0f;
            if (state == State.Crossing)
                _target = _headingToB ? _sideB : _sideA;
        }
    }
}
