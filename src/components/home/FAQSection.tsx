"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

const FAQS = [
  {
    q: "Who can participate in the Instant Win Campaign?",
    a: "Any UAE resident aged 18 or above who purchases a qualifying product from a participating supermarket during the campaign period.",
  },
  {
    q: "Do I need to shop at a specific supermarket?",
    a: "No. The campaign works with any UAE supermarket — Lulu, Carrefour, Union Coop, Nesto, Choithrams, Spinneys, Viva, or any other store that sells the featured product.",
  },
  {
    q: "What happens if my receipt doesn't show a qualifying product?",
    a: "Your submission will be marked not eligible and you'll see a message asking you to purchase a qualifying product to participate. You can upload a different qualifying receipt.",
  },
  {
    q: "How long does receipt verification take?",
    a: "Our AI-powered OCR verification typically completes in 3 to 7 seconds.",
  },
  {
    q: "Can I submit more than one receipt?",
    a: "Yes, up to the daily submission limit set for the campaign. Each unique, valid receipt gives you one spin of the wheel.",
  },
  {
    q: "Is every spin a win?",
    a: "Every verified, eligible receipt gets a spin, and prize odds are configured so most spins result in a prize — subject to available prize inventory at the time you spin.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-slate-50 py-24">
      <div className="container-page mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">FAQ</h2>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Frequently asked questions
          </p>
        </div>

        <dl className="mt-12 space-y-4">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                <dt>
                  <button
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-ring rounded-2xl"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="font-semibold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={clsx("h-5 w-5 shrink-0 text-brand-600 transition-transform", isOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                </dt>
                {isOpen && (
                  <dd className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</dd>
                )}
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
