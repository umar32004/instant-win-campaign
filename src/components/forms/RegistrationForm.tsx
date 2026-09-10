"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { registrationSchema, type RegistrationInput } from "@/lib/validation/schemas";
import { UAE_EMIRATES } from "@/types/enums";
import { getClientFingerprint } from "@/lib/deviceFingerprint.client";
import { Button } from "@/components/ui/Button";

export function RegistrationForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
  });

  async function onSubmit(data: RegistrationInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, deviceFingerprint: getClientFingerprint() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Registration failed. Please try again.");
        return;
      }
      router.push("/upload");
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      {/* Honeypot field — hidden from real users, bots tend to fill every input. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <Field label="Full Name" error={errors.fullName?.message}>
        <input
          {...register("fullName")}
          type="text"
          autoComplete="name"
          className="form-input"
          placeholder="e.g. Fatima Al Mazrouei"
        />
      </Field>

      <Field label="Mobile Number" error={errors.mobileNumber?.message}>
        <input
          {...register("mobileNumber")}
          type="tel"
          autoComplete="tel"
          className="form-input"
          placeholder="050 123 4567"
        />
      </Field>

      <Field label="Email Address" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className="form-input"
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Emirate" error={errors.emirate?.message}>
        <select {...register("emirate")} className="form-input" defaultValue="">
          <option value="" disabled>
            Select your Emirate
          </option>
          {UAE_EMIRATES.map((emirate) => (
            <option key={emirate} value={emirate}>
              {emirate}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" {...register("ageConfirmed")} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus-ring" />
        <span>I confirm that I am 18 years of age or older.</span>
      </label>
      {errors.ageConfirmed && <p className="text-sm text-red-600">{errors.ageConfirmed.message}</p>}

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" {...register("acceptedTerms")} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus-ring" />
        <span>
          I accept the{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {errors.acceptedTerms && <p className="text-sm text-red-600">{errors.acceptedTerms.message}</p>}

      {submitError && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {submitError}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Submitting...
          </>
        ) : (
          "Continue to Upload Receipt"
        )}
      </Button>
    </motion.form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
