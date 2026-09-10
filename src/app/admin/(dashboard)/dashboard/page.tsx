"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Receipt, CheckCircle2, XCircle, Clock, Trophy, Play, Pause } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";

interface DashboardData {
  campaign: { name: string; status: string; startDate: string; endDate: string };
  stats: {
    totalRegistrations: number;
    totalReceipts: number;
    approvedReceipts: number;
    rejectedReceipts: number;
    pendingReviews: number;
    todaysEntries: number;
    todaysWinners: number;
  };
  prizeInventory: { id: string; name: string; isActive: boolean; remainingStock: number; totalStock: number }[];
  storeParticipation: { store: string; count: number }[];
  dailyParticipation: { day: string; count: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/dashboard");
    const json = await res.json();
    if (json.success) setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleCampaign() {
    if (!data) return;
    setBusy(true);
    const action = data.campaign.status === "ACTIVE" ? "pause" : "resume";
    await fetch(`/api/admin/campaign/${action}`, { method: "POST" });
    await load();
    setBusy(false);
  }

  if (!data) {
    return <p className="text-slate-500">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{data.campaign.name}</h1>
          <p className="text-sm text-slate-500">
            Status:{" "}
            <span className={data.campaign.status === "ACTIVE" ? "font-semibold text-brand-600" : "font-semibold text-amber-600"}>
              {data.campaign.status}
            </span>
          </p>
        </div>
        <button
          onClick={toggleCampaign}
          disabled={busy}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {data.campaign.status === "ACTIVE" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {data.campaign.status === "ACTIVE" ? "Pause Campaign" : "Resume Campaign"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Registrations" value={data.stats.totalRegistrations} icon={Users} />
        <StatCard label="Total Receipts" value={data.stats.totalReceipts} icon={Receipt} />
        <StatCard label="Approved" value={data.stats.approvedReceipts} icon={CheckCircle2} accent="brand" />
        <StatCard label="Rejected" value={data.stats.rejectedReceipts} icon={XCircle} accent="red" />
        <StatCard label="Pending Review" value={data.stats.pendingReviews} icon={Clock} accent="gold" />
        <StatCard label="Today's Entries" value={data.stats.todaysEntries} icon={Receipt} accent="slate" />
        <StatCard label="Today's Winners" value={data.stats.todaysWinners} icon={Trophy} accent="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="font-bold text-slate-900">Daily Participation (last 14 days)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyParticipation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0d9152" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="font-bold text-slate-900">Store-wise Participation</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.storeParticipation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="store" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#d98f1e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-bold text-slate-900">Prize Inventory</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="py-2 pr-4">Prize</th>
                <th className="py-2 pr-4">Remaining</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.prizeInventory.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-slate-800">{p.name}</td>
                  <td className="py-2.5 pr-4">{p.remainingStock}</td>
                  <td className="py-2.5 pr-4">{p.totalStock}</td>
                  <td className="py-2.5 pr-4">
                    <span className={p.isActive ? "text-brand-600" : "text-slate-400"}>
                      {p.isActive ? "Active" : "Exhausted"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
