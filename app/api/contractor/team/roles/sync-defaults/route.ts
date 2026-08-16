import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import { CONTRACTOR_ROLES } from '@/lib/config/contractor-roles';

const db = prisma as any;

/**
 * POST /api/contractor/team/roles/sync-defaults
 *
 * Updates the contractor's built-in (non-custom) roles to match the latest
 * permission sets defined in `lib/config/contractor-roles.ts`.
 *
 * Why this exists: when we improve a default role's permissions in the
 * codebase (e.g. giving Foreman access to inventory and the crew map),
 * existing contractor accounts already have stale ContractorRole rows in
 * the database. The seeder runs once and never re-runs. This endpoint lets
 * the owner explicitly opt into the new defaults — we don't auto-overwrite
 * because the owner may have intentionally tweaked them.
 *
 * Behavior:
 *   - Only built-in roles (`isCustom: false`) are touched.
 *   - Custom roles are left alone.
 *   - Per-employee permission overrides (ContractorEmployee.customPermissions)
 *     are also left alone, so any individual customizations survive.
 *   - Owner-only.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ca = await resolveContractorAuth(session.user.id);
    if (!ca) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 },
      );
    }
    if (!ca.isOwner) {
      return NextResponse.json(
        { error: 'Only the account owner can sync default roles' },
        { status: 403 },
      );
    }

    // Pull this contractor's existing built-in roles.
    const existingRoles: Array<{
      id: string;
      name: string;
      permissions: unknown;
    }> = await db.contractorRole.findMany({
      where: {
        contractorId: ca.contractorId,
        isCustom: false,
        isActive: true,
      },
      select: { id: true, name: true, permissions: true },
    });

    // Match each existing row to a config entry by name (case-insensitive).
    // We don't store the role's "key" in the DB, so name is what we have.
    const updates: Array<{
      id: string;
      name: string;
      previousCount: number;
      newCount: number;
    }> = [];

    for (const row of existingRoles) {
      const def = Object.values(CONTRACTOR_ROLES).find(
        (r) => r.name.toLowerCase() === row.name.toLowerCase(),
      );
      if (!def) continue; // Custom-named legacy row — skip
      // The Owner role is immutable.
      if (def.id === 'owner') continue;

      const previousCount = Array.isArray(row.permissions)
        ? (row.permissions as unknown[]).length
        : 0;

      await db.contractorRole.update({
        where: { id: row.id },
        data: {
          permissions: def.permissions,
          description: def.description,
        },
      });

      updates.push({
        id: row.id,
        name: row.name,
        previousCount,
        newCount: def.permissions.length,
      });
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      details: updates,
      message:
        updates.length === 0
          ? 'No built-in roles needed updating.'
          : `Updated ${updates.length} role${updates.length === 1 ? '' : 's'} to the latest defaults.`,
    });
  } catch (error) {
    console.error('POST /api/contractor/team/roles/sync-defaults', error);
    return NextResponse.json(
      { error: 'Failed to sync default roles' },
      { status: 500 },
    );
  }
}
