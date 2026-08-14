"use client";

import { useEffect, useState } from "react";
import { AdminTable, Td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, inputClass } from "@/components/admin/AdminForm";

export type AdminSchedule = {
  id: string;
  mentorId: string;
  mentor?: { id: string; name: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  vehicleType: string;
  location: string;
  totalSlots: number;
  filledSlots: number;
  status: string;
};

export type MentorOption = { id: string; name: string };

const VEHICLE_OPTIONS = ["MOTOR", "MOBIL", "TRUK"];
const STATUS_OPTIONS = ["AVAILABLE", "FULL", "CANCELLED", "COMPLETED"];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM = {
  mentorId: "",
  date: todayStr(),
  startTime: "08:00",
  endTime: "10:00",
  vehicleType: "MOBIL",
  location: "Studio Kemudi.id — Kota Bogor",
  totalSlots: "4",
  status: "AVAILABLE",
};

export function SchedulesTable({ mentors }: { mentors: MentorOption[] }) {
  const [schedules, setSchedules] = useState<AdminSchedule[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null);
  const [editing, setEditing] = useState<AdminSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSchedule | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/schedules${statusFilter ? `?status=${statusFilter}` : ""}`);
      if (!res.ok) throw new Error("Gagal memuat data.");
      const data = await res.json();
      setSchedules(data.schedules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, mentorId: mentors[0]?.id ?? "" });
  }

  function openEdit(s: AdminSchedule) {
    setEditing(s);
    setForm({
      mentorId: s.mentorId,
      date: s.date.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      vehicleType: s.vehicleType,
      location: s.location,
      totalSlots: String(s.totalSlots),
      status: s.status,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/admin/schedules/${editing.id}` : "/api/admin/schedules", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, totalSlots: Number(form.totalSlots) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal menyimpan jadwal.");
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/schedules/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus jadwal.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const mentorName = (id: string) => mentors.find((m) => m.id === id)?.name ?? id;

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} max-w-xs`}
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Tambah Jadwal
        </button>
      </div>

      <AdminTable
        columns={[
          { key: "date", label: "Tanggal" },
          { key: "time", label: "Jam" },
          { key: "mentor", label: "Mentor" },
          { key: "vehicle", label: "Kendaraan" },
          { key: "location", label: "Lokasi" },
          { key: "slots", label: "Slot" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Aksi", className: "text-right" },
        ]}
        rows={schedules}
        renderRow={(s) => (
          <>
            <Td className="whitespace-nowrap">
              {new Date(s.date).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </Td>
            <Td className="whitespace-nowrap">{s.startTime} – {s.endTime}</Td>
            <Td>
              <span className="font-medium text-neutral-900 dark:text-white">{s.mentor?.name ?? mentorName(s.mentorId)}</span>
            </Td>
            <Td>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">{s.vehicleType}</span>
            </Td>
            <Td className="max-w-[180px] truncate text-neutral-600 dark:text-neutral-300">{s.location}</Td>
            <Td className="whitespace-nowrap">
              {s.filledSlots}/{s.totalSlots}
            </Td>
            <Td>
              <StatusBadge status={s.status} />
            </Td>
            <Td className="text-right">
              <button
                onClick={() => openEdit(s)}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(s)}
                className="ml-2 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Hapus
              </button>
            </Td>
          </>
        )}
      />
      {loading && <p className="mt-4 text-center text-sm text-neutral-400">Memuat...</p>}

      {form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !busy && setForm(null)} aria-hidden />
          <form
            onSubmit={save}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
          >
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editing ? "Edit Jadwal" : "Tambah Jadwal"}
            </h3>
            <div className="mt-4 space-y-4">
              <Field label="Mentor">
                <select required value={form.mentorId} onChange={(e) => setForm({ ...form, mentorId: e.target.value })} className={inputClass}>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tanggal">
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Kendaraan">
                  <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className={inputClass}>
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jam Mulai">
                  <input type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Jam Selesai">
                  <input type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Lokasi">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah Slot">
                  <input type="number" min={1} value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={busy}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Jadwal"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus jadwal?"
        message={deleteTarget ? `Jadwal ${new Date(deleteTarget.date).toLocaleDateString("id-ID")} akan dihapus.` : ""}
        confirmLabel="Hapus"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
