"use client";

import { useEffect, useState } from "react";
import { AdminTable, Td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { inputClass } from "@/components/admin/AdminForm";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  _count?: { attempts: number; registrations: number };
};

export function UsersTable({ currentAdminId }: { currentAdminId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, page]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      if (role) params.set("role", role);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Gagal memuat data.");
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal memperbarui pengguna.");
      }
      await load();
      if (detail?.id === id) setDetail({ ...detail, ...body } as AdminUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(null);
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
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama / email..."
          className={`${inputClass} max-w-xs`}
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Semua Role</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
        <span className="text-sm text-neutral-500">{total} pengguna</span>
      </div>

      <AdminTable
        columns={[
          { key: "name", label: "Nama" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
          { key: "date", label: "Registrasi" },
          { key: "actions", label: "Aksi", className: "text-right" },
        ]}
        rows={users}
        renderRow={(u) => (
          <>
            <Td>
              <div className="font-medium text-neutral-900 dark:text-white">{u.name || "—"}</div>
              {u.id === currentAdminId && (
                <div className="text-xs text-emerald-600">(akun Anda)</div>
              )}
            </Td>
            <Td className="text-neutral-600 dark:text-neutral-300">{u.email}</Td>
            <Td>
              <select
                value={u.role}
                disabled={busy === u.id || u.id === currentAdminId}
                onChange={(e) => patch(u.id, { role: e.target.value })}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Td>
            <Td>
              <StatusBadge status={u.active ? "active" : "inactive"} />
            </Td>
            <Td className="whitespace-nowrap text-neutral-500">
              {new Date(u.createdAt).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Td>
            <Td className="text-right">
              <button
                onClick={() => setDetail(u)}
                disabled={busy === u.id}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Detail
              </button>
              {u.id !== currentAdminId && (
                <button
                  onClick={() => setConfirmTarget(u)}
                  disabled={busy === u.id}
                  className="ml-2 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {u.active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              )}
            </Td>
          </>
        )}
      />

      {loading && <p className="mt-4 text-center text-sm text-neutral-400">Memuat...</p>}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Detail pengguna */}
      {detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDetail(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Detail Pengguna</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Nama</dt><dd className="font-medium">{detail.name || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Email</dt><dd className="font-medium">{detail.email}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Role</dt><dd><StatusBadge status={detail.role} /></dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Status</dt><dd><StatusBadge status={detail.active ? "active" : "inactive"} /></dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Registrasi</dt><dd className="font-medium">{new Date(detail.createdAt).toLocaleDateString("id-ID")}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Riwayat Simulasi</dt><dd className="font-medium">{detail._count?.attempts ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Pendaftaran Kursus</dt><dd className="font-medium">{detail._count?.registrations ?? "-"}</dd></div>
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.active ? "Nonaktifkan pengguna?" : "Aktifkan pengguna?"}
        message={
          confirmTarget
            ? `${confirmTarget.email} akan ${confirmTarget.active ? "dinonaktifkan (tidak bisa login)" : "diaktifkan kembali"}.`
            : ""
        }
        confirmLabel={confirmTarget?.active ? "Nonaktifkan" : "Aktifkan"}
        danger={confirmTarget?.active}
        busy={busy !== null}
        onConfirm={() => confirmTarget && patch(confirmTarget.id, { active: !confirmTarget.active }).then(() => setConfirmTarget(null))}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
