import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export function TermsSummary() {
  return (
    <section className="bg-white py-20">
      <div className="container-page">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 rounded-2xl bg-brand-950 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <ShieldCheck className="h-12 w-12 shrink-0 text-gold-400" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-bold">Fair, transparent, and secure</h3>
            <p className="mt-2 text-sm text-white/75">
              Entries must be UAE residents aged 18+. One prize per receipt. Receipts are verified
              using AI/OCR and must show a genuine, unedited purchase of a qualifying product made
              during the campaign period. Read the full{" "}
              <Link href="/terms" className="font-semibold text-gold-300 underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-gold-300 underline underline-offset-2">
                Privacy Policy
              </Link>{" "}
              before participating.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
