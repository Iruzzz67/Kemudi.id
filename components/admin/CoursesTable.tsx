"use client";

import { useEffect, useState } from "react";
import { AdminTable, Td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, inputClass } from "@/components/admin/AdminForm";

export type AdminCourse = {
  id: string;
  name: string;
  description: string;
  price: number;
  sessions: number;
  durationMin: number;
  vehicleType: string;
  level: string;
  status: string;
};

const VEHICLE_OPTIONS = ["MOTOR", "MOBIL", "TRUK"];
const LEVEL_OPTIONS = ["Pemula", "Menengah", "Mahir"];

function formatIdr(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  vehicleType: "MOBIL",
  level: "Pemula",
  price: "1200000",
  sessions: "8",
  durationMin: "60",
  status: "ACTIVE",
};

export function CoursesTable() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      if (!res.ok) throw new Error("Gagal memuat data.");
      const data = await res.json();
      setCourses(data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(c: AdminCourse) {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description,
      vehicleType: c.vehicleType,
      level: c.level,
      price: String(c.price),
      sessions: String(c.sessions),
      durationMin: String(c.durationMin),
      status: c.status,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const body = {
      ...form,
      price: Number(form.price),
      sessions: Number(form.sessions),
      durationMin: Number(form.durationMin),
    };
    try {
      const res = await fetch(editing ? `/api/admin/courses/${editing.id}` : "/api/admin/courses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal menyimpan kursus.");
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
      const res = await fetch(`/api/admin/courses/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus kursus.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(c: AdminCourse) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/courses/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">{courses.length} paket kursus</span>
        <button
          onClick={openCreate}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Tambah Kursus
        </button>
      </div>

      <AdminTable
        columns={[
          { key: "name", label: "Nama Kursus" },
          { key: "vehicle", label: "Kendaraan" },
          { key: "level", label: "Level" },
          { key: "price", label: "Harga" },
          { key: "duration", label: "Durasi" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Aksi", className: "text-right" },
        ]}
        rows={courses}
        renderRow={(c) => (
          <>
            <Td>
              <div className="font-medium text-neutral-900 dark:text-white">{c.name}</div>
              <div className="max-w-[220px] truncate text-xs text-neutral-500">{c.description}</div>
            </Td>
            <Td>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">{c.vehicleType}</span>
            </Td>
            <Td className="text-neutral-600 dark:text-neutral-300">{c.level}</Td>
            <Td className="font-medium whitespace-nowrap">{formatIdr(c.price)}</Td>
            <Td className="whitespace-nowrap text-neutral-600 dark:text-neutral-300">{c.sessions}x sesi · {c.durationMin} mnt</Td>
            <Td>
              <StatusBadge status={c.status} />
            </Td>
            <Td className="text-right">
              <button
                onClick={() => toggleStatus(c)}
                disabled={busy}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {c.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
              </button>
              <button
                onClick={() => openEdit(c)}
                className="ml-2 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(c)}
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
              {editing ? "Edit Kursus" : "Tambah Kursus"}
            </h3>
            <div className="mt-4 space-y-4">
              <Field label="Nama Kursus">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Deskripsi">
                <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jenis Kendaraan">
                  <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className={inputClass}>
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Level">
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass}>
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Harga (Rp)">
                  <input type="number" min={0} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Jumlah Sesi">
                  <input type="number" min={1} required value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Durasi (mnt)">
                  <input type="number" min={1} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </Field>
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
                {busy ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Kursus"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus kursus?"
        message={deleteTarget ? `Paket "${deleteTarget.name}" akan dihapus permanen.` : ""}
        confirmLabel="Hapus"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
