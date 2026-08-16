import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profile
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Get lead details
    const lead = await prisma.contractorLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get or create customer
    let customer = await prisma.contractorCustomer.findFirst({
      where: {
        contractorId: contractorProfile.id,
        email: lead.customerEmail,
      },
    });

    if (!customer) {
      customer = await prisma.contractorCustomer.create({
        data: {
          contractorId: contractorProfile.id,
          name: lead.customerName,
          email: lead.customerEmail,
          phone: lead.customerPhone || undefined,
          address: lead.propertyAddress
            ? {
                street: lead.propertyAddress,
                city: lead.propertyCity,
                state: lead.propertyState,
                zipCode: lead.propertyZip,
              }
            : undefined,
          source: 'marketplace',
        },
      });
    }

    // Generate job number
    const jobCount = await prisma.contractorJob.count({
      where: { contractorId: contractorProfile.id },
    });
    const jobNumber = `JOB-${new Date().getFullYear()}-${String(jobCount + 1).padStart(4, '0')}`;

    // Get the latest quote for this lead
    const latestQuote = await prisma.contractorQuote.findFirst({
      where: {
        leadId,
        contractorId: contractorProfile.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create job
    const job = await prisma.contractorJob.create({
      data: {
        contractorId: contractorProfile.id,
        customerId: customer.id,
        leadId,
        jobNumber,
        title: lead.projectTitle || lead.projectType,
        description: lead.projectDescription,
        jobType: lead.projectType,
        status: 'approved',
        address: lead.propertyAddress,
        city: lead.propertyCity,
        state: lead.propertyState,
        zipCode: lead.propertyZip,
        estimatedCost: latestQuote?.totalPrice || lead.budgetMax || lead.budgetMin,
        priority: lead.urgency === 'emergency' ? 'urgent' : 'normal',
      },
    });

    // Update lead status
    await prisma.contractorLead.update({
      where: { id: leadId },
      data: {
        stage: 'won',
        status: 'completed',
        convertedToJobId: job.id,
      },
    });

    // Update lead match
    await prisma.contractorLeadMatch.updateMany({
      where: {
        leadId,
        contractorId: contractorProfile.id,
      },
      data: {
        status: 'won',
        wasBooked: true,
        jobValue: latestQuote?.totalPrice || lead.budgetMax || lead.budgetMin,
      },
    });

    return NextResponse.json({
      success: true,
      job,
      customer,
      message: 'Job created successfully from lead',
    });
  } catch (error) {
    console.error('Error creating job from lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
