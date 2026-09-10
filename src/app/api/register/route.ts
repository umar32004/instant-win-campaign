import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { registrationSchema, normalizeUaeMobile } from "@/lib/validation/schemas";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rateLimit";
import { signParticipantSession, PARTICIPANT_SESSION_COOKIE } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getActiveCampaignOrThrow } from "@/lib/campaign";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);

  const rateLimit = await checkRateLimit(`register:${ip}`, { windowMinutes: 15, maxRequests: 10 });
  if (!rateLimit.allowed) {
    return apiError("Too many registration attempts. Please try again later.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const { fullName, email, ageConfirmed, acceptedTerms } = parsed.data;
  const mobileNumber = normalizeUaeMobile(parsed.data.mobileNumber);
  const deviceFingerprint =
    typeof (body as Record<string, unknown>)?.deviceFingerprint === "string"
      ? ((body as Record<string, unknown>).deviceFingerprint as string).slice(0, 200)
      : null;

  let campaign;
  try {
    campaign = await getActiveCampaignOrThrow();
  } catch {
    return apiError("No active campaign is currently running.", 503);
  }

  const existingByMobile = await prisma.user.findUnique({ where: { mobileNumber } });
  const existingByEmail = await prisma.user.findUnique({ where: { email } });

  if (existingByMobile && existingByEmail && existingByMobile.id === existingByEmail.id) {
    // Returning participant — re-issue a session rather than erroring.
    if (existingByMobile.isBlacklisted) {
      return apiError("This account is not eligible to participate in this campaign.", 403);
    }
    const token = await signParticipantSession({ userId: existingByMobile.id, campaignId: campaign.id });
    const response = apiSuccess({ userId: existingByMobile.id, returning: true });
    response.cookies.set(PARTICIPANT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 6 * 60 * 60,
      path: "/",
    });
    return response;
  }

  if (existingByMobile || existingByEmail) {
    await writeAuditLog({
      actorType: "SYSTEM",
      action: "REGISTRATION_DUPLICATE_BLOCKED",
      entityType: "User",
      metadata: { email, mobileNumber, ip },
      ipAddress: ip,
    });
    return apiError(
      "This mobile number or email is already registered with a different account. Please use your original details.",
      409,
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        mobileNumber,
        email,
        emirate: parsed.data.emirate,
        ageConfirmed,
        termsAcceptedAt: acceptedTerms ? new Date() : null,
        registrationIp: ip,
        deviceFingerprint,
      },
    });

    await writeAuditLog({
      actorType: "USER",
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
    });

    const token = await signParticipantSession({ userId: user.id, campaignId: campaign.id });
    const response = apiSuccess({ userId: user.id, returning: false }, 201);
    response.cookies.set(PARTICIPANT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 6 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (err) {
    logger.error("Registration failed", { err: String(err) });
    return apiError("Registration failed. Please try again.", 500);
  }
}
