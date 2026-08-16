import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { instantBookingService } from '@/lib/services/instant-booking';
import { withCronLog } from '@/lib/ops/cron-log';

/**
 * POST /api/cron/release-escrow
 *
 * Cron job that auto-releases escrow funds to contractors after the dispute
 * window has passed (3 days post-completion with no dispute filed).
 *
 * Should be called every hour by Vercel Cron or similar scheduler.
 */
export async function POST() {
  try {
    return await withCronLog('release-escrow', async () => {
      const now = new Date();

      const readyForRelease = await prisma.contractorAppointment.findMany({
        where: {
          escrowStatus: 'held',
          autoReleaseAt: { lte: now },
          disputeFiledAt: null,
          status: 'completed',
        },
        select: { id: true },
      });

      let released = 0;
      let failed = 0;

      for (const appointment of readyForRelease) {
        try {
          await instantBookingService.releaseEscrow(appointment.id);
          released++;
        } catch (error) {
          console.error(`Failed to release escrow for ${appointment.id}:`, error);
          failed++;
        }
      }

      // No-shows: past endTime + 48h with no completion → refund
      const noShowCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const noShows = await prisma.contractorAppointment.findMany({
        where: {
          escrowStatus: 'held',
          status: 'confirmed',
          endTime: { lte: noShowCutoff },
          disputeFiledAt: null,
        },
        select: { id: true },
      });

      let refunded = 0;
      for (const appointment of noShows) {
        try {
          await prisma.contractorAppointment.update({
            where: { id: appointment.id },
            data: { status: 'no_show' },
          });
          await instantBookingService.cancelBooking(
            appointment.id,
            'contractor',
            'Contractor no-show — automatic refund'
          );
          refunded++;
        } catch (error) {
          console.error(`Failed to process no-show for ${appointment.id}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        released,
        failed,
        refunded,
        noShowsProcessed: noShows.length,
      });
    });
  } catch (error) {
    console.error('Escrow release cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
