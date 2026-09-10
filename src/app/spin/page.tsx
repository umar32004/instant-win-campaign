import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SpinWheel } from "@/components/spin/SpinWheel";

export const metadata: Metadata = {
  title: "Spin the Wheel",
  description: "Spin the wheel for your instant campaign prize.",
};

export default function SpinPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="bg-slate-50 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-100 sm:p-10">
            <h1 className="text-center text-2xl font-extrabold text-slate-900">Spin &amp; Win</h1>
            <p className="mt-2 text-center text-sm text-slate-600">
              Your receipt is verified — spin the wheel for your instant prize!
            </p>
            <Suspense fallback={<p className="py-16 text-center text-slate-500">Loading...</p>}>
              <SpinWheel />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
