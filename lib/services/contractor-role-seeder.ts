/**
 * Seeds default ContractorRole rows for a contractor based on their industry.
 *
 * Called once during onboarding or when a contractor first accesses team features.
 * Idempotent — skips roles that already exist.
 */

import { prisma } from '@/db/prisma';
import {
  CONTRACTOR_ROLES,
  getRolesForIndustry,
  type ContractorRoleDefinition,
} from '@/lib/config/contractor-roles';

/**
 * Seed the default roles for a contractor.
 * @param contractorId  The ContractorProfile.id
 * @param specialty     Primary specialty (e.g. "Plumbing") — used to pick industry template
 */
export async function seedContractorRoles(
  contractorId: string,
  specialty?: string,
): Promise<void> {
  // Check if roles already exist for this contractor
  const existingCount = await (prisma as any).contractorRole.count({
    where: { contractorId },
  });

  if (existingCount > 0) return; // Already seeded

  const roleIds = getRolesForIndustry(specialty || '');

  const rolesToCreate = roleIds
    .map((id) => CONTRACTOR_ROLES[id])
    .filter(Boolean) as ContractorRoleDefinition[];

  // Bulk create all roles
  for (const role of rolesToCreate) {
    await (prisma as any).contractorRole.create({
      data: {
        contractorId,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isCustom: false,
        isActive: true,
      },
    });
  }
}
