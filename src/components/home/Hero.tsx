"use client";

import { motion } from "framer-motion";
import { QrCode, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient pb-24 pt-20 text-white sm:pb-32 sm:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400/20 via-transparent to-transparent"
      />

      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-gold-200 ring-1 ring-inset ring-white/20">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Instant Win Campaign — UAE
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Buy. Scan. Upload.{" "}
            <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
              Win Instantly.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/80">
            Purchase a qualifying product from a participating UAE supermarket, scan the campaign QR
            code, upload your receipt, and our AI verifies your eligibility in seconds — then you
            spin the wheel for a prize on the spot.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button href="/register" size="lg" variant="secondary">
              <QrCode className="h-5 w-5" aria-hidden="true" />
              Scan &amp; Win
            </Button>
            <Button href="/#how-it-works" size="lg" variant="outline">
              <Gift className="h-5 w-5" aria-hidden="true" />
              See Prizes
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 text-left">
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/60">Verification</dt>
              <dd className="mt-1 text-2xl font-bold text-white">3–7 sec</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/60">Stores</dt>
              <dd className="mt-1 text-2xl font-bold text-white">7+</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/60">Prize Tiers</dt>
              <dd className="mt-1 text-2xl font-bold text-white">6</dd>
            </div>
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center"
        >
          <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-gold-400/30" />
          <div className="absolute inset-8 rounded-full bg-white/5 backdrop-blur-sm ring-1 ring-white/10" />
          <div className="relative flex h-48 w-48 animate-float items-center justify-center rounded-3xl bg-white shadow-2xl">
            <QrCode className="h-28 w-28 text-brand-900" aria-hidden="true" />
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-4 py-1.5 text-sm font-bold text-brand-950 shadow-lg">
            Scan to enter
          </span>
        </motion.div>
      </div>
    </section>
  );
}
