import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the Instant Win Campaign.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="bg-white py-16">
        <div className="container-page mx-auto max-w-3xl prose prose-slate">
          <h1>Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-AE")}</p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li>Registration details: full name, mobile number, email address, and Emirate of residence.</li>
            <li>Receipt images and the data extracted from them (store name, items purchased, totals, transaction date).</li>
            <li>Technical data: IP address and a basic device fingerprint, used only for fraud prevention.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use your information solely to operate the campaign: verifying your eligibility,
            preventing fraud and duplicate entries, awarding and tracking prizes, and contacting you
            about your entry or prize redemption.
          </p>

          <h2>3. Data Storage &amp; Security</h2>
          <p>
            Receipt images are stored in a private Azure Blob Storage container and are never made
            publicly accessible. All data is encrypted in transit (HTTPS) and at rest. Access to
            personal data is restricted to authorized campaign administrators.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            We retain campaign entry data for the duration of the campaign and a reasonable period
            afterward for prize redemption, auditing, and legal compliance purposes, after which it
            is securely deleted.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data by
            contacting the campaign administrator, subject to legal and legitimate business
            requirements (such as fraud investigation records).
          </p>

          <h2>6. Third Parties</h2>
          <p>
            We use Microsoft Azure (AI Document Intelligence, Blob Storage, Azure SQL Database) as
            our infrastructure and OCR processing provider. We do not sell your personal data to
            third parties.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
