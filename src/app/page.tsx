import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PrizesSection } from "@/components/home/PrizesSection";
import { ParticipatingStores } from "@/components/home/ParticipatingStores";
import { FAQSection } from "@/components/home/FAQSection";
import { TermsSummary } from "@/components/home/TermsSummary";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <PrizesSection />
        <ParticipatingStores />
        <TermsSummary />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
