"use client";

import { motion } from "framer-motion";
import { Gift, Ticket, Percent, ShoppingBasket, Crown, Trophy } from "lucide-react";

const PRIZES = [
  { icon: ShoppingBasket, name: "Free Product Sample", tier: "Standard" },
  { icon: Percent, name: "10% Discount Coupon", tier: "Standard" },
  { icon: Ticket, name: "AED 25 Gift Voucher", tier: "Standard" },
  { icon: Gift, name: "Premium Gift Basket", tier: "Premium" },
  { icon: Crown, name: "Premium Hamper", tier: "Premium" },
  { icon: Trophy, name: "Grand Prize — AED 5,000", tier: "Grand" },
];

const tierClasses: Record<string, string> = {
  Standard: "bg-brand-50 text-brand-700 ring-brand-200",
  Premium: "bg-gold-50 text-gold-700 ring-gold-200",
  Grand: "bg-gradient-to-br from-gold-500 to-gold-600 text-white ring-gold-600",
};

export function PrizesSection() {
  return (
    <section id="prizes" className="bg-slate-50 py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">Prizes</h2>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Every spin is a chance to win
          </p>
          <p className="mt-4 text-slate-600">
            Prize availability updates in real time — once a tier sells out, it&apos;s automatically
            removed from the wheel.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRIZES.map((prize, index) => (
            <motion.div
              key={prize.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className={`flex items-center gap-4 rounded-2xl p-6 shadow-sm ring-1 ring-inset ${tierClasses[prize.tier]}`}
            >
              <prize.icon className="h-10 w-10 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold">{prize.name}</p>
                <p className="text-sm opacity-80">{prize.tier} Tier</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
