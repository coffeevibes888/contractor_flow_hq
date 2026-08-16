import { NextResponse } from 'next/server';
import { AccountingAccessDeniedError } from './feature-gate';

type PrismaLikeError = {
  name?: string;
  code?: string;
  message?: string;
  meta?: { code?: string; message?: string; target?: string[]; cause?: string };
};

const SCHEMA_GONE_HINT =
  'Accounting schema has not been applied to this database. Run `npx prisma migrate deploy` (or `npx prisma db push` for dev) then refresh.';

function isSchemaMissingError(err: PrismaLikeError): boolean {
  if (
    err?.name !== 'PrismaClientKnownRequestError' &&
    err?.name !== 'PrismaClientUnknownRequestError'
  ) {
    return false;
  }
  // P2021 = table does not exist, P2022 = column does not exist
  if (err.code === 'P2021' || err.code === 'P2022') return true;
  const metaMsg = (err.meta?.code || err.meta?.message || '').toString().toLowerCase();
  if (metaMsg.includes('does not exist') || metaMsg.includes('relation') || metaMsg.includes('column')) {
    return true;
  }
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('does not exist') && (msg.includes('relation') || msg.includes('table') || msg.includes('column'))) {
    return true;
  }
  return false;
}

export function handleAccountingApiError(e: unknown): NextResponse {
  if (e instanceof AccountingAccessDeniedError) {
    return NextResponse.json(
      { success: false, message: e.message, code: 'TIER_LOCKED', requiredTier: e.requiredTier },
      { status: 403 }
    );
  }
  if (e && typeof e === 'object') {
    const prismaErr = e as PrismaLikeError;
    if (isSchemaMissingError(prismaErr)) {
      console.error('[accounting-api] schema not migrated:', prismaErr.code, prismaErr.message);
      return NextResponse.json(
        { success: false, code: 'SCHEMA_NOT_MIGRATED', message: SCHEMA_GONE_HINT },
        { status: 503 }
      );
    }
    if (prismaErr.name === 'PrismaClientKnownRequestError' && prismaErr.code === 'P2025') {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Record not found' },
        { status: 404 }
      );
    }
  }
  console.error('[accounting-api] unhandled error:', e);
  const message =
    e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
      ? (e as { message: string }).message
      : 'Internal server error';
  return NextResponse.json(
    { success: false, code: 'INTERNAL', message },
    { status: 500 }
  );
}
