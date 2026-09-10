"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { UploadCloud, Camera, ImageIcon, X, CheckCircle2, XCircle } from "lucide-react";
import { VerificationProgress } from "@/components/upload/VerificationProgress";
import { getClientFingerprint } from "@/lib/deviceFingerprint.client";
import { Button } from "@/components/ui/Button";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type Phase = "idle" | "verifying" | "approved" | "rejected";

interface VerifyResult {
  receiptId: string;
  eligible: boolean;
  confidence: number;
  detectedProducts: { name: string; confidence: number }[];
  rejectionReason: string | null;
}

export function ReceiptUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // TEMPORARY (testing): auto-creates a fresh test1/test2/.../testN user and
  // session on every visit, skipping the registration form entirely so
  // receipt/OCR testing doesn't require re-entering name/email/phone each
  // time. Remove this effect (and src/app/api/dev/quick-register) once
  // manual registration testing resumes.
  const [testSessionLabel, setTestSessionLabel] = useState<string | null>(null);
  const [testSessionError, setTestSessionError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dev/quick-register", { method: "POST" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTestSessionLabel(json.label);
        else setTestSessionError(json.error ?? "Could not create a test session.");
      })
      .catch(() => setTestSessionError("Could not reach the server to create a test session."));
  }, []);

  const handleFile = useCallback((selected: File | null) => {
    setError(null);
    setResult(null);
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Unsupported file type. Please upload a JPG, PNG, or PDF.");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError("File exceeds the 10 MB maximum size.");
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  }, []);

  function clearFile() {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setPhase("idle");
  }

  async function submitReceipt() {
    if (!file) return;
    setPhase("verifying");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("deviceFingerprint", getClientFingerprint());

    // The mock/OCR pipeline typically resolves faster than the staged
    // progress messages read comfortably, so we enforce a minimum display
    // time for a calmer, more trustworthy verification experience.
    const minDisplayMs = 3200;
    const started = Date.now();

    try {
      const res = await fetch("/api/upload-receipt", { method: "POST", body: formData });
      const json = await res.json();

      const elapsed = Date.now() - started;
      if (elapsed < minDisplayMs) {
        await new Promise((resolve) => setTimeout(resolve, minDisplayMs - elapsed));
      }

      if (!res.ok || !json.success) {
        setError(json.error ?? "We couldn't verify your receipt. Please try again.");
        setPhase("idle");
        return;
      }

      setResult(json);
      setPhase(json.eligible ? "approved" : "rejected");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setPhase("idle");
    }
  }

  if (testSessionError) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
        {testSessionError}
      </div>
    );
  }

  if (!testSessionLabel) {
    return <p className="py-16 text-center text-sm text-slate-500">Setting up test session...</p>;
  }

  if (phase === "verifying") {
    return <VerificationProgress />;
  }

  if (phase === "approved" && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-600" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Receipt verified!</h2>
        <p className="mt-2 text-sm text-slate-600">
          We found {result.detectedProducts.length} matching product(s) on your receipt
          {result.confidence ? ` (${Math.round(result.confidence * 100)}% confidence)` : ""}.
        </p>
        {/* TEMPORARILY DISABLED for OCR-only testing — restore the "Spin the
            Wheel" button (router.push to /spin?receiptId=...) once ready to
            test the full prize flow again. */}
        <Button className="mt-6 w-full" size="lg" variant="outline" onClick={clearFile}>
          <span className="text-brand-700">Test Another Receipt</span>
        </Button>
      </motion.div>
    );
  }

  if (phase === "rejected" && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Not eligible yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          {result.rejectionReason ?? "Please purchase a qualifying product to participate in this campaign."}
        </p>
        <Button className="mt-6 w-full" variant="outline" size="lg" onClick={clearFile}>
          <span className="text-brand-700">Try a Different Receipt</span>
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-xs font-medium text-slate-400">Testing as {testSessionLabel}</p>
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0] ?? null);
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <UploadCloud className="h-12 w-12 text-brand-500" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-slate-800">Drag &amp; drop your receipt here</p>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG, or PDF — up to 10 MB</p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="ghost" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              Take Photo
            </Button>
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Choose from Gallery
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">{file.name}</p>
            <button onClick={clearFile} aria-label="Remove file" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-ring">
              <X className="h-4 w-4" />
            </button>
          </div>
          {previewUrl && (
            <div className="relative mt-3 h-64 w-full overflow-hidden rounded-lg bg-slate-100">
              <Image src={previewUrl} alt="Receipt preview" fill className="object-contain" unoptimized />
            </div>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {file && (
        <Button size="lg" className="w-full" onClick={submitReceipt}>
          Verify Receipt
        </Button>
      )}
    </div>
  );
}
