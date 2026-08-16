/**
 * POST /api/payroll/team-member/[id]/onboard
 *
 * Kick off Treasury onboarding for a team member. Creates a Custom
 * Connect account with `transfers + treasury` capabilities (mirrors
 * landlord onboarding) and returns a Stripe-hosted Account Link URL.
 * The team member completes KYC + W9 on Stripe's pages.
 *
 * Idempotent — reusing the team member's row creates a fresh Account
 * Link if Stripe still wants more info.
 *
 * Body: {} (uses team member id from path)
 *
 * Auth: must be the landlord owner. Plan: Pro or Enterprise (basic+).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { SERVER_URL } from '@/lib/constants';
import { getPayrollAccess, PayrollAccessError } from '@/lib/services/payroll-access';
import { deriveOnboardingStatus, persistOnboardingStatus } from '@/types/stripe';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertAtLeastBasic();

    const { id: teamMemberId } = await params;
    const tm = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        landlordId: true,
        invitedEmail: true,
        user: { select: { email: true, name: true } },
        compensation: {
          select: {
            id: true,
            stripeConnectAccountId: true,
            treasuryOnboardingStatus: true,
          },
        },
      },
    });
    if (!tm) {
      return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
    }
    if (tm.landlordId !== access.landlordId) {
      return NextResponse.json(
        { error: 'Cannot onboard a team member from another organization.' },
        { status: 403 }
      );
    }

    const email = tm.user?.email || tm.invitedEmail;
    if (!email) {
      return NextResponse.json(
        { error: 'Team member must have an email before onboarding.' },
        { status: 400 }
      );
    }
    const name = tm.user?.name || email.split('@')[0];

    let connectedAccountId =
      tm.compensation?.stripeConnectAccountId ?? null;

    // 1. Validate or create the Connect account.
    if (connectedAccountId) {
      try {
        await stripe.accounts.retrieve(connectedAccountId);
      } catch (err: any) {
        if (err?.code === 'account_invalid' || err?.statusCode === 404) {
          connectedAccountId = null;
        } else {
          throw err;
        }
      }
    }
    if (!connectedAccountId) {
      const account = await stripe.accounts.create({
        country: 'US',
        email,
        capabilities: {
          transfers: { requested: true },
          treasury: { requested: true },
          us_bank_account_ach_payments: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name,
          mcc: '7392', // Management consulting / contractor services
          product_description:
            'Independent contractor (1099) work via Property Flow HQ',
        },
        controller: {
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          stripe_dashboard: { type: 'none' },
          requirement_collection: 'application',
        },
        metadata: {
          teamMemberId: tm.id,
          landlordId: tm.landlordId,
          platform: 'propertyflowhq',
          type: 'team_member_treasury',
        },
      });
      connectedAccountId = account.id;
    }

    // 2. Persist on the compensation row (create if it doesn't exist).
    if (tm.compensation) {
      await prisma.teamMemberCompensation.update({
        where: { id: tm.compensation.id },
        data: {
          stripeConnectAccountId: connectedAccountId,
          treasuryOnboardingStatus: persistOnboardingStatus('pending'),
        },
      });
    } else {
      await prisma.teamMemberCompensation.create({
        data: {
          teamMemberId: tm.id,
          stripeConnectAccountId: connectedAccountId,
          treasuryOnboardingStatus: persistOnboardingStatus('pending'),
        },
      });
    }

    // 3. Generate a hosted Account Link.
    const link = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: `${SERVER_URL}/api/payroll/team-member/${tm.id}/onboard`,
      return_url: `${SERVER_URL}/admin/team/payroll?onboarded=${tm.id}`,
      type: 'account_onboarding',
      collection_options: { fields: 'eventually_due' },
    });

    return NextResponse.json({
      success: true,
      accountId: connectedAccountId,
      url: link.url,
    });
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    console.error('[payroll/team-member/onboard] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not start onboarding.' },
      { status: 500 }
    );
  }
}

/**
 * GET — return current onboarding status for the team member. The
 * settings UI hits this on mount + after the user returns from Stripe.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertAtLeastBasic();

    const { id } = await params;
    const tm = await prisma.teamMember.findUnique({
      where: { id },
      select: {
        landlordId: true,
        compensation: {
          select: {
            stripeConnectAccountId: true,
            stripeFinancialAccountId: true,
            treasuryOnboardingStatus: true,
            treasuryEnabled: true,
            treasuryVerifiedAt: true,
          },
        },
      },
    });
    if (!tm || tm.landlordId !== access.landlordId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    const comp = tm.compensation;

    // If we have a Connect account, sync status with Stripe — the spec
    // wants live status, not a stale DB snapshot.
    if (comp?.stripeConnectAccountId) {
      try {
        const account = await stripe.accounts.retrieve(
          comp.stripeConnectAccountId
        );
        const newStatus = deriveOnboardingStatus(account);
        const treasuryActive = account.capabilities?.treasury === 'active';

        if (
          comp.treasuryOnboardingStatus !== newStatus ||
          comp.treasuryEnabled !== treasuryActive
        ) {
          await prisma.teamMemberCompensation.update({
            where: { teamMemberId: id },
            data: {
              treasuryOnboardingStatus: persistOnboardingStatus(newStatus),
              treasuryEnabled: treasuryActive,
              ...(treasuryActive && !comp.treasuryVerifiedAt
                ? { treasuryVerifiedAt: new Date() }
                : {}),
            },
          });
        }

        // Auto-provision the financial account once Treasury is active so
        // the UI shows "ready to be paid" immediately.
        if (treasuryActive) {
          try {
            const { ensureFinancialAccountForTeamMember } = await import(
              '@/lib/services/payroll.service'
            );
            await ensureFinancialAccountForTeamMember(id);
          } catch (err) {
            console.error('[payroll/team-member/onboard GET] FA failed', err);
          }
        }

        return NextResponse.json({
          status: newStatus,
          payoutsEnabled: account.payouts_enabled ?? false,
          treasuryActive,
          hasFinancialAccount: !!comp.stripeFinancialAccountId,
          requirementsSummary:
            account.requirements?.disabled_reason ||
            (account.requirements?.currently_due?.length
              ? `${account.requirements.currently_due.length} step(s) remaining`
              : null),
        });
      } catch {
        // Fall through to the DB-only response.
      }
    }

    return NextResponse.json({
      status: comp?.treasuryOnboardingStatus ?? 'not_started',
      payoutsEnabled: false,
      treasuryActive: comp?.treasuryEnabled ?? false,
      hasFinancialAccount: !!comp?.stripeFinancialAccountId,
      requirementsSummary: null,
    });
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Could not load status.' },
      { status: 500 }
    );
  }
}
