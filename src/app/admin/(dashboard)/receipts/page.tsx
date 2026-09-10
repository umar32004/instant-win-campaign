"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle, XCircle, Trash2, Ban, ImageIcon } from "lucide-react";
import { clsx } from "clsx";

interface AdminReceipt {
  id: string;
  storeNameRaw: string | null;
  receiptNumber: string | null;
  totalAmount: string | null;
  status: string;
  ocrConfidence: number | null;
  hayatnaProductDetected: boolean;
  imageUrl: string;
  submittedAt: string;
  user: { fullName: string; email: string };
  winner: { id: string; winnerCode: string } | null;
}

const STATUS_OPTIONS = ["ALL", "PENDING", "PROCESSING", "APPROVED", "REJECTED", "FLAGGED"];

const statusColor: Record<string, string> = {
  APPROVED: "text-brand-600",
  REJECTED: "text-red-600",
  FLAGGED: "text-amber-600",
  PENDING: "text-slate-500",
  PROCESSING: "text-slate-500",
};

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(targetPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage), pageSize: "20", search });
    if (status !== "ALL") params.set("status", status);
    const res = await fetch(`/api/admin/receipts?${params}`);
    const json = await res.json();
    if (json.success) {
      setReceipts(json.receipts);
      setTotalPages(json.pagination.totalPages);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function override(id: string, action: "APPROVE" | "REJECT") {
    const reason = action === "REJECT" ? window.prompt("Reason for rejection:") ?? undefined : undefined;
    await fetch(`/api/admin/receipts/${id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    load(page);
  }

  async function blacklist(id: string) {
    const reason = window.prompt("Reason for blacklisting this receipt:");
    if (!reason) return;
    await fetch("/api/admin/blacklist/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptId: id, reason }),
    });
    load(page);
  }

  async function remove(id: string) {
    if (!window.confirm("Permanently delete this receipt? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/receipts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) window.alert(json.error ?? "Failed to delete receipt.");
    } catch {
      window.alert("Failed to delete receipt — the server returned an unexpected response.");
    }
    load(page);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Receipts</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(1))}
              placeholder="Search receipt #, store, user..."
              className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring"
            />
          </div>
          <Link
            href="/api/admin/export/receipts?format=csv"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-400" colSpan={8}>Loading...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-400" colSpan={8}>No receipts found.</td></tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <a href={r.imageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-brand-700 hover:underline">
                      <ImageIcon className="h-3.5 w-3.5" /> {r.receiptNumber ?? r.id.slice(0, 8)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.user.fullName}</p>
                    <p className="text-xs text-slate-500">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-3">{r.storeNameRaw ?? "—"}</td>
                  <td className="px-4 py-3">{r.totalAmount ? `AED ${r.totalAmount}` : "—"}</td>
                  <td className="px-4 py-3">{r.ocrConfidence ? `${Math.round(r.ocrConfidence * 100)}%` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("font-semibold", statusColor[r.status])}>{r.status}</span>
                    {r.winner && <p className="text-xs text-slate-400">Won: {r.winner.winnerCode}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.submittedAt).toLocaleString("en-AE")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.status !== "APPROVED" && (
                        <button onClick={() => override(r.id, "APPROVE")} title="Approve" className="rounded p-1.5 text-brand-600 hover:bg-brand-50">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {r.status !== "REJECTED" && (
                        <button onClick={() => override(r.id, "REJECT")} title="Reject" className="rounded p-1.5 text-amber-600 hover:bg-amber-50">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => blacklist(r.id)} title="Blacklist" className="rounded p-1.5 text-red-600 hover:bg-red-50">
                        <Ban className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(r.id)} title="Delete" className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
