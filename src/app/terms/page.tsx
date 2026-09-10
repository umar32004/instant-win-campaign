import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for the Instant Win Campaign.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="bg-white py-16">
        <div className="container-page mx-auto max-w-3xl prose prose-slate">
          <h1>Instant Win Campaign — Terms &amp; Conditions</h1>
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-AE")}</p>

          <h2>1. Campaign Period</h2>
          <p>
            The Instant Win Campaign (&quot;Campaign&quot;) runs for the dates published on the
            campaign homepage. Entries submitted before or after the campaign period will not be
            eligible.
          </p>

          <h2>2. Eligibility</h2>
          <ul>
            <li>Open to legal residents of the United Arab Emirates aged 18 years or older.</li>
            <li>Employees of the Organizer, its parent company, affiliates, and their immediate families are not eligible.</li>
            <li>Each participant must register with a valid mobile number and email address.</li>
            <li>One prize may be claimed per valid, unique receipt.</li>
          </ul>

          <h2>3. How to Participate</h2>
          <ol>
            <li>Purchase a qualifying product from a participating UAE supermarket.</li>
            <li>Scan the campaign QR code and complete registration.</li>
            <li>Upload a clear photo or scan of your original receipt.</li>
            <li>Once your receipt is verified as containing a qualifying product, spin the wheel for an instant prize.</li>
          </ol>

          <h2>4. Receipt Verification</h2>
          <p>
            Receipts are verified using AI-powered optical character recognition (OCR) and fuzzy
            product matching. The Organizer reserves the right to reject any receipt that is illegible,
            appears edited or tampered with, does not show a qualifying purchase, or fails any
            fraud-prevention check, including but not limited to duplicate receipt or image
            detection, submission limits, and minimum confidence thresholds.
          </p>

          <h2>5. Prize Rules</h2>
          <ul>
            <li>Prizes are subject to available inventory at the time of each spin and are awarded automatically by the system.</li>
            <li>Prize odds are configured by the campaign administrator and may change during the campaign.</li>
            <li>Prizes are non-transferable and cannot be exchanged for cash unless stated otherwise.</li>
            <li>Winners must redeem their prize using the redemption code provided within the timeframe stated at the point of winning.</li>
          </ul>

          <h2>6. Disqualification</h2>
          <p>
            The Organizer reserves the right to disqualify any entry or participant found to be
            submitting fraudulent, duplicate, or manipulated receipts, using multiple accounts, or
            otherwise abusing the campaign mechanics, including automated or bot-driven entries.
          </p>

          <h2 id="cookies">7. Cookie Policy</h2>
          <p>
            This site uses strictly necessary cookies to keep you signed in during your campaign
            session (registration and receipt verification) and to protect against fraud. No
            third-party advertising cookies are used.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            The Organizer is not responsible for lost, delayed, or corrupted uploads, technical failures,
            or any indirect loss arising from participation in this Campaign.
          </p>

          <h2>9. Governing Law</h2>
          <p>This Campaign is governed by the laws of the United Arab Emirates.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
