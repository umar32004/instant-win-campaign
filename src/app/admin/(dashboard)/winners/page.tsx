"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface AdminWinner {
  id: string;
  winnerCode: string;
  redemptionCode: string;
  status: string;
  storeName: string | null;
  wonAt: string;
  user: { fullName: string; email: string; mobileNumber: string };
  prize: { name: string; tier: string };
  receipt: { receiptNumber: string | null; storeNameRaw: string | null };
}

export default function AdminWinnersPage() {
  const [winners, setWinners] = useState<AdminWinner[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(targetPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage), pageSize: "20", search });
    const res = await fetch(`/api/admin/winners?${params}`);
    const json = await res.json();
    if (json.success) {
      setWinners(json.winners);
      setTotalPages(json.pagination.totalPages);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Winners</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(1))}
              placeholder="Search winner code, name, email..."
              className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring"
            />
          </div>
          <Link
            href="/api/admin/export/winners?format=xlsx"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export Excel
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3">Winner Code</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Prize</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Won At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-400" colSpan={6}>Loading...</td></tr>
            ) : winners.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-400" colSpan={6}>No winners yet.</td></tr>
            ) : (
              winners.map((w) => (
                <tr key={w.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700">{w.winnerCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{w.user.fullName}</p>
                    <p className="text-xs text-slate-500">{w.user.mobileNumber}</p>
                  </td>
                  <td className="px-4 py-3">{w.prize.name}</td>
                  <td className="px-4 py-3">{w.storeName ?? w.receipt.storeNameRaw ?? "—"}</td>
                  <td className="px-4 py-3">{w.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(w.wonAt).toLocaleString("en-AE")}</td>
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
