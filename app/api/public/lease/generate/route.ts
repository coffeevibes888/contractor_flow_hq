import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { generateLeaseHtml, getStateDisclosures, LeaseBuilderData, LEASE_DEFAULTS } from '@/lib/services/lease-builder';
import { renderLeaseHtml } from '@/lib/services/lease-template';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SENDER = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const FROM = `Property Flow HQ <${SENDER}>`;
const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

/** Fire-and-forget follow-up email after a free lease is generated. */
async function sendLeaseFollowUpEmail(email: string, state: string, landlordName: string) {
  if (!resend) {
    console.warn('[lease-generate] RESEND_API_KEY not set — skipping follow-up email');
    return;
  }
  const stateNames: Record<string, string> = {
    AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
    CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
    IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
    ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
    MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
    NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
    OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
    SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
    WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  };
  const stateName = stateNames[state] || state;
  const signUpUrl = `${SITE}/sign-up?email=${encodeURIComponent(email)}&utm_source=free_lease&utm_medium=email_followup`;
  const leaseUrl = `${SITE}/free-lease-builder`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${stateName} lease is ready — here's what's next`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:0.1em;text-transform:uppercase;">PropertyFlow HQ</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;">Your ${stateName} lease is ready ✓</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Hi ${landlordName || 'there'},
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Your free ${stateName} residential lease agreement was just generated. If you haven't saved it as a PDF yet, <a href="${leaseUrl}" style="color:#0ea5e9;font-weight:600;">go back and download it here</a>.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Now that your lease is done — here's what most landlords need next:
          </p>

          <!-- Feature list -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[
              ['📝', 'Unlimited leases', 'Generate a lease for every property and unit — no caps, no wait.'],
              ['✍️', 'E-signatures', 'Send your lease for signing. Tenants sign from their phone in minutes.'],
              ['💳', 'Online rent collection', 'Collect ACH or card payments. Auto late fees. Full payment history.'],
              ['🏠', 'Tenant portal', 'Your tenants get their own login to pay rent, submit maintenance, and view documents.'],
              ['🔧', 'Maintenance tracking', 'Work orders, photos, contractor assignments — all in one place.'],
              ['📊', 'Rental accounting', 'P&L, rent roll, and expense tracking. Tax-ready reports at year end.'],
            ].map(([icon, title, desc]) => `
            <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:20px;width:36px;vertical-align:top;padding-top:2px;">${icon}</td>
                <td>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${title}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join('')}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 4px;">
              <a href="${signUpUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
                Create Your Free Account →
              </a>
            </td></tr>
            <tr><td align="center">
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">14-day free trial · No credit card · Takes 2 minutes</p>
            </td></tr>
          </table>

          <!-- Pricing note -->
          <div style="margin-top:28px;padding:16px;background:#f0f9ff;border-radius:10px;border:1px solid #bae6fd;">
            <p style="margin:0;font-size:13px;color:#0369a1;">
              <strong>Plans from $39/month — flat rate.</strong> Whether you manage 1 unit or 100, you pay the same. No per-unit fees ever.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            PropertyFlow HQ · <a href="${SITE}" style="color:#9ca3af;">${SITE.replace('https://', '')}</a><br>
            You received this because you used the free lease builder. <a href="${SITE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch((err) => {
    console.error('[lease-generate] Follow-up email failed:', err);
  });
}

// Validate minimum fields needed to produce a readable lease
function validatePayload(body: Record<string, unknown>, requireEmail = true): string | null {
  if (!body.state || typeof body.state !== 'string') return 'state is required';
  if (!body.landlordLegalName || typeof body.landlordLegalName !== 'string') return 'landlordLegalName is required';
  if (!body.propertyAddress || typeof body.propertyAddress !== 'string') return 'propertyAddress is required';
  if (!body.tenantNames || !Array.isArray(body.tenantNames) || body.tenantNames.length === 0) return 'at least one tenantName is required';
  if (!body.monthlyRent || isNaN(Number(body.monthlyRent)) || Number(body.monthlyRent) <= 0) return 'monthlyRent must be a positive number';
  if (!body.leaseStartDate) return 'leaseStartDate is required';
  if (requireEmail && (!body.emailGate || typeof body.emailGate !== 'string')) return 'email is required to generate a free lease';
  return null;
}

// IPs that bypass the one-per-email gate (comma-separated in env)
const WHITELIST_IPS = (process.env.FREE_LEASE_WHITELIST_IPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Check session first so we can relax email requirement for signed-in users
  const session = await auth();
  const isSignedIn = !!session?.user?.id;

  const validationError = validatePayload(body, /* requireEmail */ !isSignedIn);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  // For signed-in users, use their session email; guests must provide one
  const email = isSignedIn
    ? (session!.user!.email ?? (body.emailGate as string | undefined) ?? '').trim().toLowerCase()
    : (body.emailGate as string).trim().toLowerCase();

  // ── Server-side free-lease gate (public/guest only) ───────────────────────
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const isWhitelisted = WHITELIST_IPS.length > 0 && WHITELIST_IPS.includes(clientIp);

  // Check if this email already has a FreeLeaseUsage record.
  // We no longer hard-block — a returning landlord who already generated a
  // lease is our highest-intent lead. Let them generate again; we just skip
  // creating a duplicate usage row and still show the sign-up CTA so the
  // lease-context flow captures the signup.
  const alreadyUsed = !isSignedIn && !isWhitelisted
    ? !!(await prisma.freeLeaseUsage.findUnique({ where: { email } }).catch(() => null))
    : false;

  // ── Build LeaseBuilderData from body ──────────────────────────────────────
  const state = (body.state as string).toUpperCase();
  const stateDisclosures = getStateDisclosures(state);
  const startDate = new Date(body.leaseStartDate as string);
  const endDate = body.leaseEndDate ? new Date(body.leaseEndDate as string) : undefined;

  const leaseData: LeaseBuilderData = {
    landlordLegalName: body.landlordLegalName as string,
    landlordCompanyName: (body.landlordCompanyName as string | undefined) || undefined,
    landlordAddress: (body.landlordAddress as string | undefined) || undefined,
    landlordEmail: (body.landlordEmail as string | undefined) || undefined,
    landlordPhone: (body.landlordPhone as string | undefined) || undefined,
    tenantNames: body.tenantNames as string[],
    tenantEmails: (body.tenantEmails as string[] | undefined) || [],
    propertyAddress: body.propertyAddress as string,
    unitNumber: (body.unitNumber as string | undefined) || undefined,
    maxOccupants: body.maxOccupants ? Number(body.maxOccupants) : undefined,
    leaseStartDate: startDate,
    leaseEndDate: endDate,
    isMonthToMonth: body.isMonthToMonth === true || body.isMonthToMonth === 'true',
    autoRenewal: body.autoRenewal === true || body.autoRenewal === 'true',
    renewalNoticeDays: Number(body.renewalNoticeDays) || LEASE_DEFAULTS.renewalNoticeDays,
    earlyTerminationFee: body.earlyTerminationFee ? Number(body.earlyTerminationFee) : undefined,
    earlyTerminationNoticeDays: body.earlyTerminationNoticeDays ? Number(body.earlyTerminationNoticeDays) : undefined,
    monthlyRent: Number(body.monthlyRent),
    rentDueDay: Number(body.rentDueDay) || 1,
    gracePeriodDays: Number(body.gracePeriodDays) || LEASE_DEFAULTS.gracePeriodDays,
    acceptedPaymentMethods: (body.acceptedPaymentMethods as string[] | undefined) || LEASE_DEFAULTS.acceptedPaymentMethods,
    bouncedCheckFee: body.bouncedCheckFee ? Number(body.bouncedCheckFee) : undefined,
    allowPartialPayments: body.allowPartialPayments === true || body.allowPartialPayments === 'true',
    lateFeeAmount: body.lateFeeAmount ? Number(body.lateFeeAmount) : undefined,
    lateFeePercent: body.lateFeePercent ? Number(body.lateFeePercent) : undefined,
    lateFeeStartDay: Number(body.lateFeeStartDay) || LEASE_DEFAULTS.lateFeeStartDay,
    maxLateFee: body.maxLateFee ? Number(body.maxLateFee) : undefined,
    securityDepositAmount: Number(body.securityDepositAmount) || Number(body.monthlyRent),
    depositUseCases: (body.depositUseCases as string[] | undefined) || LEASE_DEFAULTS.depositUseCases,
    depositReturnDays: Number(body.depositReturnDays) || stateDisclosures.depositReturnDays,
    depositNotLastMonthRent: body.depositNotLastMonthRent !== false,
    tenantPaysUtilities: (body.tenantPaysUtilities as string[] | undefined) || LEASE_DEFAULTS.tenantPaysUtilities,
    landlordPaysUtilities: (body.landlordPaysUtilities as string[] | undefined) || LEASE_DEFAULTS.landlordPaysUtilities,
    petsAllowed: body.petsAllowed === true || body.petsAllowed === 'true',
    petDeposit: body.petDeposit ? Number(body.petDeposit) : undefined,
    petRent: body.petRent ? Number(body.petRent) : undefined,
    petRestrictions: (body.petRestrictions as string | undefined) || undefined,
    petRules: (body.petRules as string | undefined) || undefined,
    smokingAllowed: body.smokingAllowed === true || body.smokingAllowed === 'true',
    smokingAreas: (body.smokingAreas as string | undefined) || undefined,
    quietHoursStart: (body.quietHoursStart as string | undefined) || '10:00 PM',
    quietHoursEnd: (body.quietHoursEnd as string | undefined) || '8:00 AM',
    parkingRules: (body.parkingRules as string | undefined) || undefined,
    guestPolicy: (body.guestPolicy as string | undefined) || undefined,
    tenantMaintenanceResponsibilities: (body.tenantMaintenanceResponsibilities as string[] | undefined) || LEASE_DEFAULTS.tenantMaintenanceResponsibilities,
    emergencyContactPhone: (body.emergencyContactPhone as string | undefined) || undefined,
    emergencyContactEmail: (body.emergencyContactEmail as string | undefined) || undefined,
    entryNoticeDays: Number(body.entryNoticeDays) || LEASE_DEFAULTS.entryNoticeDays,
    entryReasons: (body.entryReasons as string[] | undefined) || LEASE_DEFAULTS.entryReasons,
    rentersInsuranceRequired: body.rentersInsuranceRequired === true || body.rentersInsuranceRequired === 'true',
    minInsuranceCoverage: body.minInsuranceCoverage ? Number(body.minInsuranceCoverage) : undefined,
    moveOutNoticeDays: Number(body.moveOutNoticeDays) || LEASE_DEFAULTS.moveOutNoticeDays,
    moveOutCleaningRequirements: (body.moveOutCleaningRequirements as string[] | undefined) || LEASE_DEFAULTS.moveOutCleaningRequirements,
    additionalTerms: (body.additionalTerms as string[] | undefined) || undefined,
    hoaRules: (body.hoaRules as string | undefined) || undefined,
    leadPaintDisclosure: stateDisclosures.leadPaint,
    bedBugDisclosure: stateDisclosures.bedBugs,
    moldDisclosure: stateDisclosures.mold,
    radonDisclosure: stateDisclosures.radon,
    floodZoneDisclosure: stateDisclosures.floodZone,
    asbestosDisclosure: stateDisclosures.asbestos,
    state,
    signingDate: new Date(),
  };

  const html = generateLeaseHtml(leaseData);

  // Also generate a signing-template HTML (renderLeaseHtml) that contains the
  // /init_l1/…/init_l19/ and /sig_landlord/ placeholders the signing modal needs.
  const signingHtml = renderLeaseHtml({
    landlordName: leaseData.landlordLegalName,
    tenantName: leaseData.tenantNames[0] ?? 'Tenant',
    propertyLabel: leaseData.propertyAddress,
    leaseStartDate: leaseData.leaseStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    leaseEndDate: leaseData.leaseEndDate
      ? leaseData.leaseEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Month-to-Month',
    rentAmount: leaseData.monthlyRent.toLocaleString(),
    billingDayOfMonth: String(leaseData.rentDueDay ?? 1),
    todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  });

  // ── Record lead + send follow-up only for guest/public users ─────────────
  if (!isSignedIn) {
    const ip = clientIp === '127.0.0.1' &&
      !req.headers.get('x-forwarded-for') &&
      !req.headers.get('x-real-ip')
        ? null
        : clientIp;
    const referrer = req.headers.get('referer') || null;
    const landlordName = (body.landlordLegalName as string | undefined) || '';

    const utmSource   = (body.utmSource   as string | undefined) || null;
    const utmMedium   = (body.utmMedium   as string | undefined) || null;
    const utmCampaign = (body.utmCampaign as string | undefined) || null;

    if (!alreadyUsed) {
      // First lease — create the usage record and send the follow-up email
      await prisma.freeLeaseUsage.create({
        data: {
          email,
          ipAddress:       ip,
          landlordName:    landlordName || null,
          state,
          propertyType:    (body.propertyType    as string | undefined) || null,
          propertyAddress: (body.propertyAddress as string | undefined) || null,
          monthlyRent:     body.monthlyRent ? Number(body.monthlyRent) : null,
          utmSource,
          utmMedium,
          utmCampaign,
          referrer,
        },
      }).catch(() => {});

      sendLeaseFollowUpEmail(email, state, landlordName).catch((err) => {
        console.error('[lease-generate] Unhandled error in follow-up email:', err);
      });
    }
    // If alreadyUsed: skip duplicate record, skip duplicate email — the
    // lease HTML still generated and the sign-up CTA will capture the lead.
  }

  return NextResponse.json({ html, signingHtml, isAuthenticated: isSignedIn });
}
