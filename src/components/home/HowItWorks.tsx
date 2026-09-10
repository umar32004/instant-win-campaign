"use client";

import { motion } from "framer-motion";
import { ShoppingCart, QrCode, UploadCloud, Disc3 } from "lucide-react";

const STEPS = [
  {
    icon: ShoppingCart,
    title: "Buy a Qualifying Product",
    description: "Purchase a qualifying product from a participating UAE supermarket.",
  },
  {
    icon: QrCode,
    title: "Scan the QR Code",
    description: "Scan the campaign QR code on-shelf, at checkout, or on your receipt.",
  },
  {
    icon: UploadCloud,
    title: "Upload Your Receipt",
    description: "Snap a photo or upload your receipt — our AI verifies it in seconds.",
  },
  {
    icon: Disc3,
    title: "Spin & Win",
    description: "Once verified, spin the wheel instantly for a guaranteed prize chance.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">How It Works</h2>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Four simple steps to instant rewards
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl"
            >
              <span className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-md">
                {index + 1}
              </span>
              <step.icon className="h-10 w-10 text-brand-600" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
