import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import DocumentsClientV2 from './documents-client-v2';

export const metadata: Metadata = {
  title: 'Document Center',
};

const AdminDocumentsPage = async () => {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    return (
      <main className="px-4 py-10">
        <div className="max-w-3xl mx-auto text-sm text-red-600">
          {landlordResult.message || 'Unable to load landlord context.'}
        </div>
      </main>
    );
  }

  const landlordId = landlordResult.landlord.id;

  // Fetch all data in parallel
  const [legalDocuments, scannedDocuments, properties, leaseTemplates, activeLeases] = await Promise.all([
    prisma.legalDocument.findMany({
      where: { landlordId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        // Pull the first property that uses this doc as its default lease,
        // and (separately) the first signed lease's property. That gives
        // us a property anchor for the new year-by-property view without
        // requiring a separate API endpoint.
        propertyDefaults: {
          select: { id: true, name: true },
          take: 1,
        },
        leases: {
          select: {
            unit: {
              select: {
                property: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          take: 1,
        },
      },
    }),
    prisma.scannedDocument.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.property.findMany({
      where: { landlordId },
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    }),
    // Fetch lease templates with property assignments
    prisma.leaseTemplate.findMany({
      where: { landlordId },
      include: {
        properties: {
          include: {
            property: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    // Fetch active leases for the Leases tab
    prisma.lease.findMany({
      where: {
        unit: {
          property: {
            landlordId,
          },
        },
        status: { in: ['active', 'pending_signature'] },
      },
      include: {
        tenant: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          select: {
            id: true,
            name: true,
            property: {
              select: { id: true, name: true },
            },
          },
        },
        signatureRequests: {
          select: {
            id: true,
            role: true,
            status: true,
            signedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <DocumentsClientV2
      legalDocuments={legalDocuments.map((doc) => ({
        ...doc,
        fileSize: doc.fileSize ?? undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        // Resolve a property for the year-by-property view. Prefer the
        // property that uses this doc as its default lease; fall back to
        // the first property the doc has been used for in a signed lease.
        property:
          doc.propertyDefaults?.[0] ??
          doc.leases?.[0]?.unit?.property ??
          null,
        // Strip the heavy relations from the props serialized to the
        // client — we only kept them to derive `property` above.
        propertyDefaults: undefined,
        leases: undefined,
      }))}
      scannedDocuments={scannedDocuments.map((doc) => ({
        ...doc,
        fileSize: doc.fileSize ?? undefined,
        ocrConfidence: doc.ocrConfidence ? Number(doc.ocrConfidence) : undefined,
        ocrProcessedAt: doc.ocrProcessedAt?.toISOString(),
        classifiedAt: doc.classifiedAt?.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }))}
      properties={properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address as { city?: string; state?: string } | null,
      }))}
      leaseTemplates={leaseTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        isDefault: t.isDefault,
        pdfUrl: t.pdfUrl,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        properties: t.properties.map((p: any) => ({
          id: p.property.id,
          name: p.property.name,
        })),
      }))}
      activeLeases={activeLeases.map((l) => ({
        id: l.id,
        status: l.status,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate?.toISOString() || null,
        rentAmount: Number(l.rentAmount),
        tenantSignedAt: l.tenantSignedAt?.toISOString() || null,
        landlordSignedAt: l.landlordSignedAt?.toISOString() || null,
        tenant: l.tenant ? {
          id: l.tenant.id,
          name: l.tenant.name,
          email: l.tenant.email,
        } : null,
        unit: {
          id: l.unit.id,
          name: l.unit.name,
          property: l.unit.property ? {
            id: l.unit.property.id,
            name: l.unit.property.name,
          } : null,
        },
        signatureRequests: l.signatureRequests.map((s) => ({
          id: s.id,
          role: s.role,
          status: s.status,
          signedAt: s.signedAt?.toISOString() || null,
        })),
      }))}
    />
  );
};

export default AdminDocumentsPage;
