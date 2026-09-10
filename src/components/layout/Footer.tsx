import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-brand-950 text-white/70">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-lg font-bold text-white">Instant Win Campaign</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Buy a qualifying product from a participating UAE supermarket, scan the QR code, upload
            your receipt, and spin the wheel for an instant prize.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Campaign</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#how-it-works" className="hover:text-white focus-ring rounded">How It Works</Link></li>
            <li><Link href="/#prizes" className="hover:text-white focus-ring rounded">Prizes</Link></li>
            <li><Link href="/#stores" className="hover:text-white focus-ring rounded">Participating Stores</Link></li>
            <li><Link href="/#faq" className="hover:text-white focus-ring rounded">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/terms" className="hover:text-white focus-ring rounded">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-white focus-ring rounded">Privacy Policy</Link></li>
            <li><Link href="/terms#cookies" className="hover:text-white focus-ring rounded">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <p className="container-page text-xs text-white/50">
          © {new Date().getFullYear()} Instant Win Campaign. This promotion is open to UAE residents aged 18 and
          above, subject to the campaign Terms &amp; Conditions. Not affiliated with or endorsed by
          participating supermarkets.
        </p>
      </div>
    </footer>
  );
}
