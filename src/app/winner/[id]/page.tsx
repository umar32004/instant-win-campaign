import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "You're a Winner!",
  description: "Your Instant Win Campaign prize confirmation.",
};

async function getWinner(id: string) {
  const winner = await prisma.winner.findFirst({
    where: { OR: [{ id }, { winnerCode: id }] },
    include: { prize: true, user: { select: { fullName: true } } },
  });
  return winner;
}

export default async function WinnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const winner = await getWinner(id);
  if (!winner) notFound();

  return (
    <>
      <Header />
      <main id="main-content" className="bg-hero-gradient py-20 text-white">
        <div className="container-page">
          <div className="mx-auto max-w-lg rounded-2xl bg-white/10 p-10 text-center backdrop-blur-lg ring-1 ring-white/20">
            <Trophy className="mx-auto h-16 w-16 text-gold-400" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-extrabold">Congratulations, {winner.user.fullName.split(" ")[0]}!</h1>
            <p className="mt-3 text-lg text-gold-200">{winner.prize.name}</p>

            <dl className="mt-8 space-y-3 rounded-xl bg-white/10 p-6 text-left text-sm">
              <Row label="Winner Code" value={winner.winnerCode} />
              <Row label="Redemption Code" value={winner.redemptionCode} />
              <Row label="Status" value={winner.status.replace(/_/g, " ")} />
              <Row label="Won At" value={new Date(winner.wonAt).toLocaleString("en-AE")} />
            </dl>

            <p className="mt-6 text-xs text-white/70">
              Show this screen and your redemption code to a campaign representative to claim your
              prize. Keep your code safe — it is required for redemption.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <dt className="text-white/60">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
