import { requireAdmin } from '@/lib/auth-guard';
import { getLandlordTenants } from '@/lib/actions/tenant.actions';
import { prisma } from '@/db/prisma';
import { randomBytes } from 'crypto';
import { TenantsClient } from './tenants-client';

export const metadata = {
  title: 'Tenants | Property Flow HQ',
  description: 'Manage your tenants and their lease information'
};

async function getUnassignedTenants(landlordId: string) {
  const links = await prisma.tenantLandlordLink.findMany({
    where: {
      landlordId,
      status: 'pending'
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          image: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return links.map(link => ({
    linkId: link.id,
    tenant: {
      id: link.tenant.id,
      name: link.tenant.name,
      email: link.tenant.email,
      phone: link.tenant.phoneNumber,
      image: link.tenant.image,
      signupDate: link.createdAt.toISOString()
    },
    signupMethod: link.signupMethod,
    inviteCode: link.inviteCode,
    daysWaiting: Math.floor((Date.now() - link.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  }));
}

export default async function TenantsPage() {
  await requireAdmin();

  const { tenants } = await getLandlordTenants();

  // Get landlord record (needed for unassigned tenants + invite banner)
  const session = await requireAdmin();
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
    include: { owner: { select: { email: true } } },
  });

  if (!landlord) {
    throw new Error('Landlord not found');
  }

  const unassignedTenants = await getUnassignedTenants(landlord.id);

  // ── Invite banner: reuse or create a generic (no propertyId) invite code ──
  let inviteBanner: { inviteCode: string; landlordEmail: string; pageUrl: string } | null = null;
  try {
    let codeRecord = await prisma.landlordInviteCode.findFirst({
      where: {
        landlordId: landlord.id,
        propertyId: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { code: true },
    });

    if (!codeRecord) {
      const newCode = randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
      codeRecord = await prisma.landlordInviteCode.create({
        data: { landlordId: landlord.id, code: newCode, isActive: true },
        select: { code: true },
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'https://www.propertyflowhq.com';

    inviteBanner = {
      inviteCode: codeRecord.code,
      landlordEmail: landlord.owner?.email || '',
      pageUrl: `${baseUrl}/tenant-start`,
    };
  } catch {
    // Non-fatal — page renders without the banner
  }

  // Serialize dates for client component
  const serializedTenants = tenants.map(tenant => ({
    ...tenant,
    startDate: tenant.startDate,
    endDate: tenant.endDate,
  }));

  return (
    <TenantsClient
      tenants={serializedTenants}
      unassignedTenants={unassignedTenants}
      landlordId={landlord.id}
      inviteBanner={inviteBanner}
    />
  );
}

// Made with Bob
