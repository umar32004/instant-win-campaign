import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReceiptUploader } from "@/components/upload/ReceiptUploader";

export const metadata: Metadata = {
  title: "Upload Receipt",
  description: "Upload your receipt for instant AI-powered verification.",
};

export default function UploadPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="bg-slate-50 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-100 sm:p-10">
            <h1 className="text-2xl font-extrabold text-slate-900">Upload Your Receipt</h1>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;ll verify your purchase in seconds using AI-powered OCR.
            </p>
            <div className="mt-8">
              <ReceiptUploader />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
