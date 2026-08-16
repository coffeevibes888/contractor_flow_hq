import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { depositService } from '@/lib/services/deposit-service';
import { DeductionCategory, DepositRefundMethod } from '@/types/tenant-lifecycle';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 400 });
    }
    const landlordId = landlordResult.landlord.id;

    const body = await req.json();
    const { leaseId, originalAmount, deductions, refundMethod, notes } = body || {};

    // Validate required fields
    if (!leaseId) {
      return NextResponse.json({ message: 'Lease ID is required' }, { status: 400 });
    }
    if (originalAmount === undefined || originalAmount < 0) {
      return NextResponse.json({ message: 'Valid original amount is required' }, { status: 400 });
    }

    const validRefundMethods: DepositRefundMethod[] = ['check', 'ach', 'pending'];
    if (refundMethod && !validRefundMethods.includes(refundMethod)) {
      return NextResponse.json({ 
        message: 'Invalid refund method. Must be one of: ' + validRefundMethods.join(', ') 
      }, { status: 400 });
    }

    // Validate deductions
    const validCategories: DeductionCategory[] = ['damages', 'unpaid_rent', 'cleaning', 'repairs', 'other'];
    if (deductions && Array.isArray(deductions)) {
      for (const deduction of deductions) {
        if (!deduction.category || !validCategories.includes(deduction.category)) {
          return NextResponse.json({ 
            message: 'Invalid deduction category. Must be one of: ' + validCategories.join(', ') 
          }, { status: 400 });
        }
        if (deduction.amount === undefined || deduction.amount < 0) {
          return NextResponse.json({ message: 'Valid deduction amount is required' }, { status: 400 });
        }
        if (!deduction.description || deduction.description.trim().length === 0) {
          return NextResponse.json({ message: 'Deduction description is required' }, { status: 400 });
        }
      }
    }

    // Verify lease exists and belongs to landlord
    const lease = await prisma.lease.findFirst({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, email: true, name: true } },
        unit: { 
          select: { 
            id: true, 
            name: true, 
            property: { select: { id: true, name: true, landlordId: true } } 
          } 
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
    }
    if (lease.unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Unauthorized access to this lease' }, { status: 403 });
    }

    // Create deposit disposition using service
    const disposition = await depositService.createDisposition({
      leaseId,
      originalAmount: parseFloat(originalAmount),
      deductions: deductions || [],
      refundMethod: refundMethod || 'pending',
      notes,
    });

    return NextResponse.json({
      success: true,
      disposition,
    });
  } catch (error) {
    console.error('Create deposit disposition error:', error);
    return NextResponse.json({ message: 'Failed to create deposit disposition' }, { status: 500 });
  }
}
