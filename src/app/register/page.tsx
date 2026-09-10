import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RegistrationForm } from "@/components/forms/RegistrationForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Register to participate in the Instant Win Campaign.",
};

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="bg-slate-50 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-100 sm:p-10">
            <h1 className="text-2xl font-extrabold text-slate-900">Enter the Campaign</h1>
            <p className="mt-2 text-sm text-slate-600">
              A few details, then you&apos;ll upload your receipt for instant verification.
            </p>
            <div className="mt-8">
              <RegistrationForm />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
