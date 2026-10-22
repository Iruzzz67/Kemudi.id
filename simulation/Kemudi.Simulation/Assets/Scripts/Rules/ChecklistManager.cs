using System;
using System.Collections.Generic;
using Kemudi.Simulation.Vehicles;
using UnityEngine;

namespace Kemudi.Simulation.Rules
{
    /// <summary>
    /// Checklist pra-jalan (§43). Item inti per kategori kendaraan; item yang
    /// ditandai lewat input (B/H/J/G/F) atau dideteksi sistem lain (masuk
    /// kendaraan, mesin menyala, rem tangan dilepas, kursi/spion diatur).
    /// </summary>
    public sealed class ChecklistManager : MonoBehaviour
    {
        public enum Item
        {
            EnteredVehicle,     // Masuk kendaraan
            DoorClosed,         // Tutup pintu
            EngineOn,           // Nyalakan mesin
            HandbrakeReleased,  // Lepaskan rem tangan
            Seatbelt,           // Sabuk (Mobil/Truk)
            Helmet,             // Helm (Motor)
            Jacket,             // Jaket (Motor)
            Gloves,             // Sarung tangan (Motor)
            Boots,              // Sepatu (Motor)
            SeatAdjusted,       // Kursi (Mobil/Truk)
            MirrorsAdjusted,    // Spion (Mobil/Truk)
            ClutchEngaged,      // Kopling (Manual)
            FirstGearEngaged    // Gigi satu (Manual)
        }

        private readonly HashSet<Item> _done = new();

        /// <summary>Jenis kendaraan menentukan item mana yang wajib.</summary>
        public VehicleConfig.VehicleType VehicleType { get; set; } = VehicleConfig.VehicleType.Mobil;
        public bool ManualTransmission { get; set; }

        public event Action? ChecklistCompleted;

        public bool IsComplete => RequiredItems().TrueForAll(_done.Contains);

        public void Reset(VehicleConfig.VehicleType vehicleType, bool manualTransmission)
        {
            _done.Clear();
            VehicleType = vehicleType;
            ManualTransmission = manualTransmission;
        }

        public void MarkDone(Item item)
        {
            if (!_done.Add(item)) return;
            if (IsComplete) ChecklistCompleted?.Invoke();
        }

        public bool IsDone(Item item) => _done.Contains(item);

        /// <summary>Item wajib sesuai jenis kendaraan & transmisi (§43).</summary>
        public List<Item> RequiredItems()
        {
            var list = new List<Item>
            {
                Item.EnteredVehicle,
                Item.DoorClosed,
                Item.EngineOn,
                Item.HandbrakeReleased
            };

            switch (VehicleType)
            {
                case VehicleConfig.VehicleType.Motor:
                    list.Add(Item.Helmet);
                    list.Add(Item.Jacket);
                    list.Add(Item.Gloves);
                    list.Add(Item.Boots);
                    break;
                default: // Mobil & Truk
                    list.Add(Item.Seatbelt);
                    list.Add(Item.SeatAdjusted);
                    list.Add(Item.MirrorsAdjusted);
                    break;
            }

            if (ManualTransmission)
            {
                list.Add(Item.ClutchEngaged);
                list.Add(Item.FirstGearEngaged);
            }

            return list;
        }

        public string LabelOf(Item item) => item switch
        {
            Item.EnteredVehicle => "Masuk kendaraan",
            Item.DoorClosed => "Tutup pintu",
            Item.EngineOn => "Nyalakan mesin",
            Item.HandbrakeReleased => "Lepaskan rem tangan",
            Item.Seatbelt => "Pasang sabuk [B]",
            Item.Helmet => "Pakai helm [H]",
            Item.Jacket => "Pakai jaket [J]",
            Item.Gloves => "Sarung tangan [G]",
            Item.Boots => "Sepatu [F]",
            Item.SeatAdjusted => "Atur kursi",
            Item.MirrorsAdjusted => "Atur spion",
            Item.ClutchEngaged => "Injak kopling",
            Item.FirstGearEngaged => "Masukkan gigi satu",
            _ => item.ToString()
        };
    }
}
