"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Ban, CheckCircle } from "lucide-react";

interface AdminUser {
  id: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  emirate: string;
  isBlacklisted: boolean;
  createdAt: string;
  _count: { receipts: number; winners: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(targetPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage), pageSize: "20", search });
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    if (json.success) {
      setUsers(json.users);
      setTotalPages(json.pagination.totalPages);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function runSearch() {
    setPage(1);
    load(1);
  }

  async function toggleBlacklist(user: AdminUser) {
    if (user.isBlacklisted) {
      await fetch(`/api/admin/blacklist/user?userId=${user.id}`, { method: "DELETE" });
    } else {
      const reason = window.prompt("Reason for blacklisting this user:");
      if (!reason) return;
      await fetch("/api/admin/blacklist/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, reason }),
      });
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Users</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search name, email, mobile..."
              className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-ring"
            />
          </div>
          <Link
            href="/api/admin/export/users?format=csv"
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Emirate</th>
              <th className="px-4 py-3">Receipts</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-400" colSpan={8}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-400" colSpan={8}>No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                  <td className="px-4 py-3">{u.mobileNumber}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.emirate}</td>
                  <td className="px-4 py-3">{u._count.receipts}</td>
                  <td className="px-4 py-3">{u._count.winners}</td>
                  <td className="px-4 py-3">
                    {u.isBlacklisted ? (
                      <span className="text-red-600">Blacklisted</span>
                    ) : (
                      <span className="text-brand-600">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleBlacklist(u)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-slate-100"
                    >
                      {u.isBlacklisted ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-brand-600" /> Restore
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5 text-red-600" /> Blacklist
                        </>
                      )}
                    </button>
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
