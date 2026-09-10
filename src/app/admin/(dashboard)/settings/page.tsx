"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";

interface Settings {
  minPurchaseAmountAed: number;
  receiptConfidenceThreshold: number;
  maxSubmissionsPerUserPerDay: number;
  fuzzyMatchThreshold: number;
  status: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    if (json.success) setSettings(json.settings);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minPurchaseAmountAed: settings.minPurchaseAmountAed,
        receiptConfidenceThreshold: settings.receiptConfidenceThreshold,
        maxSubmissionsPerUserPerDay: settings.maxSubmissionsPerUserPerDay,
        fuzzyMatchThreshold: settings.fuzzyMatchThreshold,
      }),
    });
    const json = await res.json();
    setMessage(json.success ? "Settings saved." : json.error);
    setSaving(false);
  }

  async function resetInventory() {
    if (!window.confirm("Reset ALL prize inventory back to full stock? This cannot be undone.")) return;
    const res = await fetch("/api/admin/prizes/reset-inventory", { method: "POST" });
    const json = await res.json();
    setMessage(json.success ? `Reset ${json.resetCount} prize(s) to full inventory.` : json.error);
  }

  if (!settings) {
    return <p className="text-slate-500">Loading settings...</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Campaign Settings</h1>

      <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <Field
          label="Minimum Purchase Amount (AED)"
          value={settings.minPurchaseAmountAed}
          onChange={(v) => setSettings({ ...settings, minPurchaseAmountAed: v })}
          step={1}
        />
        <Field
          label="Receipt Confidence Threshold (0–1)"
          value={settings.receiptConfidenceThreshold}
          onChange={(v) => setSettings({ ...settings, receiptConfidenceThreshold: v })}
          step={0.01}
          min={0}
          max={1}
        />
        <Field
          label="Max Submissions per User per Day"
          value={settings.maxSubmissionsPerUserPerDay}
          onChange={(v) => setSettings({ ...settings, maxSubmissionsPerUserPerDay: v })}
          step={1}
          min={1}
        />
        <Field
          label="Fuzzy Match Threshold (0–1)"
          value={settings.fuzzyMatchThreshold}
          onChange={(v) => setSettings({ ...settings, fuzzyMatchThreshold: v })}
          step={0.01}
          min={0}
          max={1}
        />

        {message && <p className="text-sm text-brand-700">{message}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-bold text-slate-900">Prize Inventory</h2>
        <p className="mt-1 text-sm text-slate-500">
          Resets remaining stock, daily/weekly/campaign counters for every prize back to full
          inventory and reactivates any exhausted prizes.
        </p>
        <button
          onClick={resetInventory}
          className="mt-4 flex items-center gap-2 rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset Prize Inventory
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="form-input max-w-xs"
      />
    </div>
  );
}
