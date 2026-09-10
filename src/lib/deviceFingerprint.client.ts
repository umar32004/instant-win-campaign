"use client";

/**
 * Lightweight, dependency-free device fingerprint for basic fraud-signal
 * purposes (grouping suspicious multi-account activity from the same
 * device). This is NOT a strong anti-fraud identifier on its own — for
 * higher assurance in production, swap this for a vendor SDK such as
 * FingerprintJS Pro and feed its visitorId into the same field.
 */
export function getClientFingerprint(): string {
  if (typeof window === "undefined") return "";

  const stored = window.localStorage.getItem("hayatna_fp");
  if (stored) return stored;

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.colorDepth),
    `${screen.width}x${screen.height}`,
    String(new Date().getTimezoneOffset()),
    String((navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? ""),
  ];

  let hash = 0;
  const input = parts.join("|");
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const fingerprint = `fp_${Math.abs(hash)}_${Date.now().toString(36)}`;
  window.localStorage.setItem("hayatna_fp", fingerprint);
  return fingerprint;
}
