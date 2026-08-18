/**
 * POST /api/public/contract/generate
 *
 * Public (no-auth) endpoint for the free contract builder.
 * Generates a contractor service agreement using the same template engine
 * as the dashboard contract builder.
 *
 * One free contract per email (lead capture). Returning users are NOT blocked
 * (same philosophy as the free lease builder — high-intent leads).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import {
  generateContractorContractHtml,
  type ContractorContractData,
  TRADE_DEFINITIONS,
} from '@/lib/services/contractor-contract-builder';

function validatePayload(body: Record<string, unknown>): string | null {
  if (!body.contractorLegalName || typeof body.contractorLegalName !== 'string') return 'Your business/legal name is required';
  if (!body.customerName || typeof body.customerName !== 'string') return 'Customer name is required';
  if (!body.jobTitle || typeof body.jobTitle !== 'string') return 'Job title is required';
  if (!body.totalAmount || isNaN(Number(body.totalAmount)) || Number(body.totalAmount) <= 0) return 'Total amount must be a positive number';
  if (!body.tradeType || typeof body.tradeType !== 'string') return 'Trade type is required';
  if (!body.governingState || typeof body.governingState !== 'string') return 'Governing state is required';
  return null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check session — signed-in users skip email gate
  const session = await auth();
  const isSignedIn = !!session?.user?.id;

  // Email is required for guests
  const email = isSignedIn
    ? (session!.user!.email ?? (body.emailGate as string | undefined) ?? '').trim().toLowerCase()
    : ((body.emailGate as string) || '').trim().toLowerCase();

  if (!isSignedIn && (!email || !email.includes('@'))) {
    return NextResponse.json({ error: 'A valid email address is required to generate your free contract' }, { status: 422 });
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  // Build ContractorContractData from the request body
  const contractData: ContractorContractData = {
    contractorLegalName: body.contractorLegalName as string,
    contractorBusinessName: (body.contractorBusinessName as string) || undefined,
    contractorAddress: (body.contractorAddress as string) || '',
    contractorEmail: (body.contractorEmail as string) || email,
    contractorPhone: (body.contractorPhone as string) || '',
    contractorLicenseNumber: (body.contractorLicenseNumber as string) || undefined,
    contractorInsurancePolicy: (body.contractorInsurancePolicy as string) || undefined,

    customerName: body.customerName as string,
    customerAddress: (body.customerAddress as string) || '',
    customerEmail: (body.customerEmail as string) || '',
    customerPhone: (body.customerPhone as string) || '',

    tradeType: (body.tradeType as ContractorContractData['tradeType']) || 'general',
    jobSiteAddress: (body.jobSiteAddress as string) || '',
    jobTitle: body.jobTitle as string,
    jobDescription: (body.jobDescription as string) || '',
    deliverables: Array.isArray(body.deliverables) ? body.deliverables.filter(Boolean) : [],

    startDate: (body.startDate as string) || undefined,
    completionDate: (body.completionDate as string) || undefined,
    estimatedHours: body.estimatedHours ? Number(body.estimatedHours) : undefined,
    milestoneSchedule: Array.isArray(body.milestones)
      ? body.milestones.map((m: any) => ({ name: m.name || '', amount: Number(m.amount) || 0, description: m.description || '' }))
      : undefined,

    totalAmount: Number(body.totalAmount),
    depositAmount: body.depositAmount ? Number(body.depositAmount) : undefined,
    retainagePercent: body.retainagePercent ? Number(body.retainagePercent) : undefined,
    paymentTerms: (body.paymentTerms as ContractorContractData['paymentTerms']) || 'due_on_completion',
    lateFeePercent: body.lateFeePercent ? Number(body.lateFeePercent) : 1.5,

    materialsProvidedBy: (body.materialsProvidedBy as 'contractor' | 'customer' | 'mixed') || 'contractor',
    permitsProvidedBy: (body.permitsProvidedBy as 'contractor' | 'customer') || 'contractor',
    wasteRemovalIncluded: body.wasteRemovalIncluded !== false,

    warrantyPeriodDays: Number(body.warrantyPeriodDays) || 90,
    warrantyDescription: (body.warrantyDescription as string) || undefined,

    generalLiability: (body.generalLiability as string) || undefined,
    workersCompIncluded: body.workersCompIncluded !== false,

    terminationNoticeDays: Number(body.terminationNoticeDays) || 30,
    curePeriodDays: Number(body.curePeriodDays) || 10,

    disputeResolution: (body.disputeResolution as 'arbitration' | 'litigation') || 'arbitration',
    governingState: body.governingState as string,

    subcontractorsAllowed: body.subcontractorsAllowed === true,
    additionalTerms: (body.additionalTerms as string) || undefined,

    signingDate: new Date(),
  };

  // Generate the HTML
  const html = generateContractorContractHtml(contractData);

  // Lead capture — record usage (one per email, don't block repeats)
  if (!isSignedIn && email) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const urlParams = new URL(req.url).searchParams;

    try {
      const existing = await prisma.freeContractUsage.findUnique({ where: { email } });

      if (!existing) {
        await prisma.freeContractUsage.create({
          data: {
            email,
            contractorName: contractData.contractorLegalName,
            businessName: contractData.contractorBusinessName || null,
            ipAddress: clientIp,
            tradeType: contractData.tradeType,
            customerName: contractData.customerName,
            jobTitle: contractData.jobTitle,
            totalAmount: contractData.totalAmount,
            governingState: contractData.governingState,
            utmSource: urlParams.get('utm_source') || (body.utmSource as string) || null,
            utmMedium: urlParams.get('utm_medium') || (body.utmMedium as string) || null,
            utmCampaign: urlParams.get('utm_campaign') || (body.utmCampaign as string) || null,
            referrer: req.headers.get('referer') || null,
            contractHtml: html,
          },
        });

        // Send follow-up email (non-blocking)
        sendFollowUpEmail(email, contractData.contractorLegalName, contractData.tradeType).catch(() => {});
      }
    } catch (err) {
      // Don't block generation if lead capture fails
      console.error('[free-contract-generate] Lead capture failed:', err);
    }
  }

  return NextResponse.json({
    success: true,
    html,
    isAuthenticated: isSignedIn,
    trade: TRADE_DEFINITIONS[contractData.tradeType]?.label || 'General Contractor',
  });
}

async function sendFollowUpEmail(email: string, contractorName: string, tradeType: string) {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const senderEmail = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';
    const tradeName = TRADE_DEFINITIONS[tradeType as keyof typeof TRADE_DEFINITIONS]?.label || 'contractor';

    await resend.emails.send({
      from: `PropertyFlow HQ <${senderEmail}>`,
      to: email,
      subject: `Your ${tradeName} contract is ready — here's what's next`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 22px; color: #111;">Hey ${contractorName.split(' ')[0]},</h1>
          <p style="color: #4b5563; line-height: 1.7;">
            Your free service agreement is ready. You can print it as a PDF or send it for e-signature.
          </p>
          <p style="color: #4b5563; line-height: 1.7;">
            <strong>Want to send it for e-signature, track payments, and manage your whole business in one place?</strong>
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://www.propertyflowhq.com/sign-up?role=contractor&utm_source=free_contract&utm_medium=email&utm_campaign=follow_up"
              style="display: inline-block; background: linear-gradient(135deg, #f43f5e, #f97316); color: white; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">
              Start Free 14-Day Trial
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">
            $99/month after trial. No credit card required to start. Cancel anytime.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[free-contract-generate] Follow-up email failed:', err);
  }
}
