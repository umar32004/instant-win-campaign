"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  "Analyzing your receipt...",
  "Checking purchased products...",
  "Verifying eligibility...",
  "Almost done...",
];

export function VerificationProgress() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 1300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-20 w-20 animate-spin text-brand-600" aria-hidden="true" />
      </div>

      <div className="space-y-2" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-semibold text-slate-900"
          >
            {STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <ul className="flex gap-2">
        {STEPS.map((step, index) => (
          <li key={step}>
            {index <= stepIndex ? (
              <CheckCircle2 className="h-3 w-3 text-brand-600" aria-hidden="true" />
            ) : (
              <span className="block h-3 w-3 rounded-full bg-slate-200" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
