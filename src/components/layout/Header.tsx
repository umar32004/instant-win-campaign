"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#prizes", label: "Prizes" },
  { href: "/#stores", label: "Stores" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-950/80 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white focus-ring rounded-md">
          <Sparkles className="h-6 w-6 text-gold-400" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">Instant Win Campaign</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white focus-ring rounded-md"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button href="/register" variant="secondary" size="sm">
            Scan &amp; Win
          </Button>
        </div>

        <button
          className="text-white md:hidden focus-ring rounded-md p-2"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-brand-950 md:hidden">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-white/90 hover:bg-white/5 focus-ring"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 px-3">
              <Button href="/register" variant="secondary" className="w-full">
                Scan &amp; Win
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
