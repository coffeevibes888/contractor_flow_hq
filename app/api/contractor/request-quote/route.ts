import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * POST /api/contractor/request-quote
 *
 * PUBLIC lead-capture endpoint. A visitor on a contractor's marketplace
 * profile fills out the "Get a Quote" form. We create a ContractorLead and
 * a ContractorLeadMatch linking it to that specific contractor so it shows
 * up in their leads pipeline.
 *
 * Security: this is intentionally unauthenticated (prospective customers
 * aren't logged in), but we:
 *   - only accept the contractor profile id from the body and VERIFY it
 *     exists + is public before creating anything
 *   - never trust client-supplied lead/customer/quote ids
 *   - attach the requester's userId only when they happen to be logged in
 *
 * Body: { contractorId, name, email, phone?, serviceType?, description }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contractorId,
      name,
      email,
      phone,
      serviceType,
      description,
    } = body ?? {};

    // ── Validate required fields ──────────────────────────────────────────
    if (!contractorId || !name || !email || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: contractorId, name, email, description' },
        { status: 400 },
      );
    }

    // Basic email sanity check — keep it permissive but reject obvious junk.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // ── Verify the target contractor exists and is publicly listed ────────
    const contractor = await prisma.contractorProfile.findFirst({
      where: { id: contractorId, isPublic: true },
      select: { id: true, specialties: true },
    });
    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found or not accepting quote requests' },
        { status: 404 },
      );
    }

    // Attach the requester's account if they're signed in (optional).
    const session = await auth().catch(() => null);
    const customerUserId = session?.user?.id ?? null;

    const projectType =
      (typeof serviceType === 'string' && serviceType.trim()) ||
      contractor.specialties[0] ||
      'general';

    // Leads expire after 7 days if unactioned (mirrors the lead model default).
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // ── Create the lead + the match to this contractor in one transaction ─
    const { lead, match } = await prisma.$transaction(async (tx) => {
      const lead = await tx.contractorLead.create({
        data: {
          source: 'subdomain',
          customerName: String(name).slice(0, 120),
          customerEmail: String(email).toLowerCase().slice(0, 200),
          customerPhone: phone ? String(phone).slice(0, 40) : null,
          customerUserId,
          projectType,
          projectDescription: String(description).slice(0, 4000),
          isExclusive: true,
          maxContractors: 1,
          stage: 'new',
          status: 'new',
          expiresAt,
        },
      });

      const match = await tx.contractorLeadMatch.create({
        data: {
          leadId: lead.id,
          contractorId: contractor.id,
          status: 'sent',
          sentAt: new Date(),
          matchReason: 'Direct quote request from contractor profile',
        },
      });

      return { lead, match };
    });

    // Fire the lead-matched event so the contractor gets notified through
    // the existing pipeline (email/push/in-app per their preferences).
    try {
      const { eventBus } = await import('@/lib/event-system');
      await eventBus.emit('contractor.lead_matched', {
        matchId: match.id,
        leadId: lead.id,
        contractorId: contractor.id,
        serviceType: projectType,
        leadScore: 0,
      });
    } catch (err) {
      // Non-fatal — the lead is still saved and visible in the pipeline.
      console.error('request-quote: lead_matched emit failed', err);
    }

    return NextResponse.json(
      { success: true, leadId: lead.id },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating quote request:', error);
    return NextResponse.json(
      { error: 'Failed to submit quote request' },
      { status: 500 },
    );
  }
}
