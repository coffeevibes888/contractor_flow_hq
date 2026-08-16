/**
 * Lease Template Service
 * Handles CRUD operations for lease templates and template resolution logic
 */

import { prisma } from '@/db/prisma';

// Types for lease template operations
export interface LeaseBuilderConfig {
  defaultLeaseDuration: number;
  autoRenewal: boolean;
  renewalNoticeDays: number;
  rentDueDay: number;
  gracePeriodDays: number;
  lateFeePercent: number;
  securityDepositMonths: number;
  petDeposit?: number;
  petRent?: number;
  cleaningFee?: number;
  tenantPaysUtilities: string[];
  landlordPaysUtilities: string[];
  petsAllowed: boolean;
  petRestrictions?: string;
  smokingAllowed: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  leadPaintDisclosure: boolean;
  moldDisclosure: boolean;
  bedBugDisclosure: boolean;
  additionalTerms?: string;
}

export interface SignatureFieldPosition {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'text';
  role: 'tenant' | 'landlord';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label?: string;
  sectionContext?: string;
}

export interface MergeFieldConfig {
  fieldName: string;
  source: 'tenant' | 'property' | 'unit' | 'application' | 'custom';
  sourceField: string;
}


export interface CreateTemplateInput {
  landlordId: string;
  name: string;
  type: 'builder' | 'uploaded_pdf';
  isDefault?: boolean;
  builderConfig?: LeaseBuilderConfig;
  pdfUrl?: string;
  signatureFields?: SignatureFieldPosition[];
  mergeFields?: MergeFieldConfig[];
  propertyIds?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  isDefault?: boolean;
  builderConfig?: LeaseBuilderConfig;
  pdfUrl?: string;
  signatureFields?: SignatureFieldPosition[];
  mergeFields?: MergeFieldConfig[];
  propertyIds?: string[];
}

// Use any for prisma operations to avoid type issues with extensions
const db = prisma as any;

/**
 * Create a new lease template
 */
export async function createTemplate(input: CreateTemplateInput) {
  const {
    landlordId,
    name,
    type,
    isDefault = false,
    builderConfig,
    pdfUrl,
    signatureFields,
    mergeFields,
    propertyIds = [],
  } = input;

  // If setting as default, unset any existing default for this landlord
  if (isDefault) {
    await db.leaseTemplate.updateMany({
      where: { landlordId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Create the template
  const template = await db.leaseTemplate.create({
    data: {
      landlordId,
      name,
      type,
      isDefault,
      builderConfig: builderConfig ? JSON.parse(JSON.stringify(builderConfig)) : null,
      pdfUrl,
      signatureFields: signatureFields ? JSON.parse(JSON.stringify(signatureFields)) : null,
      mergeFields: mergeFields ? JSON.parse(JSON.stringify(mergeFields)) : null,
    },
    include: {
      properties: { include: { property: true } },
    },
  });

  // Assign to properties if provided
  if (propertyIds.length > 0) {
    // Remove any existing assignments for these properties
    await db.propertyLeaseTemplate.deleteMany({
      where: { propertyId: { in: propertyIds } },
    });

    // Create new assignments
    await db.propertyLeaseTemplate.createMany({
      data: propertyIds.map((propertyId: string) => ({
        propertyId,
        leaseTemplateId: template.id,
      })),
    });

    // Return template with updated property associations
    return db.leaseTemplate.findUnique({
      where: { id: template.id },
      include: {
        properties: { include: { property: true } },
      },
    });
  }

  return template;
}

/**
 * Update an existing lease template
 */
export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  const {
    name,
    isDefault,
    builderConfig,
    pdfUrl,
    signatureFields,
    mergeFields,
    propertyIds,
  } = input;

  // Get existing template to check landlordId
  const existing = await db.leaseTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }

  // If setting as default, unset any existing default for this landlord
  if (isDefault) {
    await db.leaseTemplate.updateMany({
      where: { landlordId: existing.landlordId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  // Update the template
  const template = await db.leaseTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(isDefault !== undefined && { isDefault }),
      ...(builderConfig !== undefined && { builderConfig: JSON.parse(JSON.stringify(builderConfig)) }),
      ...(pdfUrl !== undefined && { pdfUrl }),
      ...(signatureFields !== undefined && { signatureFields: JSON.parse(JSON.stringify(signatureFields)) }),
      ...(mergeFields !== undefined && { mergeFields: JSON.parse(JSON.stringify(mergeFields)) }),
    },
    include: {
      properties: { include: { property: true } },
    },
  });

  // Update property assignments if provided
  if (propertyIds !== undefined) {
    await assignTemplateToProperties(id, propertyIds);
    return getTemplateById(id);
  }

  return template;
}

/**
 * Delete a lease template
 */
export async function deleteTemplate(id: string) {
  // First remove all property associations
  await db.propertyLeaseTemplate.deleteMany({
    where: { leaseTemplateId: id },
  });

  // Delete the template
  return db.leaseTemplate.delete({
    where: { id },
  });
}

/**
 * Get a template by ID
 */
export async function getTemplateById(id: string) {
  return db.leaseTemplate.findUnique({
    where: { id },
    include: {
      properties: { include: { property: true } },
      landlord: true,
    },
  });
}

/**
 * List templates for a landlord
 */
export async function listTemplates(landlordId: string, propertyId?: string) {
  if (propertyId) {
    // Get template assigned to specific property
    const assignment = await db.propertyLeaseTemplate.findUnique({
      where: { propertyId },
      include: {
        leaseTemplate: {
          include: {
            properties: { include: { property: true } },
          },
        },
      },
    });
    return assignment ? [assignment.leaseTemplate] : [];
  }

  // Get all templates for landlord
  return db.leaseTemplate.findMany({
    where: { landlordId },
    include: {
      properties: { include: { property: true } },
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Assign a template to properties
 * This removes any existing template assignments for the given properties
 */
export async function assignTemplateToProperties(templateId: string, propertyIds: string[]) {
  // Remove any existing assignments for these properties
  await db.propertyLeaseTemplate.deleteMany({
    where: { propertyId: { in: propertyIds } },
  });

  // Create new assignments
  if (propertyIds.length > 0) {
    await db.propertyLeaseTemplate.createMany({
      data: propertyIds.map((propertyId: string) => ({
        propertyId,
        leaseTemplateId: templateId,
      })),
    });
  }

  return getTemplateById(templateId);
}

/**
 * Remove template assignment from a property
 */
export async function removeTemplateFromProperty(propertyId: string) {
  return db.propertyLeaseTemplate.delete({
    where: { propertyId },
  }).catch(() => null); // Return null if no assignment exists
}

/**
 * Resolve which template to use for a property
 * Priority: 1. Property-specific template, 2. Landlord's default template, 3. null
 * 
 * CRITICAL: This is the core business logic for template resolution
 * - Builder leases auto-associate with property
 * - Uploaded PDFs require explicit property selection or they won't be used
 */
export async function resolveTemplateForProperty(propertyId: string, landlordId: string) {
  // 1. Check for property-specific template
  const propertyAssignment = await db.propertyLeaseTemplate.findUnique({
    where: { propertyId },
    include: {
      leaseTemplate: {
        include: {
          properties: { include: { property: true } },
        },
      },
    },
  });

  if (propertyAssignment) {
    return propertyAssignment.leaseTemplate;
  }

  // 2. Check for landlord's default template
  const defaultTemplate = await db.leaseTemplate.findFirst({
    where: { landlordId, isDefault: true },
    include: {
      properties: { include: { property: true } },
    },
  });

  if (defaultTemplate) {
    return defaultTemplate;
  }

  // 3. No template available
  return null;
}

/**
 * Get template for a property (alias for resolveTemplateForProperty)
 */
export async function getTemplateForProperty(propertyId: string, landlordId: string) {
  return resolveTemplateForProperty(propertyId, landlordId);
}

/**
 * Set a template as the default for a landlord
 */
export async function setDefaultTemplate(templateId: string, landlordId: string) {
  // Unset any existing default
  await db.leaseTemplate.updateMany({
    where: { landlordId, isDefault: true },
    data: { isDefault: false },
  });

  // Set the new default
  return db.leaseTemplate.update({
    where: { id: templateId },
    data: { isDefault: true },
    include: {
      properties: { include: { property: true } },
    },
  });
}
