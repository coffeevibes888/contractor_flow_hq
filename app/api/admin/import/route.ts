/**
 * POST /api/admin/import
 *
 * Accepts a multipart/form-data upload with:
 *   - file: Excel (.xlsx, .xls) or CSV file
 *   - type: "properties" | "units" | "tenants" | "full"
 *   - dryRun: "true" | "false"  (preview without writing)
 *
 * Returns a JSON summary of what was / would be created.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import * as XLSX from 'xlsx';
import slugify from 'slugify';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportRow = Record<string, string | number | null | undefined>;

type ImportResult = {
  success: boolean;
  dryRun: boolean;
  summary: {
    propertiesCreated: number;
    propertiesSkipped: number;
    unitsCreated: number;
    unitsSkipped: number;
    tenantsCreated: number;
    tenantsSkipped: number;
    leasesCreated: number;
    leasesSkipped: number;
  };
  rows: RowResult[];
  errors: string[];
};

type RowResult = {
  row: number;
  status: 'created' | 'skipped' | 'error';
  message: string;
  data?: Record<string, string>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ''));
  return isNaN(n) ? null : n;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  // Handle Excel serial numbers
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function uniqueSlug(base: string): Promise<string> {
  const raw = slugify(base, { lower: true, strict: true });
  let slug = raw;
  let i = 1;
  while (await prisma.property.findUnique({ where: { slug } })) {
    slug = `${raw}-${i++}`;
  }
  return slug;
}

// ─── Row parsers ──────────────────────────────────────────────────────────────

async function processRow(
  row: ImportRow,
  rowIndex: number,
  type: string,
  landlordId: string,
  dryRun: boolean,
  cache: {
    properties: Map<string, string>; // name → id
    units: Map<string, string>;      // "propId:unitName" → id
    tenants: Map<string, string>;    // email → userId
  },
  summary: ImportResult['summary'],
  results: RowResult[],
  errors: string[]
) {
  const propertyName = str(row.property_name);
  const unitName = str(row.unit_name);
  const tenantEmail = str(row.tenant_email);

  // ── 1. Property ────────────────────────────────────────────────────────────
  let propertyId: string | null = null;

  if (propertyName && (type === 'properties' || type === 'units' || type === 'full')) {
    if (cache.properties.has(propertyName)) {
      propertyId = cache.properties.get(propertyName)!;
      summary.propertiesSkipped++;
    } else {
      // Check DB
      const existing = await prisma.property.findFirst({
        where: { landlordId, name: propertyName, status: { not: 'deleted' } },
        select: { id: true },
      });

      if (existing) {
        propertyId = existing.id;
        cache.properties.set(propertyName, propertyId);
        summary.propertiesSkipped++;
      } else {
        if (!str(row.address_street) || !str(row.address_city)) {
          errors.push(`Row ${rowIndex}: property "${propertyName}" missing address_street or address_city`);
          results.push({ row: rowIndex, status: 'error', message: 'Missing address fields' });
          return;
        }

        if (!dryRun) {
          const slug = await uniqueSlug(propertyName);
          const created = await prisma.property.create({
            data: {
              name: propertyName,
              slug,
              landlordId,
              type: str(row.property_type) || 'apartment',
              description: str(row.description) || null,
              address: {
                street: str(row.address_street),
                city: str(row.address_city),
                state: str(row.address_state),
                zip: str(row.address_zip),
              },
            },
          });
          propertyId = created.id;
        } else {
          propertyId = `dry-run-prop-${propertyName}`;
        }
        cache.properties.set(propertyName, propertyId!);
        summary.propertiesCreated++;
        results.push({
          row: rowIndex,
          status: 'created',
          message: `Property "${propertyName}" created`,
          data: { type: 'property', name: propertyName },
        });
      }
    }
  }

  // ── 2. Unit ────────────────────────────────────────────────────────────────
  let unitId: string | null = null;

  if (unitName && propertyId && (type === 'units' || type === 'full' || type === 'tenants')) {
    const cacheKey = `${propertyId}:${unitName}`;

    if (cache.units.has(cacheKey)) {
      unitId = cache.units.get(cacheKey)!;
      summary.unitsSkipped++;
    } else {
      const existing = await prisma.unit.findFirst({
        where: { propertyId: propertyId.startsWith('dry-run') ? undefined : propertyId, name: unitName },
        select: { id: true },
      });

      if (existing) {
        unitId = existing.id;
        cache.units.set(cacheKey, unitId);
        summary.unitsSkipped++;
      } else {
        const rentAmount = num(row.rent_amount);
        if (!rentAmount) {
          errors.push(`Row ${rowIndex}: unit "${unitName}" missing rent_amount`);
          results.push({ row: rowIndex, status: 'error', message: 'Missing rent_amount for unit' });
          return;
        }

        if (!dryRun && !propertyId.startsWith('dry-run')) {
          const created = await prisma.unit.create({
            data: {
              propertyId,
              name: unitName,
              type: str(row.unit_type) || 'apartment',
              bedrooms: num(row.bedrooms) ? Math.round(num(row.bedrooms)!) : null,
              bathrooms: num(row.bathrooms) ?? null,
              sizeSqFt: num(row.size_sqft) ? Math.round(num(row.size_sqft)!) : null,
              rentAmount,
              isAvailable: str(row.is_available).toLowerCase() !== 'no',
              availableFrom: parseDate(row.available_from),
            },
          });
          unitId = created.id;
        } else {
          unitId = `dry-run-unit-${unitName}`;
        }
        cache.units.set(cacheKey, unitId!);
        summary.unitsCreated++;
        results.push({
          row: rowIndex,
          status: 'created',
          message: `Unit "${unitName}" in "${propertyName}" created`,
          data: { type: 'unit', name: unitName, property: propertyName },
        });
      }
    }
  }

  // ── 3. Tenant + Lease ──────────────────────────────────────────────────────
  if (tenantEmail && (type === 'tenants' || type === 'full')) {
    const tenantName = str(row.tenant_name);
    if (!tenantName) {
      errors.push(`Row ${rowIndex}: tenant_email provided but tenant_name is missing`);
      results.push({ row: rowIndex, status: 'error', message: 'Missing tenant_name' });
      return;
    }

    let tenantUserId: string;

    if (cache.tenants.has(tenantEmail)) {
      tenantUserId = cache.tenants.get(tenantEmail)!;
      summary.tenantsSkipped++;
    } else {
      const existing = await prisma.user.findUnique({
        where: { email: tenantEmail },
        select: { id: true },
      });

      if (existing) {
        tenantUserId = existing.id;
        cache.tenants.set(tenantEmail, tenantUserId);
        summary.tenantsSkipped++;
      } else {
        if (!dryRun) {
          const created = await prisma.user.create({
            data: {
              name: tenantName,
              email: tenantEmail,
              phoneNumber: str(row.tenant_phone) || null,
              role: 'tenant',
            },
          });
          tenantUserId = created.id;
        } else {
          tenantUserId = `dry-run-tenant-${tenantEmail}`;
        }
        cache.tenants.set(tenantEmail, tenantUserId);
        summary.tenantsCreated++;
        results.push({
          row: rowIndex,
          status: 'created',
          message: `Tenant "${tenantName}" (${tenantEmail}) created`,
          data: { type: 'tenant', name: tenantName, email: tenantEmail },
        });
      }
    }

    // Lease
    if (unitId) {
      const leaseStart = parseDate(row.lease_start);
      const leaseEnd = parseDate(row.lease_end);
      const rentAmount = num(row.rent_amount);
      const billingDay = num(row.billing_day) ?? 1;

      if (!leaseStart) {
        errors.push(`Row ${rowIndex}: missing or invalid lease_start for tenant ${tenantEmail}`);
        results.push({ row: rowIndex, status: 'error', message: 'Invalid lease_start date' });
        return;
      }

      // Check for existing active lease on this unit
      const existingLease = await prisma.lease.findFirst({
        where: {
          unitId: unitId.startsWith('dry-run') ? undefined : unitId,
          tenantId: tenantUserId.startsWith('dry-run') ? undefined : tenantUserId,
          status: { in: ['active', 'pending_signature'] },
        },
        select: { id: true },
      });

      if (existingLease) {
        summary.leasesSkipped++;
        results.push({
          row: rowIndex,
          status: 'skipped',
          message: `Lease for ${tenantEmail} on unit "${unitName}" already exists`,
        });
      } else {
        if (!dryRun && !unitId.startsWith('dry-run') && !tenantUserId.startsWith('dry-run')) {
          await prisma.lease.create({
            data: {
              unitId,
              tenantId: tenantUserId,
              startDate: leaseStart,
              endDate: leaseEnd,
              rentAmount: rentAmount ?? 0,
              billingDayOfMonth: Math.min(Math.max(Math.round(billingDay), 1), 28),
              status: 'active',
            },
          });
          // Mark unit as occupied
          await prisma.unit.update({
            where: { id: unitId },
            data: { isAvailable: false },
          });
        }
        summary.leasesCreated++;
        results.push({
          row: rowIndex,
          status: 'created',
          message: `Lease for "${tenantName}" on unit "${unitName}" created`,
          data: { type: 'lease', tenant: tenantName, unit: unitName },
        });
      }
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 400 });
    }
    const landlordId = landlordResult.landlord.id;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = str(formData.get('type')) || 'full';
    const dryRun = str(formData.get('dryRun')) !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExts.includes(ext) && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload .xlsx, .xls, or .csv' },
        { status: 400 }
      );
    }

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: 'File exceeds 500 row limit. Please split into smaller batches.' },
        { status: 400 }
      );
    }

    // Normalize column names (lowercase, trim, replace spaces with _)
    const normalizedRows: ImportRow[] = rows.map((row) => {
      const out: ImportRow = {};
      for (const [k, v] of Object.entries(row)) {
        const key = k.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        out[key] = v;
      }
      return out;
    });

    const result: ImportResult = {
      success: true,
      dryRun,
      summary: {
        propertiesCreated: 0,
        propertiesSkipped: 0,
        unitsCreated: 0,
        unitsSkipped: 0,
        tenantsCreated: 0,
        tenantsSkipped: 0,
        leasesCreated: 0,
        leasesSkipped: 0,
      },
      rows: [],
      errors: [],
    };

    // Shared caches to avoid duplicate DB lookups within the same import
    const cache = {
      properties: new Map<string, string>(),
      units: new Map<string, string>(),
      tenants: new Map<string, string>(),
    };

    for (let i = 0; i < normalizedRows.length; i++) {
      await processRow(
        normalizedRows[i],
        i + 2, // +2 because row 1 is header, row 2 is first data row
        type,
        landlordId,
        dryRun,
        cache,
        result.summary,
        result.rows,
        result.errors
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[import] error:', error);
    return NextResponse.json(
      { error: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
