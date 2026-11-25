/**
 * POST /api/partner/marketplace/hire
 *
 * Partner bridge: a trusted sister site (Property Flow HQ) hires one of this
 * site's marketplace contractors on behalf of a landlord/homeowner. We create,
 * in THIS site's database (the source of truth for contractor work):
 *
 *   1. a ContractorLead  — the inbound lead, with the external customer's
 *      contact details stored as plain fields (no shared user record needed);
 *   2. a ContractorCustomer — get-or-created for the contractor (unique on
 *      contractorId + email);
 *   3. a ContractorJob   — the work order, linked to the lead and customer.
 *
 * The lead is immediately marked "won" and linked to the job, matching the
 * existing create-from-lead conversion flow.
 *
 * Protected by the shared INTERNAL_API_SECRET (x-internal-secret header).
 *
 * Request body:
 *   contractor:  string            // ContractorProfile id OR slug (required)
 *   customer:    { name, email, phone?, externalUserId? }   // required
 *   project:     { title?, description, type?, priority?, scheduledDate?,
 *                  agreedPrice?, budgetMin?, budgetMax? }     // description req.
 *   property?:   { address?, city?, state?, zip? }
 *
 * Response: { leadId, jobId, jobNumber, contractorId, customerId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const contractorRef: string | undefined = body?.contractor;
  const customer = body?.customer ?? {};
  const project = body?.project ?? {};
  const property = body?.property ?? {};

  if (!contractorRef) {
    return NextResponse.json({ error: 'contractor (id or slug) is required' }, { status: 400 });
  }
  if (!customer.name || !customer.email) {
    return NextResponse.json({ error: 'customer name and email are required' }, { status: 400 });
  }
  if (!project.description) {
    return NextResponse.json({ error: 'project description is required' }, { status: 400 });
  }

  try {
    // 1. Resolve the contractor profile (must be a public marketplace profile).
    const isUUID = UUID_RE.test(contractorRef);
    const contractor = await prisma.contractorProfile.findFirst({
      where: isUUID ? { OR: [{ id: contractorRef }, { slug: contractorRef }] } : { slug: contractorRef },
      select: { id: true, isPublic: true, specialties: true, email: true, displayName: true, businessName: true },
    });
    if (!contractor || !contractor.isPublic) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const projectType: string =
      project.type || contractor.specialties[0] || 'general';
    const budgetMin =
      project.budgetMin != null ? Number(project.budgetMin) : null;
    const budgetMax =
      project.budgetMax != null ? Number(project.budgetMax) : null;
    const agreedPrice =
      project.agreedPrice != null ? Number(project.agreedPrice) : null;
    const scheduledDate = project.scheduledDate
      ? new Date(project.scheduledDate)
      : null;
    const priority =
      project.priority === 'urgent' || project.priority === 'high'
        ? project.priority
        : 'normal';

    // Everything in one transaction so we never leave a half-created hire.
    const result = await prisma.$transaction(async (tx) => {
      // 2. Lead
      const lead = await tx.contractorLead.create({
        data: {
          source: 'partner',
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || null,
          customerUserId: null, // external user — lives in the partner's DB
          projectType,
          projectTitle: project.title || null,
          projectDescription: project.description,
          budgetMin: budgetMin ?? agreedPrice,
          budgetMax: budgetMax ?? agreedPrice,
          propertyAddress: property.address || null,
          propertyCity: property.city || null,
          propertyState: property.state || null,
          propertyZip: property.zip || null,
          urgency: priority === 'urgent' ? 'urgent' : 'normal',
          isExclusive: true,
          maxContractors: 1,
          stage: 'won',
          status: 'completed',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // 3. Customer (get-or-create — unique on contractorId + email)
      const customerRow = await tx.contractorCustomer.upsert({
        where: {
          contractorId_email: { contractorId: contractor.id, email: customer.email },
        },
        update: {
          name: customer.name,
          phone: customer.phone || undefined,
        },
        create: {
          contractorId: contractor.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || null,
          address: property.address
            ? {
                street: property.address,
                city: property.city ?? null,
                state: property.state ?? null,
                zipCode: property.zip ?? null,
              }
            : undefined,
          status: 'customer',
          source: 'marketplace',
        },
      });

      // 4. Job (the work order) — jobNumber unique per contractor
      const jobCount = await tx.contractorJob.count({
        where: { contractorId: contractor.id },
      });
      const jobNumber = `JOB-${new Date().getFullYear()}-${String(jobCount + 1).padStart(4, '0')}`;

      const job = await tx.contractorJob.create({
        data: {
          contractorId: contractor.id,
          customerId: customerRow.id,
          leadId: lead.id,
          jobNumber,
          title: project.title || projectType,
          description: project.description,
          jobType: projectType,
          status: 'approved',
          address: property.address || null,
          city: property.city || null,
          state: property.state || null,
          zipCode: property.zip || null,
          estimatedCost: agreedPrice ?? budgetMax ?? budgetMin,
          priority,
        },
      });

      // Link the lead to the job it converted into.
      await tx.contractorLead.update({
        where: { id: lead.id },
        data: { convertedToJobId: job.id },
      });

      return { lead, customerRow, job };
    });

    return NextResponse.json({
      leadId: result.lead.id,
      jobId: result.job.id,
      jobNumber: result.job.jobNumber,
      contractorId: contractor.id,
      customerId: result.customerRow.id,
    });
  } catch (error) {
    console.error('[partner/marketplace/hire]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
