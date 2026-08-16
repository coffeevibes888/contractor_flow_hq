import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { EarningsSummaryPage } from '@/components/employee/pay-stubs-page';

export default async function PayPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Find team member
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, status: 'active' },
    include: {
      compensation: true,
      landlord: { select: { companyName: true } },
    },
  });

  if (!teamMember) {
    redirect('/');
  }

  // Get all payments
  const payments = await prisma.teamPayment.findMany({
    where: { teamMemberId: teamMember.id },
    orderBy: { paidAt: 'desc' },
    include: {
      timesheet: { select: { periodStart: true, periodEnd: true, totalHours: true } },
    },
  });

  // Calculate YTD earnings
  const currentYear = new Date().getFullYear();
  const ytdPayments = payments.filter(p => 
    p.paidAt && new Date(p.paidAt).getFullYear() === currentYear
  );
  const ytdGross = ytdPayments.reduce((sum, p) => sum + Number(p.grossAmount), 0);
  const ytdNet = ytdPayments.reduce((sum, p) => sum + Number(p.netAmount), 0);

  return (
    <EarningsSummaryPage
      companyName={teamMember.landlord.companyName || 'Company'}
      compensation={teamMember.compensation ? {
        payType: teamMember.compensation.payType,
        hourlyRate: teamMember.compensation.hourlyRate?.toString(),
        salaryAmount: teamMember.compensation.salaryAmount?.toString(),
      } : null}
      payments={payments.map(p => ({
        id: p.id,
        paymentType: p.paymentType,
        grossAmount: p.grossAmount.toString(),
        platformFee: p.platformFee.toString(),
        netAmount: p.netAmount.toString(),
        regularPay: p.regularPay?.toString(),
        overtimePay: p.overtimePay?.toString(),
        bonusAmount: p.bonusAmount?.toString(),
        description: p.description,
        status: p.status,
        paidAt: p.paidAt?.toISOString(),
        period: p.timesheet ? {
          start: p.timesheet.periodStart.toISOString(),
          end: p.timesheet.periodEnd.toISOString(),
          totalHours: p.timesheet.totalHours.toString(),
        } : null,
      }))}
      ytdGross={ytdGross}
      ytdNet={ytdNet}
    />
  );
}
