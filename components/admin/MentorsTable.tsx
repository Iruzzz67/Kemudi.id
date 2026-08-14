"use client";

import { useEffect, useState } from "react";
import { AdminTable, Td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, inputClass } from "@/components/admin/AdminForm";

export type AdminMentor = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  phone: string | null;
  vehicleTypes: string; // CSV
  experienceYears: number;
  rating: number;
  studentsTrained: number;
  status: string;
};

const VEHICLE_OPTIONS = ["MOTOR", "MOBIL", "TRUK"] as const;
const EMPTY_FORM = {
  name: "",
  title: "",
  bio: "",
  phone: "",
  vehicleTypes: ["MOBIL"] as string[],
  experienceYears: "0",
  rating: "0",
  studentsTrained: "0",
  status: "ACTIVE",
};

export function MentorsTable() {
  const [mentors, setMentors] = useState<AdminMentor[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null);
  const [editing, setEditing] = useState<AdminMentor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMentor | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mentors?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error("Gagal memuat data.");
      const data = await res.json();
      setMentors(data.mentors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(m: AdminMentor) {
    setEditing(m);
    setForm({
      name: m.name,
      title: m.title,
      bio: m.bio || "",
      phone: m.phone || "",
      vehicleTypes: m.vehicleTypes.split(","),
      experienceYears: String(m.experienceYears),
      rating: String(m.rating),
      studentsTrained: String(m.studentsTrained),
      status: m.status,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const body = {
      ...form,
      experienceYears: Number(form.experienceYears),
      rating: Number(form.rating),
      studentsTrained: Number(form.studentsTrained),
    };
    try {
      const res = await fetch(editing ? `/api/admin/mentors/${editing.id}` : "/api/admin/mentors", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal menyimpan mentor.");
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
    setError(null);
    try {
      const res = await fetch(`/api/admin/mentors/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus mentor.");
      setDeleteTarget(null);
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama mentor..."
          className={`${inputClass} max-w-xs`}
        />
        <button
          onClick={openCreate}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Tambah Mentor
        </button>
      </div>

      <AdminTable
        columns={[
          { key: "name", label: "Nama Mentor" },
          { key: "spec", label: "Spesialisasi" },
          { key: "exp", label: "Pengalaman" },
          { key: "rating", label: "Rating" },
          { key: "students", label: "Murid" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Aksi", className: "text-right" },
        ]}
        rows={mentors}
        renderRow={(m) => (
          <>
            <Td>
              <div className="font-medium text-neutral-900 dark:text-white">{m.name}</div>
              <div className="text-xs text-neutral-500">{m.title}</div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {m.vehicleTypes.split(",").map((v) => (
                  <span key={v} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {v}
                  </span>
                ))}
              </div>
            </Td>
            <Td className="text-neutral-600 dark:text-neutral-300">{m.experienceYears} th</Td>
            <Td>⭐ {m.rating.toFixed(1)}</Td>
            <Td className="text-neutral-600 dark:text-neutral-300">{m.studentsTrained}</Td>
            <Td>
              <StatusBadge status={m.status} />
            </Td>
            <Td className="text-right">
              <button
                onClick={() => openEdit(m)}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(m)}
                className="ml-2 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Hapus
              </button>
            </Td>
          </>
        )}
      />
      {loading && <p className="mt-4 text-center text-sm text-neutral-400">Memuat...</p>}

      {/* Form tambah/edit */}
      {form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !busy && setForm(null)} aria-hidden />
          <form
            onSubmit={save}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
          >
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editing ? "Edit Mentor" : "Tambah Mentor"}
            </h3>
            <div className="mt-4 space-y-4">
              <Field label="Nama">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Jabatan">
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="Instruktur Senior Mobil & Motor" />
              </Field>
              <Field label="Deskripsi / Bio">
                <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telepon">
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </Field>
              </div>
              <div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Spesialisasi Kendaraan</span>
                <div className="mt-1 flex gap-3">
                  {VEHICLE_OPTIONS.map((v) => (
                    <label key={v} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={form.vehicleTypes.includes(v)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            vehicleTypes: e.target.checked
                              ? [...form.vehicleTypes, v]
                              : form.vehicleTypes.filter((x) => x !== v),
                          })
                        }
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Pengalaman (th)">
                  <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Rating (0-5)">
                  <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Murid">
                  <input type="number" min={0} value={form.studentsTrained} onChange={(e) => setForm({ ...form, studentsTrained: e.target.value })} className={inputClass} />
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
                {busy ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Mentor"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus mentor?"
        message={
          deleteTarget
            ? `Mentor "${deleteTarget.name}" beserta seluruh jadwalnya akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
