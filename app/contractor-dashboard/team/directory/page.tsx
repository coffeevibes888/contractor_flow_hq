import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { ContractorTeamDirectoryPage } from '@/components/contractor/team-pages/team-directory-page';
import { requireContractorPage } from '@/lib/contractor-page-guard';

export const metadata: Metadata = { title: 'Team Directory' };

export default async function DirectoryPage() {
  // Anyone on the contractor account with team.view can land here. Invite/edit
  // controls are gated separately in the UI based on what the API permits.
  const { contractorAuth } = await requireContractorPage({
    permission: 'team.view',
  });

  const profile = await prisma.contractorProfile.findUnique({
    where: { id: contractorAuth.contractorId },
    select: { id: true, subscriptionTier: true },
  });

  if (!profile) {
    return null;
  }

  const tier = profile.subscriptionTier || 'starter';
  const hasAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Team Directory</h1>
            <p className="text-slate-300 mb-6">Team management is available on the Pro plan.</p>
            {contractorAuth.isOwner ? (
              <Link
                href="/contractor-dashboard/settings/subscription"
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-full font-semibold transition-colors"
              >
                <Zap className="h-5 w-5" /> Upgrade to Pro
              </Link>
            ) : (
              <p className="text-sm text-slate-400">
                Ask your account owner to upgrade for team features.
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Load real team members. Owner sees everyone; employees with team.view
  // see everyone too (the data here is roster-level, not financial).
  const employees = await prisma.contractorEmployee.findMany({
    where: {
      contractorId: profile.id,
      status: { in: ['active', 'invited', 'inactive'] },
    },
    include: {
      assignedRole: { select: { id: true, name: true, permissions: true } },
    },
    orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
  });

  // Pull linked User records (name/email/image) in one shot for active members
  const userIds = employees
    .map((e) => e.userId)
    .filter((id): id is string => Boolean(id));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, image: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  // Shape into what TeamMembersTab expects
  const teamMembers = employees.map((e) => {
    const linkedUser = e.userId ? userById.get(e.userId) : null;
    return {
      id: e.id,
      userId: e.userId || '',
      role: e.role,
      roleId: e.roleId,
      status: (e.status === 'invited'
        ? 'pending'
        : e.status === 'active'
        ? 'active'
        : 'inactive') as 'pending' | 'active' | 'inactive',
      invitedEmail: e.email || undefined,
      permissions: Array.isArray(e.customPermissions)
        ? (e.customPermissions as string[])
        : Array.isArray(e.assignedRole?.permissions)
        ? (e.assignedRole!.permissions as string[])
        : [],
      joinedAt: e.onboardedAt?.toISOString(),
      createdAt: e.createdAt.toISOString(),
      assignedRole: e.assignedRole
        ? { id: e.assignedRole.id, name: e.assignedRole.name }
        : null,
      user: linkedUser
        ? {
            id: linkedUser.id,
            name: linkedUser.name || '',
            email: linkedUser.email || '',
            image: linkedUser.image || undefined,
          }
        : null,
    };
  });

  return (
    <main className="w-full pb-8">
      <ContractorTeamDirectoryPage
        members={teamMembers}
        isEnterprise={tier === 'enterprise'}
        canManageTeam={contractorAuth.permissions.includes('team.invite')}
        currentUserRole={contractorAuth.isOwner ? 'owner' : contractorAuth.roleName || 'employee'}
        isOwner={contractorAuth.isOwner}
      />
    </main>
  );
}
