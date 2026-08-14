"use client";

import { useMemo, useState } from "react";
import { MENTORS } from "@/lib/kursus-data";
import { AdminTable, Td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export type AdminRegistration = {
  id: string;
  mentorId: string;
  name: string;
  email: string;
  phone: string | null;
  nik: string;
  address: string;
  paymentMethod: string;
  amount: number;
  status: string; // "pending" | "paid" | "rejected"
  startDate: string;
  createdAt: string;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  transfer: "Transfer Bank",
  "e-wallet": "E-Wallet / QRIS",
  cash: "Bayar di Tempat",
};

function formatIdr(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PendaftaranTable({
  registrations: initial,
}: {
  registrations: AdminRegistration[];
}) {
  const [registrations, setRegistrations] = useState(initial);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<AdminRegistration | null>(null);
  const [confirm, setConfirm] = useState<{ reg: AdminRegistration; to: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return registrations.filter((r) => {
      const matchesQuery =
        !query || r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [registrations, q, statusFilter]);

  const applyStatus = async (reg: AdminRegistration, to: string) => {
    setBusy(true);
    setError(null);
    // Optimistic update.
    setRegistrations((list) => list.map((r) => (r.id === reg.id ? { ...r, status: to } : r)));
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal memperbarui status.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setRegistrations((list) => list.map((r) => (r.id === reg.id ? { ...r, status: reg.status } : r)));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const mentorOf = (r: AdminRegistration) => MENTORS.find((m) => m.id === r.mentorId);

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / email..."
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Dikonfirmasi</option>
          <option value="rejected">Ditolak</option>
        </select>
        <span className="text-sm text-neutral-500">{rows.length} data</span>
      </div>

      <AdminTable
        columns={[
          { key: "date", label: "Tanggal" },
          { key: "name", label: "Nama" },
          { key: "course", label: "Kursus / Mentor" },
          { key: "method", label: "Metode" },
          { key: "amount", label: "Jumlah" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Aksi", className: "text-right" },
        ]}
        rows={rows}
        renderRow={(r) => {
          const mentor = mentorOf(r);
          return (
            <>
              <Td className="whitespace-nowrap text-neutral-500">{formatDate(r.createdAt)}</Td>
              <Td>
                <div className="font-medium text-neutral-900 dark:text-white">{r.name}</div>
                <div className="text-xs text-neutral-500">{r.email}</div>
              </Td>
              <Td>
                <div>{mentor ? mentor.name : r.mentorId}</div>
                <div className="text-xs text-neutral-500">Mulai: {r.startDate || "-"}</div>
              </Td>
              <Td className="text-neutral-600 dark:text-neutral-300">
                {PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod}
              </Td>
              <Td className="font-medium whitespace-nowrap">{formatIdr(r.amount)}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td className="text-right">
                <button
                  onClick={() => setDetail(r)}
                  className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Lihat
                </button>
              </Td>
            </>
          );
        }}
      />

      {/* Detail pendaftaran */}
      {detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDetail(null)} aria-hidden />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Detail Pendaftaran</h3>
                <div className="mt-1 text-xs text-neutral-500">ID: {detail.id}</div>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-100 p-4 dark:border-neutral-800">
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Data Peserta</h4>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="text-neutral-500">Nama</dt><dd className="font-medium">{detail.name}</dd></div>
                  <div><dt className="text-neutral-500">Email</dt><dd className="font-medium">{detail.email}</dd></div>
                  <div><dt className="text-neutral-500">Telepon</dt><dd className="font-medium">{detail.phone || "-"}</dd></div>
                  <div><dt className="text-neutral-500">NIK</dt><dd className="font-medium">{detail.nik}</dd></div>
                  <div><dt className="text-neutral-500">Alamat</dt><dd className="font-medium">{detail.address}</dd></div>
                </dl>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-neutral-100 p-4 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Data Kursus</h4>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div><dt className="text-neutral-500">Mentor</dt><dd className="font-medium">{mentorOf(detail)?.name ?? detail.mentorId}</dd></div>
                    <div><dt className="text-neutral-500">Jadwal Mulai</dt><dd className="font-medium">{detail.startDate || "-"}</dd></div>
                  </dl>
                </div>
                <div className="rounded-lg border border-neutral-100 p-4 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Data Pembayaran</h4>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div><dt className="text-neutral-500">Nominal</dt><dd className="font-medium">{formatIdr(detail.amount)}</dd></div>
                    <div><dt className="text-neutral-500">Metode</dt><dd className="font-medium">{PAYMENT_METHOD_LABEL[detail.paymentMethod] ?? detail.paymentMethod}</dd></div>
                    <div><dt className="text-neutral-500">Status</dt><dd><StatusBadge status={detail.status} /></dd></div>
                  </dl>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Kembali
              </button>
              {detail.status !== "paid" && (
                <button
                  onClick={() => setConfirm({ reg: detail, to: "paid" })}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Konfirmasi Pembayaran
                </button>
              )}
              {detail.status !== "rejected" && (
                <button
                  onClick={() => setConfirm({ reg: detail, to: "rejected" })}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Tolak Pembayaran
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.to === "paid" ? "Konfirmasi pembayaran?" : "Tolak pembayaran?"}
        message={
          confirm
            ? `Status pendaftaran ${confirm.reg.name} akan diubah menjadi ${confirm.to === "paid" ? "Dikonfirmasi" : "Ditolak"}. Tindakan ini tercatat di audit log.`
            : ""
        }
        confirmLabel={confirm?.to === "paid" ? "Konfirmasi" : "Tolak"}
        danger={confirm?.to === "rejected"}
        busy={busy}
        onConfirm={() => confirm && applyStatus(confirm.reg, confirm.to)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
