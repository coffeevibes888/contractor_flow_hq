import type { LucideIcon } from 'lucide-react';
import { Smartphone, Cable, Bluetooth, Printer, Zap, Tag, ScanLine } from 'lucide-react';

/**
 * Curated equipment catalog for contractors.
 *
 * All "buy" links are affiliate-tagged via the env vars below — when not set,
 * they fall through to plain Amazon/manufacturer URLs. Add affiliate IDs to
 * `.env` to start earning commissions:
 *
 *   NEXT_PUBLIC_AMAZON_AFFILIATE_TAG=propertyflowhq-20
 *   NEXT_PUBLIC_BROTHER_AFFILIATE_TAG=...
 *   NEXT_PUBLIC_ZEBRA_AFFILIATE_TAG=...
 */

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || '';

/**
 * Amazon search URL with affiliate tag. Search URLs are explicitly allowed by
 * Amazon Associates, never 404, and always show current matching products.
 * This is more durable than hard-coding ASINs that can change/expire.
 */
function amazonSearch(query: string): string {
  const q = encodeURIComponent(query);
  const base = `https://www.amazon.com/s?k=${q}`;
  return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base;
}

export type EquipmentCategory = 'scanner' | 'printer' | 'labels' | 'mobile';

export interface EquipmentTier {
  id: string;
  name: string;
  category: EquipmentCategory;
  /** Why someone in trades would pick this option. */
  pitch: string;
  /** Estimated price in USD for display. Verify before publishing. */
  priceUsd: number | 'free';
  /** Compatibility with the platform's built-in scanner. */
  works: string[];
  /** Notes/warnings (e.g. "iOS only", "needs power outlet"). */
  caveats?: string[];
  /** Best-fit user persona. */
  bestFor: string;
  /** Vendor name. */
  vendor: string;
  /** Affiliate-tagged purchase link. */
  buyUrl: string | null;
  /** Product image URL. Optional — falls back to icon. */
  imageUrl?: string;
  icon: LucideIcon;
  /** Highlight the recommended option in each tier. */
  recommended?: boolean;
  /** Use the platform itself (e.g. phone camera scanner) — no purchase. */
  inAppHref?: string;
}

export const equipmentTiers: EquipmentTier[] = [
  // ── Free / In-app ────────────────────────────────────────────────────────
  {
    id: 'phone-camera',
    name: 'Phone Camera Scanner',
    category: 'mobile',
    pitch: 'Use the camera in your pocket. Built into Property Flow HQ — point at a barcode or QR code and it auto-fills.',
    priceUsd: 'free',
    works: ['QR codes', 'UPC/EAN barcodes', 'Code 128 (storage labels)'],
    caveats: ['Requires camera permission', 'Best in well-lit areas'],
    bestFor: 'Solo contractors, occasional scanning, lookups in the field',
    vendor: 'Built-in',
    buyUrl: null,
    inAppHref: '/contractor-dashboard/inventory/locate',
    icon: Smartphone,
    recommended: true,
  },

  // ── USB scanners ─────────────────────────────────────────────────────────
  {
    id: 'tera-1d-usb',
    name: 'Tera 5100 USB Barcode Scanner',
    category: 'scanner',
    pitch: '1D laser scanner with USB cable. Plug into laptop, point at any barcode, scan. Works with Property Flow HQ out of the box (acts as a keyboard).',
    priceUsd: 30,
    works: ['UPC/EAN', 'Code 128', 'Code 39', 'QR (with 2D version)'],
    bestFor: 'Warehouse desk, receiving dock with a laptop',
    vendor: 'Tera (via Amazon)',
    buyUrl: amazonSearch('Tera 5100 USB barcode scanner'),
    icon: Cable,
  },
  {
    id: 'netum-2d-usb',
    name: 'NETUM 2D USB Scanner',
    category: 'scanner',
    pitch: '2D scanner reads QR + 1D + 2D codes from screens or paper. Cabled USB. The best $40 scanner you can buy.',
    priceUsd: 40,
    works: ['All 1D barcodes', 'QR codes', 'Data Matrix', 'PDF417'],
    bestFor: 'Most contractors who want a single device that scans everything',
    vendor: 'NETUM (via Amazon)',
    buyUrl: amazonSearch('NETUM NT-1228BL 2D barcode scanner'),
    icon: ScanLine,
    recommended: true,
  },

  // ── Bluetooth scanners ───────────────────────────────────────────────────
  {
    id: 'eyoyo-bt-2d',
    name: 'Eyoyo Bluetooth 2D Scanner',
    category: 'scanner',
    pitch: 'Wireless 2D scanner. Pairs with your phone or laptop. Cradle for desk + cordless for field use. 30-day battery.',
    priceUsd: 75,
    works: ['All 1D + 2D codes', 'QR codes', 'Phone screen scanning'],
    caveats: ['Bluetooth 4.0+ required'],
    bestFor: 'Crews moving between job sites and the warehouse',
    vendor: 'Eyoyo (via Amazon)',
    buyUrl: amazonSearch('Eyoyo bluetooth 2D barcode scanner'),
    icon: Bluetooth,
  },
  {
    id: 'zebra-ds2208',
    name: 'Zebra DS2208 Industrial Scanner',
    category: 'scanner',
    pitch: 'Pro-grade scanner used by FedEx and Lowe\'s. Drop-tested to 5ft. Reads damaged or smudged labels. Lifetime durability.',
    priceUsd: 150,
    works: ['All 1D + 2D codes', 'OCR text', 'Direct-part marks'],
    bestFor: 'Larger crews, daily heavy use, rough environments',
    vendor: 'Zebra Technologies',
    buyUrl: amazonSearch('Zebra DS2208 barcode scanner'),
    icon: Zap,
  },

  // ── Label printers ───────────────────────────────────────────────────────
  {
    id: 'dymo-450',
    name: 'DYMO LabelWriter 450',
    category: 'printer',
    pitch: 'Thermal label printer. No ink, no toner. Prints address, shipping, and storage labels at 51 labels/min. USB.',
    priceUsd: 110,
    works: ['Property Flow HQ Label Center', 'Direct-thermal labels'],
    caveats: ['USB only — no wireless'],
    bestFor: 'Office desk, low-medium volume',
    vendor: 'DYMO (via Amazon)',
    buyUrl: amazonSearch('DYMO LabelWriter 450 thermal label printer'),
    icon: Printer,
  },
  {
    id: 'brother-ql820',
    name: 'Brother QL-820NWB',
    category: 'printer',
    pitch: 'Thermal label printer with WiFi, Bluetooth, and USB. Auto-cutter. Prints 110 labels/min. Black + red on red labels.',
    priceUsd: 220,
    works: ['Property Flow HQ Label Center', 'AirPrint', 'Direct from phone'],
    bestFor: 'The contractor who wants the best label workflow',
    vendor: 'Brother',
    buyUrl: amazonSearch('Brother QL-820NWB label printer'),
    icon: Printer,
    recommended: true,
  },
  {
    id: 'rollo-x1040',
    name: 'Rollo X1040 Wireless Thermal Printer',
    category: 'printer',
    pitch: '4x6 thermal printer for shipping labels. Prints at 150mm/sec. WiFi, USB. Pairs with the Label Center.',
    priceUsd: 250,
    works: ['Property Flow HQ shipping labels', 'AirPrint'],
    bestFor: 'Contractors shipping materials to job sites',
    vendor: 'Rollo',
    buyUrl: amazonSearch('Rollo X1040 wireless thermal printer'),
    icon: Printer,
  },

  // ── Label rolls / supplies ───────────────────────────────────────────────
  {
    id: 'dymo-rolls',
    name: 'DYMO 30252 Address Labels',
    category: 'labels',
    pitch: '1-1/8" x 3-1/2" labels for the LabelWriter 450. 350 labels per roll, sold in multi-packs.',
    priceUsd: 65,
    works: ['DYMO LabelWriter 450', '550', '4XL'],
    bestFor: 'Bulk address + storage labels',
    vendor: 'DYMO (via Amazon)',
    buyUrl: amazonSearch('DYMO 30252 address labels'),
    icon: Tag,
  },
  {
    id: 'brother-rolls',
    name: 'Brother DK-1241 Shipping Labels',
    category: 'labels',
    pitch: '4" x 6" thermal shipping labels for Brother QL printers. 200 labels per roll.',
    priceUsd: 28,
    works: ['Brother QL-820NWB', 'QL-1100', 'QL-1110NWB'],
    bestFor: 'Shipping bulky materials',
    vendor: 'Brother (via Amazon)',
    buyUrl: amazonSearch('Brother DK-1241 shipping labels'),
    icon: Tag,
  },
];

export const equipmentCategories: { id: EquipmentCategory | 'all'; label: string; description: string }[] = [
  { id: 'all', label: 'All Equipment', description: 'Everything contractors use to run their work' },
  { id: 'mobile', label: 'Mobile / Free', description: 'Use what you already have' },
  { id: 'scanner', label: 'Barcode Scanners', description: 'USB, Bluetooth, and pro-grade' },
  { id: 'printer', label: 'Label Printers', description: 'Print labels for storage and shipping' },
  { id: 'labels', label: 'Label Supplies', description: 'Refill rolls and pre-cut sheets' },
];
