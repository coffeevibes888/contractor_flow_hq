import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { htmlToPdfBuffer } from '@/lib/services/pdf';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface LeaseContext {
  landlordName: string;
  landlordEmail: string;
  propertyAddress: string;
  state: string;
  tenantName: string;
  tenantEmail: string;
  monthlyRent: string;
  /** Full lease HTML from the free lease builder */
  leaseHtml?: string;
}

// Signature field positions matching the standard lease template layout
function generateSignatureFields() {
  return [
    {
      id: 'landlord_signature',
      type: 'signature',
      role: 'landlord',
      page: -1,
      x: 10,
      y: 35,
      width: 25,
      height: 5,
      required: true,
      label: 'Landlord Signature',
    },
    {
      id: 'landlord_date',
      type: 'date',
      role: 'landlord',
      page: -1,
      x: 10,
      y: 42,
      width: 15,
      height: 3,
      required: true,
      label: 'Date',
    },
    {
      id: 'tenant_signature',
      type: 'signature',
      role: 'tenant',
      page: -1,
      x: 10,
      y: 50,
      width: 25,
      height: 5,
      required: true,
      label: 'Tenant Signature',
    },
    {
      id: 'tenant_date',
      type: 'date',
      role: 'tenant',
      page: -1,
      x: 10,
      y: 57,
      width: 15,
      height: 3,
      required: true,
      label: 'Date',
    },
  ];
}

/**
 * POST /api/onboarding/from-lease
 *
 * Called by /admin/onboarding/from-lease after a landlord signs up via
 * the free lease builder CTA. Atomically:
 *   1. Converts the lease HTML to PDF and uploads to Cloudinary
 *   2. Creates a real LegalDocument with fileUrl + signature fields
 *   3. Creates a LeaseTemplate and assigns it to the property
 *   4. Creates the Property and Unit
 *   5. Links property.defaultLeaseDocumentId to the LegalDocument
 *
 * The resulting property is fully wired: when the landlord later adds
 * the tenant, the lease is ready to sign and rent auto-schedules on
 * signature completion.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const allowedRoles = ['admin', 'superAdmin', 'landlord', 'property_manager'];

  if (!session?.user?.id || !allowedRoles.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success) {
    return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
  }
  const landlord = landlordResult.landlord;

  let ctx: LeaseContext;
  try {
    ctx = (await req.json()) as LeaseContext;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!ctx.propertyAddress) {
    return NextResponse.json({ error: 'Property address is required' }, { status: 400 });
  }

  // ── 1. Derive slug + readable name ────────────────────────────────────────
  const baseSlug = ctx.propertyAddress
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.property.findFirst({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const propertyName = ctx.propertyAddress.split(',')[0]?.trim() || ctx.propertyAddress;
  const rentAmount = parseFloat(ctx.monthlyRent) || 0;

  // ── 2. Build LegalDocument from lease HTML ────────────────────────────────
  //
  // If the landlord's lease HTML was stashed in sessionStorage and POSTed
  // here, convert it to a proper PDF, upload to Cloudinary, and create a
  // fully-configured LegalDocument — exactly the same as application-approval
  // does. This makes the document signable through the normal /sign/[token]
  // flow without any extra steps.
  //
  // If no HTML was provided (incognito / sessionStorage unavailable),
  // we still create the property but without a pre-built LegalDocument —
  // the landlord can generate one from the Admin → Legal Documents tab.

  let legalDocumentId: string | undefined;
  let leaseTemplateId: string | undefined;

  if (ctx.leaseHtml && ctx.leaseHtml.trim().length > 100) {
    const stateName = ctx.state ? ` (${ctx.state})` : '';
    const docName = `${propertyName} Lease${stateName}`;
    const safeSlug = slug.slice(0, 40);

    // ── PDF → Cloudinary ────────────────────────────────────────────────────
    let fileUrl: string;
    let fileType: string;
    let fileSize: number;

    try {
      const pdfBuffer = await htmlToPdfBuffer(ctx.leaseHtml);
      const upload = await uploadToCloudinary(pdfBuffer, {
        folder: `leases/${landlord.id}`,
        resource_type: 'raw',
        public_id: `lease-${safeSlug}-${Date.now()}`,
      });
      fileUrl = upload.secure_url;
      fileType = 'pdf';
      fileSize = pdfBuffer.length;
    } catch (pdfErr: any) {
      console.warn('[from-lease] PDF generation failed, falling back to HTML upload:', pdfErr?.message);
      const htmlBuffer = Buffer.from(ctx.leaseHtml, 'utf-8');
      const upload = await uploadToCloudinary(htmlBuffer, {
        folder: `leases/${landlord.id}`,
        resource_type: 'raw',
        public_id: `lease-${safeSlug}-${Date.now()}.html`,
      });
      fileUrl = upload.secure_url;
      fileType = 'html';
      fileSize = htmlBuffer.length;
    }

    // ── LegalDocument ────────────────────────────────────────────────────────
    const legalDoc = await prisma.legalDocument.create({
      data: {
        landlordId: landlord.id,
        name: docName,
        type: 'lease',
        category: 'generated',
        state: ctx.state || null,
        fileUrl,
        fileType,
        fileSize,
        isTemplate: false,
        isActive: true,
        isFieldsConfigured: true,
        description: `Imported from the free lease builder on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
        signatureFields: generateSignatureFields(),
      },
    });
    legalDocumentId = legalDoc.id;

    // ── LeaseTemplate — lets the property use "auto-generate from builder" ──
    // Unset any existing default template for this landlord first
    await (prisma as any).leaseTemplate.updateMany({
      where: { landlordId: landlord.id, isDefault: true },
      data: { isDefault: false },
    });

    const template = await (prisma as any).leaseTemplate.create({
      data: {
        landlordId: landlord.id,
        name: `${propertyName} — Lease Template`,
        type: 'builder',
        isDefault: true,
        pdfUrl: fileUrl,
        signatureFields: generateSignatureFields(),
      },
    });
    leaseTemplateId = template.id;
  }

  // ── 3. Property ───────────────────────────────────────────────────────────
  const property = await prisma.property.create({
    data: {
      landlordId: landlord.id,
      name: propertyName,
      slug,
      type: 'house',
      isPublished: false,
      address: {
        street: ctx.propertyAddress,
        city: '',
        state: ctx.state || '',
        zip: '',
        unit: null,
      },
      amenities: [],
      ...(legalDocumentId ? { defaultLeaseDocumentId: legalDocumentId } : {}),
    },
  });

  // Assign the template to this property
  if (leaseTemplateId) {
    await (prisma as any).propertyLeaseTemplate.create({
      data: {
        propertyId: property.id,
        leaseTemplateId,
      },
    });
  }

  // ── 4. Unit ───────────────────────────────────────────────────────────────
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: 'Main Unit',
      type: 'house',
      bedrooms: 0,
      bathrooms: 1,
      rentAmount,
      amenities: [],
      images: [],
      isAvailable: true, // available so the landlord can immediately assign a tenant
    },
  });

  // ── 5. Mark FreeLeaseUsage lead as converted + finish onboarding ─────────
  if (ctx.landlordEmail) {
    await prisma.freeLeaseUsage.updateMany({
      where: { email: ctx.landlordEmail.toLowerCase().trim(), converted: false },
      data: { converted: true, convertedAt: new Date() },
    }).catch(() => { /* non-fatal */ });
  }

  // Mark the user's onboarding as completed — the from-lease flow IS their
  // onboarding, so once the property is created they're done.
  await prisma.user.update({
    where: { id: session.user.id! },
    data: { onboardingCompleted: true },
  }).catch(() => { /* non-fatal */ });

  return NextResponse.json({
    success: true,
    propertyId: property.id,
    propertySlug: slug,
    propertyName,
    unitId: unit.id,
    legalDocumentId: legalDocumentId ?? null,
    leaseTemplateId: leaseTemplateId ?? null,
  });
}
