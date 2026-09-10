import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: {
    default: "Instant Win Campaign | Scan. Verify. Win.",
    template: "%s | Instant Win Campaign",
  },
  description:
    "Buy a qualifying product from participating UAE supermarkets, scan the QR code, upload your receipt, and spin the wheel to win instant prizes.",
  keywords: [
    "Instant Win",
    "QR Campaign",
    "Spin the Wheel",
    "UAE Promotion",
  ],
  openGraph: {
    title: "Instant Win Campaign",
    description:
      "Buy. Scan. Upload. Win. Verify your receipt instantly and spin for a prize.",
    type: "website",
    locale: "en_AE",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9152",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
