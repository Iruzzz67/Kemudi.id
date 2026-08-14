"use client";

import { useEffect, useState } from "react";
import { AdminTable, Td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { inputClass } from "@/components/admin/AdminForm";
import { MENTORS } from "@/lib/kursus-data";

export type AdminPayment = {
  id: string;
  name: string;
  email: string;
  mentorId: string;
  amount: number;
  paymentMethod: string;
  status: string;
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

export function PaymentsTable() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ pay: AdminPayment; to: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments${statusFilter ? `?status=${statusFilter}` : ""}`);
      if (!res.ok) throw new Error("Gagal memuat data.");
      const data = await res.json();
      setPayments(data.payments);
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

  async function apply(pay: AdminPayment, to: string) {
    setBusy(true);
    setError(null);
    setPayments((list) => list.map((p) => (p.id === pay.id ? { ...p, status: to } : p)));
    try {
      const res = await fetch(`/api/admin/payments/${pay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal memperbarui pembayaran.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setPayments((list) => list.map((p) => (p.id === pay.id ? { ...p, status: pay.status } : p)));
    } finally {
      setBusy(false);
      setConfirm(null);
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} max-w-xs`}
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Berhasil</option>
          <option value="rejected">Ditolak</option>
        </select>
        <span className="text-sm text-neutral-500">
          Verifikasi bukti pembayaran sebelum mengubah status.
        </span>
      </div>

      <AdminTable
        columns={[
          { key: "date", label: "Tanggal" },
          { key: "name", label: "Peserta" },
          { key: "course", label: "Mentor" },
          { key: "amount", label: "Nominal" },
          { key: "method", label: "Metode" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Aksi", className: "text-right" },
        ]}
        rows={payments}
        renderRow={(p) => {
          const mentor = MENTORS.find((m) => m.id === p.mentorId);
          return (
            <>
              <Td className="whitespace-nowrap text-neutral-500">
                {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Td>
              <Td>
                <div className="font-medium text-neutral-900 dark:text-white">{p.name}</div>
                <div className="text-xs text-neutral-500">{p.email}</div>
              </Td>
              <Td className="text-neutral-600 dark:text-neutral-300">{mentor?.name ?? p.mentorId}</Td>
              <Td className="font-medium whitespace-nowrap">{formatIdr(p.amount)}</Td>
              <Td className="text-neutral-600 dark:text-neutral-300">{PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</Td>
              <Td>
                <StatusBadge status={p.status} />
              </Td>
              <Td className="text-right">
                {p.status !== "paid" && (
                  <button
                    onClick={() => setConfirm({ pay: p, to: "paid" })}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Verifikasi
                  </button>
                )}
                {p.status !== "rejected" && p.status !== "paid" && (
                  <button
                    onClick={() => setConfirm({ pay: p, to: "rejected" })}
                    className="ml-2 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Tolak
                  </button>
                )}
                {p.status === "paid" && (
                  <button
                    onClick={() => setConfirm({ pay: p, to: "pending" })}
                    className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Buka Kembali
                  </button>
                )}
              </Td>
            </>
          );
        }}
      />
      {loading && <p className="mt-4 text-center text-sm text-neutral-400">Memuat...</p>}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.to === "paid"
            ? "Verifikasi pembayaran?"
            : confirm?.to === "rejected"
              ? "Tolak pembayaran?"
              : "Buka kembali pembayaran?"
        }
        message={confirm ? `Pembayaran ${confirm.pay.name} akan diubah statusnya menjadi ${confirm.to === "paid" ? "Berhasil" : confirm.to === "rejected" ? "Ditolak" : "Pending"}.` : ""}
        confirmLabel={confirm?.to === "paid" ? "Verifikasi" : confirm?.to === "rejected" ? "Tolak" : "Buka Kembali"}
        danger={confirm?.to === "rejected"}
        busy={busy}
        onConfirm={() => confirm && apply(confirm.pay, confirm.to)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
