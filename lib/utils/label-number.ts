import { prisma } from '@/db/prisma';

export interface LabelConfig {
  id: string;
  prefix: string | null;
  suffix: string | null;
  sequenceType: string;
  currentSeq: number;
  padLength: number;
  startAt: number;
}

/**
 * Generate the next label number for a given config and atomically increment
 * the sequence counter in the DB.
 */
export async function generateLabelNumber(config: LabelConfig): Promise<string> {
  const { prefix = '', suffix = '', sequenceType, padLength, startAt } = config;

  let core: string;

  if (sequenceType === 'random') {
    // 8-char alphanumeric random
    core = Array.from({ length: 8 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(
        Math.floor(Math.random() * 32)
      )
    ).join('');
  } else if (sequenceType === 'date_prefix') {
    // YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');
    const updated = await prisma.contractorLabelConfig.update({
      where: { id: config.id },
      data: { currentSeq: { increment: 1 } },
      select: { currentSeq: true },
    });
    const seq = updated.currentSeq;
    core = `${dateStr}-${String(seq + startAt - 1).padStart(padLength, '0')}`;
  } else {
    // sequential (default)
    const updated = await prisma.contractorLabelConfig.update({
      where: { id: config.id },
      data: { currentSeq: { increment: 1 } },
      select: { currentSeq: true },
    });
    const seq = updated.currentSeq;
    core = String(seq + startAt - 1).padStart(padLength, '0');
  }

  return `${prefix ?? ''}${core}${suffix ?? ''}`;
}
