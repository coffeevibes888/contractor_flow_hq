import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

const db = prisma as any;

/**
 * Owner-only role editing.
 *
 * The role permissions matrix is sensitive — letting any non-owner edit
 * roles would let them escalate their own access by editing whichever role
 * they happen to be assigned to. So both PATCH and DELETE require
 * `contractorAuth.isOwner === true`.
 *
 * The Owner role itself is treated as immutable: name/permissions can't be
 * changed and it can't be deleted (we'd otherwise be able to lock the owner
 * out of their own account).
 */

type RequireOwnerResult =
  | { error: { status: number; message: string }; contractorAuth?: undefined }
  | { error?: undefined; contractorAuth: NonNullable<Awaited<ReturnType<typeof resolveContractorAuth>>> };

async function requireOwner(): Promise<RequireOwnerResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }
  const ca = await resolveContractorAuth(session.user.id);
  if (!ca) {
    return { error: { status: 404, message: 'Contractor profile not found' } };
  }
  if (!ca.isOwner) {
    return {
      error: {
        status: 403,
        message: 'Only the account owner can edit roles',
      },
    };
  }
  return { contractorAuth: ca };
}

/**
 * PATCH /api/contractor/team/roles/[id]
 *
 * Update name, description, or permissions on a role. The Owner role is
 * locked. Default (built-in) roles can have their permissions edited but
 * not their name (so the UI's role-icon mapping still works).
 *
 * Body: { name?, description?, permissions? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireOwner();
    if (guard.error) {
      return NextResponse.json(
        { error: guard.error.message },
        { status: guard.error.status },
      );
    }
    const { contractorAuth } = guard;

    const { id } = await params;
    const body = await req.json();
    const { name, description, permissions } = body;

    const role = await db.contractorRole.findFirst({
      where: { id, contractorId: contractorAuth.contractorId, isActive: true },
    });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // The Owner role is immutable — owners always have full access.
    const isOwnerRole = role.name.toLowerCase() === 'owner';
    if (isOwnerRole) {
      return NextResponse.json(
        { error: 'The Owner role cannot be edited' },
        { status: 400 },
      );
    }

    // Built-in (non-custom) roles keep their name to preserve the role-icon
    // mapping in the UI. Owners can still rename their custom roles freely.
    const data: any = {};
    if (name !== undefined && typeof name === 'string') {
      if (!role.isCustom && name !== role.name) {
        return NextResponse.json(
          {
            error:
              "Built-in role names can't be changed. Create a custom role to use a different name.",
          },
          { status: 400 },
        );
      }
      data.name = name.trim();
    }
    if (description !== undefined) {
      data.description = description?.trim() || null;
    }
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return NextResponse.json(
          { error: 'Permissions must be an array' },
          { status: 400 },
        );
      }
      const cleaned = permissions.filter((p): p is string => typeof p === 'string');
      if (cleaned.length === 0) {
        return NextResponse.json(
          { error: 'A role must have at least one permission' },
          { status: 400 },
        );
      }
      data.permissions = cleaned;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided' },
        { status: 400 },
      );
    }

    const updated = await db.contractorRole.update({
      where: { id },
      data,
    });

    return NextResponse.json({ role: updated });
  } catch (error) {
    console.error('PATCH /api/contractor/team/roles/[id]', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/contractor/team/roles/[id]
 *
 * Soft-deactivate a role (we set isActive=false rather than dropping the row
 * because employees may still have foreign-key references). Default roles
 * with `canBeDeleted: false` cannot be deleted.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireOwner();
    if (guard.error) {
      return NextResponse.json(
        { error: guard.error.message },
        { status: guard.error.status },
      );
    }
    const { contractorAuth } = guard;

    const { id } = await params;

    const role = await db.contractorRole.findFirst({
      where: { id, contractorId: contractorAuth.contractorId, isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.name.toLowerCase() === 'owner') {
      return NextResponse.json(
        { error: 'The Owner role cannot be deleted' },
        { status: 400 },
      );
    }

    // Built-in default roles aren't deletable — the role config marks the
    // ones that ARE removable (e.g. payroll_manager). For now we treat all
    // non-custom roles as undeletable; owners can still soft-delete custom
    // ones.
    if (!role.isCustom) {
      return NextResponse.json(
        {
          error:
            "Built-in roles can't be deleted. You can edit their permissions instead.",
        },
        { status: 400 },
      );
    }

    if (role._count.employees > 0) {
      return NextResponse.json(
        {
          error: `${role._count.employees} team member(s) are still assigned to this role. Reassign them before deleting.`,
        },
        { status: 400 },
      );
    }

    await db.contractorRole.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contractor/team/roles/[id]', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 },
    );
  }
}
