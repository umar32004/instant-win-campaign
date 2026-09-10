"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { PartyPopper, Frown } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Prize {
  id: string;
  name: string;
  tier: string;
}

type SpinOutcome =
  | { won: true; prizeId: string; prizeName: string; winnerCode: string; redemptionCode: string; winnerId: string }
  | { won: false; message: string };

const SEGMENT_COLORS = ["#0d9152", "#0c7444", "#d98f1e", "#bd6d17", "#17b366", "#e8ac33", "#3ecd86", "#f4de95"];

export function SpinWheel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const receiptId = searchParams.get("receiptId");

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controls = useAnimationControls();
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!receiptId) {
      setError("Missing receipt reference. Please upload your receipt again.");
      setLoading(false);
      return;
    }
    fetch("/api/prizes")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPrizes(json.prizes);
      })
      .finally(() => setLoading(false));
  }, [receiptId]);

  const segmentAngle = 360 / Math.max(prizes.length, 1);

  async function handleSpin() {
    if (!receiptId || spinning) return;
    setSpinning(true);
    setError(null);

    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setSpinning(false);
        return;
      }

      const targetIndex = json.won ? Math.max(prizes.findIndex((p) => p.id === json.prizeId), 0) : 0;
      const targetCenter = targetIndex * segmentAngle + segmentAngle / 2;
      // Land the pointer (fixed at top/0deg) on the target segment after several full spins.
      const fullSpins = 5 * 360;
      const finalRotation = rotation + fullSpins + (360 - targetCenter);
      setRotation(finalRotation);

      await controls.start({
        rotate: finalRotation,
        transition: { duration: 4.5, ease: [0.17, 0.67, 0.2, 1] },
      });

      setOutcome(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSpinning(false);
    }
  }

  const gradient = useMemo(() => {
    if (prizes.length === 0) return "conic-gradient(#0d9152, #0c7444)";
    const stops: string[] = [];
    prizes.forEach((_, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      stops.push(`${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`);
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [prizes, segmentAngle]);

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading the wheel...</p>;
  }

  if (error && !outcome) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button className="mt-6" onClick={() => router.push("/upload")}>
          Back to Upload
        </Button>
      </div>
    );
  }

  if (outcome) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
        {outcome.won ? (
          <>
            <PartyPopper className="mx-auto h-16 w-16 text-gold-500" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Congratulations!</h2>
            <p className="mt-2 text-lg font-semibold text-brand-700">{outcome.prizeName}</p>
            <p className="mt-1 text-sm text-slate-500">Winner code: {outcome.winnerCode}</p>
            <Button className="mt-6 w-full" size="lg" onClick={() => router.push(`/winner/${outcome.winnerId}`)}>
              View My Prize
            </Button>
          </>
        ) : (
          <>
            <Frown className="mx-auto h-16 w-16 text-slate-400" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No prizes available right now</h2>
            <p className="mt-2 text-sm text-slate-600">{outcome.message}</p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <div className="relative h-72 w-72 sm:h-80 sm:w-80">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/3">
          <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-gold-500 drop-shadow" />
        </div>

        <motion.div
          animate={controls}
          initial={{ rotate: 0 }}
          className="relative h-full w-full overflow-hidden rounded-full border-8 border-white shadow-2xl"
          style={{ background: gradient }}
        >
          {prizes.map((prize, i) => {
            const angle = i * segmentAngle + segmentAngle / 2;
            return (
              <div
                key={prize.id}
                className="absolute left-1/2 top-1/2 w-28 origin-left text-xs font-bold text-white"
                style={{ transform: `rotate(${angle}deg) translateX(8px)` }}
              >
                <span className="block -translate-y-1/2 drop-shadow">{prize.name}</span>
              </div>
            );
          })}
        </motion.div>

        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button size="lg" onClick={handleSpin} disabled={spinning || prizes.length === 0}>
        {spinning ? "Spinning..." : "Spin the Wheel"}
      </Button>
    </div>
  );
}
