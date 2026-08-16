/**
 * GET /api/admin/import/template?type=properties|tenants|leases|full
 *
 * Returns a downloadable Excel (.xlsx) template with the correct column
 * headers and example rows so PMs know exactly what to fill in.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';

// ─── Column definitions per import type ──────────────────────────────────────

const TEMPLATES: Record<
  string,
  { headers: string[]; example: (string | number)[] }
> = {
  properties: {
    headers: [
      'property_name',
      'address_street',
      'address_city',
      'address_state',
      'address_zip',
      'property_type',
      'description',
    ],
    example: [
      'Sunset Apartments',
      '123 Main St',
      'Austin',
      'TX',
      '78701',
      'apartment',
      'Beautiful complex near downtown',
    ],
  },
  units: {
    headers: [
      'property_name',
      'unit_name',
      'unit_type',
      'bedrooms',
      'bathrooms',
      'size_sqft',
      'rent_amount',
      'is_available',
      'available_from',
    ],
    example: [
      'Sunset Apartments',
      '101',
      'apartment',
      2,
      1,
      850,
      1500,
      'yes',
      '2025-07-01',
    ],
  },
  tenants: {
    headers: [
      'tenant_name',
      'tenant_email',
      'tenant_phone',
      'property_name',
      'unit_name',
      'lease_start',
      'lease_end',
      'rent_amount',
      'billing_day',
    ],
    example: [
      'Jane Smith',
      'jane@example.com',
      '512-555-0100',
      'Sunset Apartments',
      '101',
      '2025-01-01',
      '2025-12-31',
      1500,
      1,
    ],
  },
  full: {
    headers: [
      'property_name',
      'address_street',
      'address_city',
      'address_state',
      'address_zip',
      'property_type',
      'unit_name',
      'unit_type',
      'bedrooms',
      'bathrooms',
      'size_sqft',
      'rent_amount',
      'tenant_name',
      'tenant_email',
      'tenant_phone',
      'lease_start',
      'lease_end',
      'billing_day',
    ],
    example: [
      'Sunset Apartments',
      '123 Main St',
      'Austin',
      'TX',
      '78701',
      'apartment',
      '101',
      'apartment',
      2,
      1,
      850,
      1500,
      'Jane Smith',
      'jane@example.com',
      '512-555-0100',
      '2025-01-01',
      '2025-12-31',
      1,
    ],
  },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get('type') || 'full';
  const tpl = TEMPLATES[type] ?? TEMPLATES.full;

  // Build workbook
  const wb = XLSX.utils.book_new();

  // ── Data sheet ──────────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet([tpl.headers, tpl.example]);

  // Style header row (bold, background) — SheetJS CE supports cell styles via
  // the `!cols` width hint; full styling requires SheetJS Pro, so we just set
  // column widths for readability.
  ws['!cols'] = tpl.headers.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Import Data');

  // ── Instructions sheet ──────────────────────────────────────────────────────
  const instructions: string[][] = [
    ['PropertyFlow HQ — Bulk Import Template'],
    [''],
    ['INSTRUCTIONS'],
    ['1. Fill in the "Import Data" sheet. Do not rename or remove columns.'],
    ['2. The first row is the header — do not delete it.'],
    ['3. Row 2 is an example — you can overwrite or delete it.'],
    ['4. Dates must be in YYYY-MM-DD format (e.g. 2025-01-15).'],
    ['5. is_available: use "yes" or "no".'],
    ['6. billing_day: day of month rent is due (1–28).'],
    ['7. property_type: apartment | house | condo | commercial | mixed-use'],
    ['8. unit_type: apartment | room | office | house | studio'],
    ['9. If a property already exists (matched by name), units will be added to it.'],
    ['10. If a tenant email already exists, the existing account will be linked.'],
    [''],
    ['COLUMN REFERENCE'],
    ...tpl.headers.map((h) => [h, getColumnDescription(h)]),
  ];

  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="propertyflowhq-import-${type}.xlsx"`,
    },
  });
}

function getColumnDescription(col: string): string {
  const map: Record<string, string> = {
    property_name: 'Required. Name of the property.',
    address_street: 'Required. Street address.',
    address_city: 'Required. City.',
    address_state: 'Required. 2-letter state code (e.g. TX).',
    address_zip: 'Required. ZIP code.',
    property_type: 'Required. apartment | house | condo | commercial | mixed-use',
    description: 'Optional. Short description of the property.',
    unit_name: 'Required. Unit identifier (e.g. 101, 2B).',
    unit_type: 'Required. apartment | room | office | house | studio',
    bedrooms: 'Optional. Number of bedrooms.',
    bathrooms: 'Optional. Number of bathrooms (decimals ok: 1.5).',
    size_sqft: 'Optional. Square footage.',
    rent_amount: 'Required. Monthly rent in USD (numbers only, no $ sign).',
    is_available: 'Optional. yes or no. Defaults to yes.',
    available_from: 'Optional. Date unit becomes available (YYYY-MM-DD).',
    tenant_name: 'Required for tenant import. Full name.',
    tenant_email: 'Required for tenant import. Email address.',
    tenant_phone: 'Optional. Phone number.',
    lease_start: 'Required for tenant import. Lease start date (YYYY-MM-DD).',
    lease_end: 'Optional. Lease end date (YYYY-MM-DD). Leave blank for month-to-month.',
    billing_day: 'Optional. Day of month rent is due (1–28). Defaults to 1.',
  };
  return map[col] ?? '';
}
