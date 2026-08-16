'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronRight, ChevronLeft, FileText, Download, CheckCircle, AlertTriangle, Loader2, PenLine, CreditCard, Wrench, BarChart3, Users, Infinity, RotateCcw, Send } from 'lucide-react';
import PublicLeaseSuccess from './public-lease-success';

// ─── US States list ───────────────────────────────────────────────────────────
const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
] as const;

// States with complex laws needing extra warnings
const COMPLEX_STATES: Record<string, string> = {
  NY: '⚠️ New York has extremely complex landlord-tenant laws. Answer the question below before continuing. Attorney review is strongly recommended for all NY leases.',
  NJ: '⚠️ New Jersey has strict tenant protections including just-cause eviction. This framework lease should be reviewed by a NJ-licensed attorney before use.',
  CA: '⚠️ California requires many city-specific disclosures and has statewide rent control (AB 1482). Some cities require additional official forms. Attorney review is strongly recommended.',
  WA: '⚠️ Washington requires specific habitability and disclosure language. Seattle/Bellevue have additional local requirements.',
  OR: '⚠️ Oregon enacted statewide rent control (SB 608) and requires 90-day no-fault eviction notice with 1-month relocation assistance. Review current OR law before using.',
  IL: '⚠️ Chicago has a robust landlord-tenant ordinance that differs significantly from state law. Chicagoland landlords should verify local requirements.',
  MA: '⚠️ Massachusetts has strict security deposit rules. A written Statement of Condition is required at move-in. No late fees until 30 days overdue.',
  MN: '⚠️ Minnesota enacted statewide just-cause eviction protections in 2024. You must have a qualifying reason to terminate tenancy.',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface WizardData {
  // Step 1 — State & Property
  state: string;
  isRentStabilized: 'yes' | 'no' | '';   // NY only
  propertyType: string;
  propertyAddress: string;
  unitNumber: string;
  includedAreas: string[];   // garage, laundry, storage, parking
  // Step 2 — Parties
  landlordLegalName: string;
  landlordEmail: string;
  landlordPhone: string;
  tenantName1: string;
  tenantName2: string;
  tenantEmail1: string;
  // Step 3 — Terms & Rent
  leaseStartDate: string;
  leaseEndDate: string;
  isMonthToMonth: boolean;
  monthlyRent: string;
  securityDepositAmount: string;
  rentDueDay: string;
  lateFeeAmount: string;
  // Step 4 — Utilities & Bills
  tenantPaysUtilities: string[];
  landlordPaysUtilities: string[];
  // Step 5 — Rules & Policies
  smokingAllowed: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  entryNoticeDays: string;
  moveOutNoticeDays: string;
  parkingRules: string;
  garbageRules: string;
  laundryAccess: string;
  guestPolicy: string;
  additionalTerms: string;
  // Step 6 — Pets & Insurance
  petsAllowed: boolean;
  petDeposit: string;
  petRent: string;
  petRestrictions: string;
  rentersInsuranceRequired: boolean;
  // Step 7 — Email gate
  emailGate: string;
}

const ALL_UTILITIES = ['Electric', 'Gas', 'Water', 'Sewer', 'Trash', 'Internet', 'Cable', 'Phone'] as const;

const INITIAL: WizardData = {
  state: '',
  isRentStabilized: '',
  propertyType: '',
  propertyAddress: '',
  unitNumber: '',
  includedAreas: [],
  landlordLegalName: '',
  landlordEmail: '',
  landlordPhone: '',
  tenantName1: '',
  tenantName2: '',
  tenantEmail1: '',
  leaseStartDate: '',
  leaseEndDate: '',
  isMonthToMonth: false,
  monthlyRent: '',
  securityDepositAmount: '',
  rentDueDay: '1',
  lateFeeAmount: '75',
  tenantPaysUtilities: ['Electric', 'Gas', 'Internet', 'Cable'],
  landlordPaysUtilities: ['Water', 'Sewer', 'Trash'],
  smokingAllowed: false,
  quietHoursStart: '10:00 PM',
  quietHoursEnd: '8:00 AM',
  entryNoticeDays: '24',
  moveOutNoticeDays: '30',
  parkingRules: '',
  garbageRules: '',
  laundryAccess: '',
  guestPolicy: '',
  additionalTerms: '',
  petsAllowed: false,
  petDeposit: '',
  petRent: '',
  petRestrictions: '',
  rentersInsuranceRequired: true,
  emailGate: '',
};

// ─── Small reusable field components ─────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', className = '',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent ${className}`}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ─── Utility checkbox helper ──────────────────────────────────────────────────
function UtilityCheckbox({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ─── Textarea helper ──────────────────────────────────────────────────────────
function Textarea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none"
    />
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

// Step 1 — State, Property Type & Address
function Step1({ d, set, setArr }: {
  d: WizardData;
  set: (k: keyof WizardData, v: string | boolean) => void;
  setArr: (k: keyof WizardData, v: string[]) => void;
}) {
  const warning = d.state ? COMPLEX_STATES[d.state] : null;
  const INCLUDED_AREAS = ['Garage', 'Parking Space', 'Storage Unit', 'Backyard / Patio', 'Laundry Room', 'Basement'];
  const toggleArea = (area: string) => {
    const next = d.includedAreas.includes(area)
      ? d.includedAreas.filter((a) => a !== area)
      : [...d.includedAreas, area];
    setArr('includedAreas', next);
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>State</FieldLabel>
          <select
            value={d.state}
            onChange={(e) => {
              set('state', e.target.value);
              // Reset rent-stabilized answer when state changes
              if (e.target.value !== 'NY') set('isRentStabilized', '');
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            <option value="">Select a state…</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel required>Property Type</FieldLabel>
          <select
            value={d.propertyType}
            onChange={(e) => set('propertyType', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            <option value="">Select type…</option>
            <option value="single_family">Single-Family Home</option>
            <option value="apartment">Apartment / Condo Unit</option>
            <option value="apartment_complex">Apartment Complex</option>
            <option value="townhouse">Townhouse / Row Home</option>
            <option value="duplex">Duplex / Triplex / Fourplex</option>
            <option value="room_for_rent">Room for Rent (shared home)</option>
            <option value="basement">Basement Unit</option>
            <option value="mobile_home">Mobile / Manufactured Home</option>
            <option value="commercial_residential">Live-Work / Mixed Use</option>
          </select>
        </div>
      </div>

      {warning && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {/* NY rent-stabilization gate */}
      {d.state === 'NY' && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">
            Is this unit rent-stabilized or rent-controlled?
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => set('isRentStabilized', 'no')}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                d.isRentStabilized === 'no'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400'
              }`}
            >
              ✓ No — free-market unit (use this builder)
            </button>
            <button
              type="button"
              onClick={() => set('isRentStabilized', 'yes')}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                d.isRentStabilized === 'yes'
                  ? 'border-red-500 bg-red-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-red-400'
              }`}
            >
              ✗ Yes — rent-stabilized / rent-controlled
            </button>
          </div>

          {d.isRentStabilized === 'no' && (
            <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
              <AlertTriangle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Free-market unit confirmed.</strong> Your lease will include all required NY free-market disclosures: bedbug history, window guard notice, HSTPA 1-month security deposit cap, Good Cause Eviction notice, and NY-specific tenant rights. Attorney review is still recommended.
              </span>
            </div>
          )}

          {d.isRentStabilized === 'yes' && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 space-y-2">
              <p className="text-sm font-bold text-red-800">⛔ This builder cannot be used for rent-stabilized or rent-controlled units.</p>
              <p className="text-xs text-red-700 leading-relaxed">
                Rent-stabilized leases in New York City must use the official <strong>DHCR Form RTP-8</strong> (Rent Stabilized Lease Agreement), which is issued by the Division of Housing and Community Renewal. Using any other lease form for a stabilized unit is a violation of NYC rent stabilization law.
              </p>
              <a
                href="https://hcr.ny.gov/form/rtp-8-rent-stabilized-lease-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 underline underline-offset-2 hover:text-red-900"
              >
                → Get DHCR Form RTP-8 from HCR.NY.GOV
              </a>
            </div>
          )}
        </div>
      )}

      <div>
        <FieldLabel required>Property Address</FieldLabel>
        <Input value={d.propertyAddress} onChange={(v) => set('propertyAddress', v)} placeholder="123 Main St, Las Vegas, NV 89101" />
      </div>

      <div>
        <FieldLabel>Unit / Apt Number (optional)</FieldLabel>
        <Input value={d.unitNumber} onChange={(v) => set('unitNumber', v)} placeholder="e.g. Unit 4B" />
      </div>

      <div>
        <FieldLabel>Included with the unit (check all that apply)</FieldLabel>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INCLUDED_AREAS.map((area) => (
            <UtilityCheckbox
              key={area}
              label={area}
              checked={d.includedAreas.includes(area)}
              onChange={() => toggleArea(area)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2 — Parties
function Step2({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: string | boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className="p-4 bg-sky-50 border border-sky-100 rounded-lg">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3">Landlord Information</p>
        <div className="space-y-3">
          <div>
            <FieldLabel required>Legal Name (as it will appear on the lease)</FieldLabel>
            <Input value={d.landlordLegalName} onChange={(v) => set('landlordLegalName', v)} placeholder="Full legal name or company name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" value={d.landlordEmail} onChange={(v) => set('landlordEmail', v)} placeholder="landlord@example.com" />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <Input type="tel" value={d.landlordPhone} onChange={(v) => set('landlordPhone', v)} placeholder="(702) 555-0100" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Tenant Information</p>
        <div className="space-y-3">
          <div>
            <FieldLabel required>Tenant 1 — Full Legal Name</FieldLabel>
            <Input value={d.tenantName1} onChange={(v) => set('tenantName1', v)} placeholder="First Last" />
          </div>
          <div>
            <FieldLabel>Tenant 1 — Email (optional)</FieldLabel>
            <Input type="email" value={d.tenantEmail1} onChange={(v) => set('tenantEmail1', v)} placeholder="tenant@example.com" />
          </div>
          <div>
            <FieldLabel>Tenant 2 — Full Legal Name (if applicable)</FieldLabel>
            <Input value={d.tenantName2} onChange={(v) => set('tenantName2', v)} placeholder="Second tenant name" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3 — Terms & Rent
function Step3({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: string | boolean) => void }) {
  return (
    <div className="space-y-5">
      <Toggle checked={d.isMonthToMonth} onChange={(v) => set('isMonthToMonth', v)} label="Month-to-month lease (no fixed end date)" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Lease Start Date</FieldLabel>
          <Input type="date" value={d.leaseStartDate} onChange={(v) => set('leaseStartDate', v)} />
        </div>
        {!d.isMonthToMonth && (
          <div>
            <FieldLabel required>Lease End Date</FieldLabel>
            <Input type="date" value={d.leaseEndDate} onChange={(v) => set('leaseEndDate', v)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Monthly Rent ($)</FieldLabel>
          <Input type="number" value={d.monthlyRent} onChange={(v) => set('monthlyRent', v)} placeholder="1500" />
        </div>
        <div>
          <FieldLabel required>Security Deposit ($)</FieldLabel>
          <Input type="number" value={d.securityDepositAmount} onChange={(v) => set('securityDepositAmount', v)} placeholder="1500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Rent Due Day of Month</FieldLabel>
          <select
            value={d.rentDueDay}
            onChange={(e) => set('rentDueDay', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n}{n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} of the month
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Late Fee Amount ($)</FieldLabel>
          <Input type="number" value={d.lateFeeAmount} onChange={(v) => set('lateFeeAmount', v)} placeholder="75" />
        </div>
      </div>

      {/* ── Rent-aware conversion hook — fires once a real rent amount is entered ── */}
      {Number(d.monthlyRent) > 0 && (
        <a
          href={`/sign-up?utm_source=free_lease&utm_medium=step3_rent_hook&role=landlord`}
          className="group flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-violet-500/20 no-underline"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-snug">
              Collecting ${Number(d.monthlyRent).toLocaleString()}/mo? Get it deposited automatically.
            </p>
            <p className="text-violet-200 text-xs mt-0.5 leading-relaxed">
              Sign up free — we&apos;ll set up ACH rent collection, send reminders, and track late fees so you never have to chase a payment.
            </p>
          </div>
          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
            <svg className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </a>
      )}
    </div>
  );
}

// Step 4 — Utilities & Bills
function Step4({ d, setArr }: {
  d: WizardData;
  setArr: (k: keyof WizardData, v: string[]) => void;
}) {
  const toggleTenant = (util: string) => {
    const inTenant = d.tenantPaysUtilities.includes(util);
    setArr('tenantPaysUtilities', inTenant
      ? d.tenantPaysUtilities.filter((u) => u !== util)
      : [...d.tenantPaysUtilities, util]);
    // Mirror: if added to tenant, remove from landlord; if removed from tenant, add to landlord
    const inLandlord = d.landlordPaysUtilities.includes(util);
    if (!inTenant && inLandlord) {
      setArr('landlordPaysUtilities', d.landlordPaysUtilities.filter((u) => u !== util));
    }
    if (inTenant && !inLandlord) {
      setArr('landlordPaysUtilities', [...d.landlordPaysUtilities, util]);
    }
  };
  const toggleLandlord = (util: string) => {
    const inLandlord = d.landlordPaysUtilities.includes(util);
    setArr('landlordPaysUtilities', inLandlord
      ? d.landlordPaysUtilities.filter((u) => u !== util)
      : [...d.landlordPaysUtilities, util]);
    const inTenant = d.tenantPaysUtilities.includes(util);
    if (!inLandlord && inTenant) {
      setArr('tenantPaysUtilities', d.tenantPaysUtilities.filter((u) => u !== util));
    }
    if (inLandlord && !inTenant) {
      setArr('tenantPaysUtilities', [...d.tenantPaysUtilities, util]);
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Check each utility under the party responsible for paying it. A utility can appear under both if costs are split.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl">
          <p className="text-xs font-bold text-sky-700 uppercase tracking-wide mb-3">Tenant Pays</p>
          <div className="space-y-2.5">
            {ALL_UTILITIES.map((u) => (
              <UtilityCheckbox
                key={`tenant-${u}`}
                label={u}
                checked={d.tenantPaysUtilities.includes(u)}
                onChange={() => toggleTenant(u)}
              />
            ))}
          </div>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Landlord Pays</p>
          <div className="space-y-2.5">
            {ALL_UTILITIES.map((u) => (
              <UtilityCheckbox
                key={`landlord-${u}`}
                label={u}
                checked={d.landlordPaysUtilities.includes(u)}
                onChange={() => toggleLandlord(u)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
        💡 <strong>Tip:</strong> If a utility is not checked under either column it won&apos;t appear in the lease. Check it under one or both parties.
      </div>
    </div>
  );
}

// Step 5 — Rules & Policies
function Step5({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: string | boolean) => void }) {
  return (
    <div className="space-y-5">
      {/* Smoking & quiet hours */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Occupancy Rules</p>
        <Toggle checked={d.smokingAllowed} onChange={(v) => set('smokingAllowed', v)} label="Smoking allowed on premises" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Quiet Hours Start</FieldLabel>
            <Input value={d.quietHoursStart} onChange={(v) => set('quietHoursStart', v)} placeholder="10:00 PM" />
          </div>
          <div>
            <FieldLabel>Quiet Hours End</FieldLabel>
            <Input value={d.quietHoursEnd} onChange={(v) => set('quietHoursEnd', v)} placeholder="8:00 AM" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Landlord Entry Notice (hours)</FieldLabel>
            <Input type="number" value={d.entryNoticeDays} onChange={(v) => set('entryNoticeDays', v)} placeholder="24" />
          </div>
          <div>
            <FieldLabel>Move-out Notice (days)</FieldLabel>
            <Input type="number" value={d.moveOutNoticeDays} onChange={(v) => set('moveOutNoticeDays', v)} placeholder="30" />
          </div>
        </div>
      </div>

      {/* Parking */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Parking</p>
        <Textarea
          value={d.parkingRules}
          onChange={(v) => set('parkingRules', v)}
          placeholder="e.g., 1 assigned spot in lot A. No RVs, boats, or commercial vehicles. Guests park on street only."
          rows={2}
        />
      </div>

      {/* Garbage & trash */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Garbage & Trash</p>
        <Textarea
          value={d.garbageRules}
          onChange={(v) => set('garbageRules', v)}
          placeholder="e.g., Tenant must place bins at curb by 7 AM on collection day (Tuesdays). No dumping of bulk items without prior approval."
          rows={2}
        />
      </div>

      {/* Laundry */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Laundry Access</p>
        <Input
          value={d.laundryAccess}
          onChange={(v) => set('laundryAccess', v)}
          placeholder="e.g., In-unit washer/dryer included. OR Shared laundry room on ground floor, hours 7 AM–10 PM."
        />
      </div>

      {/* Guests */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Guest Policy</p>
        <Input
          value={d.guestPolicy}
          onChange={(v) => set('guestPolicy', v)}
          placeholder="e.g., Guests may not stay more than 7 consecutive nights or 14 nights in any 30-day period."
        />
      </div>

      {/* Additional terms */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Additional Rules (one per line, optional)</p>
        <Textarea
          value={d.additionalTerms}
          onChange={(v) => set('additionalTerms', v)}
          placeholder={"No alterations or painting without written consent.\nTenant responsible for snow removal from walkways.\nPool use restricted to residents only."}
          rows={4}
        />
      </div>

      {/* Mid-wizard CTA removed — the rent-aware hook in Step 3 is more targeted and fires earlier */}
    </div>
  );
}

// Step 6 — Pets & Insurance
function Step6({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: string | boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pet Policy</p>
        <Toggle checked={d.petsAllowed} onChange={(v) => set('petsAllowed', v)} label="Pets allowed" />
        {d.petsAllowed && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Pet Deposit ($)</FieldLabel>
                <Input type="number" value={d.petDeposit} onChange={(v) => set('petDeposit', v)} placeholder="500" />
              </div>
              <div>
                <FieldLabel>Monthly Pet Rent ($)</FieldLabel>
                <Input type="number" value={d.petRent} onChange={(v) => set('petRent', v)} placeholder="50" />
              </div>
            </div>
            <div>
              <FieldLabel>Restrictions (breed, size, type)</FieldLabel>
              <Input
                value={d.petRestrictions}
                onChange={(v) => set('petRestrictions', v)}
                placeholder="e.g., Max 2 pets, under 25 lbs each. No aggressive breeds."
              />
            </div>
          </div>
        )}
        {!d.petsAllowed && (
          <p className="text-xs text-slate-500">No pets clause will be included in the lease.</p>
        )}
      </div>

      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Renters Insurance</p>
        <Toggle
          checked={d.rentersInsuranceRequired}
          onChange={(v) => set('rentersInsuranceRequired', v)}
          label="Require tenant to carry renters insurance ($100,000 min liability)"
        />
        {d.rentersInsuranceRequired && (
          <p className="text-xs text-slate-500">Tenant must provide proof of coverage within 14 days of move-in and maintain it for the lease term.</p>
        )}
      </div>

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
        <p className="font-semibold mb-1">✅ Also auto-included in your lease</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>5-day rent grace period, late fee after day 6</li>
          <li>Maintenance responsibilities (both parties)</li>
          <li>Default &amp; remedies language</li>
          <li>State-specific disclosures &amp; lead paint notice</li>
          <li>Full signature block for all parties</li>
        </ul>
      </div>
    </div>
  );
}

// Step 7 — Generate
function Step7({ d, set, loading, error, isSignedIn, sessionEmail }: {
  d: WizardData;
  set: (k: keyof WizardData, v: string | boolean) => void;
  loading: boolean;
  error: string;
  isSignedIn: boolean;
  sessionEmail: string;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center p-6 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-xl">
        <CheckCircle className="h-12 w-12 text-sky-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Your {d.state} lease is ready to generate!</h3>
        <p className="text-sm text-gray-600">
          {isSignedIn
            ? 'You\'re signed in — generate as many leases as you need, with free e-signatures included.'
            : 'Enter your email below. We\'ll create your complete residential lease — free, no account needed.'}
        </p>
      </div>

      {isSignedIn ? (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Signed in as {sessionEmail}</p>
            <p className="text-xs text-emerald-700 mt-0.5">Unlimited leases · Free e-signatures included</p>
          </div>
        </div>
      ) : (
        <div>
          <FieldLabel required>Your Email Address</FieldLabel>
          <Input
            type="email"
            value={d.emailGate}
            onChange={(v) => set('emailGate', v)}
            placeholder="you@example.com"
            className="text-base"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            One free lease per email address. No spam — just your lease and an optional free trial offer.
          </p>
        </div>
      )}

      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">What&apos;s included in your lease:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Full {d.state} residential lease (court-ready, printable PDF)</li>
          <li>Property type: {d.propertyType.replace(/_/g, ' ') || 'residential'}</li>
          <li>Utilities: tenant pays {d.tenantPaysUtilities.join(', ') || 'none specified'}</li>
          <li>All 19 legal articles + state disclosures</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Step progress bar ────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Property' },
  { n: 2, label: 'Parties' },
  { n: 3, label: 'Terms' },
  { n: 4, label: 'Utilities' },
  { n: 5, label: 'Rules' },
  { n: 6, label: 'Pets' },
  { n: 7, label: 'Generate' },
];

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                current > s.n
                  ? 'bg-sky-500 text-white'
                  : current === s.n
                  ? 'bg-sky-500 text-white ring-4 ring-sky-100'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {current > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
            </div>
            <span className={`mt-1 text-[10px] font-medium hidden sm:block ${current === s.n ? 'text-sky-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 ${current > s.n ? 'bg-sky-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Validate each step before allowing Next ─────────────────────────────────
function validateStep(step: number, d: WizardData): string | null {
  if (step === 1) {
    if (!d.state) return 'Please select a state.';
    if (d.state === 'NY' && !d.isRentStabilized) return 'Please answer the rent-stabilized question above.';
    if (d.state === 'NY' && d.isRentStabilized === 'yes') return 'Rent-stabilized units must use DHCR Form RTP-8. This builder cannot generate that lease.';
    if (!d.propertyType) return 'Please select a property type.';
    if (!d.propertyAddress.trim()) return 'Property address is required.';
  }
  if (step === 2) {
    if (!d.landlordLegalName.trim()) return 'Landlord legal name is required.';
    if (!d.tenantName1.trim()) return 'At least one tenant name is required.';
  }
  if (step === 3) {
    if (!d.leaseStartDate) return 'Lease start date is required.';
    if (!d.isMonthToMonth && !d.leaseEndDate) return 'Lease end date is required (or choose month-to-month).';
    if (!d.monthlyRent || Number(d.monthlyRent) <= 0) return 'Monthly rent must be a positive number.';
    if (!d.securityDepositAmount || Number(d.securityDepositAmount) < 0) return 'Security deposit amount is required.';
  }
  // emailGate is only required for guests — signed-in users skip it
  // The check here is intentionally loose: the server validates the session auth
  if (step === 7) {
    // If emailGate is filled, ensure it's valid; if empty it means user is signed in
    if (d.emailGate.trim() && !d.emailGate.includes('@')) return 'A valid email address is required.';
    if (!d.emailGate.trim()) {
      // Will be allowed if server confirms session; guard is handled server-side
    }
  }
  return null;
}

// ─── Draw-pad for landlord signature on the success screen ───────────────────
function LandlordDrawPad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    setIsDrawing(true); setIsEmpty(false);
  };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const stop = () => setIsDrawing(false);
  const clear = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
          className="w-full h-28 rounded-xl border-2 border-gray-300 cursor-crosshair touch-none bg-white"
          style={{ touchAction: 'none' }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-gray-400">Draw your signature here</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" /> Clear
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isEmpty) onSave(canvasRef.current!.toDataURL('image/png'));
          }}
          disabled={isEmpty}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-lg"
        >
          <PenLine className="h-3 w-3" /> Use This Signature
        </button>
      </div>
    </div>
  );
}

// ─── Post-generation full-width success view ─────────────────────────────────
function LeaseSuccessView({
  html, state, email, data, isAuthenticated,
}: {
  html: string; state: string; email: string;
  isAuthenticated: boolean;
  data: {
    landlordLegalName: string; landlordEmail: string;
    tenantName1: string; tenantEmail1: string;
    tenantName2: string; tenantEmail2?: string;
    propertyAddress: string; state: string;
    utmSource?: string; utmMedium?: string;
  };
}) {
  // 'choice' = delivery choice screen, 'download' = blank PDF path, 'esign' = e-sign path
  type Screen = 'choice' | 'download' | 'esign';
  const [screen, setScreen] = useState<Screen>('choice');
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [esignLoading, setEsignLoading] = useState(false);
  const [esignError, setEsignError] = useState('');

  const signUpUrl = (medium: string) =>
    `/sign-up?email=${encodeURIComponent(email)}&utm_source=free_lease&utm_medium=${medium}`;

  const printLease = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  const startEsignCheckout = async () => {
    if (!sigDataUrl) { setEsignError('Please draw your signature above first.'); return; }
    if (!data.tenantEmail1) { setEsignError("Please go back and add your tenant's email address."); return; }
    setEsignLoading(true);
    setEsignError('');
    try {
      const res = await fetch('/api/public/lease/esign-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseHtml: html,
          landlordName: data.landlordLegalName,
          landlordEmail: data.landlordEmail || email,
          landlordSigDataUrl: sigDataUrl,
          tenantName1: data.tenantName1,
          tenantEmail1: data.tenantEmail1,
          tenantName2: data.tenantName2 || undefined,
          tenantEmail2: data.tenantEmail2 || undefined,
          state: data.state,
          propertyAddress: data.propertyAddress,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEsignError(json.error || 'Could not send for signing. Please try again.');
        return;
      }
      if (json.redirectUrl) { window.location.href = json.redirectUrl; return; }
      if (json.checkoutUrl) { window.location.href = json.checkoutUrl; return; }
      setEsignError('Could not start signing. Please try again.');
    } catch {
      setEsignError('Network error. Please try again.');
    } finally {
      setEsignLoading(false);
    }
  };

  // ── Delivery choice screen ────────────────────────────────────────────────
  if (screen === 'choice') {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Success banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-1">Your {state} lease is ready!</h3>
          <p className="text-emerald-100 text-sm">How would you like to use it?</p>
        </div>

        {/* Two choice cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A — download blank PDF */}
          <button
            type="button"
            onClick={() => setScreen('download')}
            className="group text-left bg-white border-2 border-gray-200 hover:border-sky-400 rounded-2xl p-5 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                <Download className="h-5 w-5 text-sky-500" />
              </div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Download as blank<br />signature PDF</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Print or save to PDF and sign in person. All signature lines are left blank for manual signatures.
            </p>
            <p className="mt-3 text-xs font-semibold text-sky-600">Free →</p>
          </button>

          {/* Option B — e-signature */}
          <button
            type="button"
            onClick={() => setScreen('esign')}
            className="group text-left bg-white border-2 border-gray-200 hover:border-emerald-400 rounded-2xl p-5 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                <Send className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Send to tenant via<br />e-signature</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              You sign first with your digital signature, then your tenant receives an email with a secure link to sign.
            </p>
            {isAuthenticated ? (
              <p className="mt-3 text-xs font-semibold text-emerald-600">Free with your account →</p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-emerald-600">Free — you get one on us →</p>
            )}
          </button>
        </div>

        {/* Legal disclaimer */}
        <p className="text-center text-[11px] text-gray-400">
          PropertyFlow HQ is software, not a law firm. Consult a licensed attorney before executing.
        </p>
      </div>
    );
  }

  // ── Download / blank PDF screen ───────────────────────────────────────────
  if (screen === 'download') {
    return (
      <div className="w-full space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <CheckCircle className="h-10 w-10 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-0.5">Your {state} lease is ready!</h3>
            <p className="text-emerald-100 text-sm">Save as PDF, print, and sign in person.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <button
              onClick={() => setScreen('choice')}
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={printLease}
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Lease preview + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{state} Residential Lease Agreement</span>
                </div>
                <button onClick={printLease} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700">
                  <Download className="h-3.5 w-3.5" /> Save PDF
                </button>
              </div>
              <div
                className="p-6 sm:p-8 bg-white"
                style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            {/* Tip box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-800 mb-1 text-sm">💡 How to save as PDF</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Click <strong>Print / Save PDF</strong> → in the print dialog, set <em>Destination</em> to <strong>Save as PDF</strong> → click Save.
              </p>
              <button
                onClick={printLease}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-amber-300 bg-white text-amber-800 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-amber-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Open Print Dialog
              </button>
            </div>

            {/* Changed mind — e-sign upsell */}
            <div className={`bg-white rounded-2xl p-5 space-y-3 border-2 ${isAuthenticated ? 'border-emerald-200' : 'border-sky-100'}`}>
              <div className="flex items-center gap-2">
                <Send className={`h-5 w-5 ${isAuthenticated ? 'text-emerald-500' : 'text-sky-500'}`} />
                <span className="font-bold text-sm text-gray-900">Want to send for e-signature instead?</span>
              </div>
              <p className="text-xs text-gray-500 leading-snug">
                {isAuthenticated
                  ? 'Free with your account — draw your signature and your tenant gets a secure signing link by email.'
                  : 'Draw your signature and we email your tenant a secure link to sign. You get one free e-signature on us!'}
              </p>
              <button
                type="button"
                onClick={() => setScreen('esign')}
                className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors text-white ${isAuthenticated ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-500 hover:bg-sky-600'}`}
              >
                {isAuthenticated ? 'Send Free E-Signature →' : 'Send Free E-Signature →'}
              </button>
            </div>

            {/* Free trial nudge (guests only) */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Infinity className="h-5 w-5" />
                  <span className="font-bold text-sm">Get unlimited e-signatures free</span>
                </div>
                <p className="text-sky-100 text-xs mb-3 leading-relaxed">
                  Sign up for a free 14-day PropertyFlow trial — unlimited leases, free e-signatures, rent collection, and more included.
                </p>
                <a
                  href={signUpUrl('download_screen_esign_upsell')}
                  className="block text-center bg-white text-sky-600 font-bold px-4 py-2.5 rounded-xl hover:bg-sky-50 transition-colors text-sm"
                >
                  Start Free Trial — No Credit Card →
                </a>
                <p className="mt-1.5 text-center text-xs text-sky-200">14-day trial · Cancel any time</p>
              </div>
            )}

            {/* Legal disclaimer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-600 mb-0.5">Legal disclaimer</p>
              PropertyFlow HQ is software, not a law firm. This lease does not constitute legal advice. Consult a licensed attorney in your state before executing.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── E-signature screen ────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* Banner */}
      <div className={`rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isAuthenticated ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-sky-500 to-cyan-500'}`}>
        <Send className="h-10 w-10 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-0.5">Send for e-signature</h3>
          <p className={`text-sm ${isAuthenticated ? 'text-emerald-100' : 'text-sky-100'}`}>
            {isAuthenticated
              ? 'Draw your signature below — free with your account. Your tenant will receive a secure signing link by email.'
              : 'Draw your signature below. Your tenant receives a secure link by email to sign.'}
          </p>
        </div>
        <button
          onClick={() => setScreen('choice')}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lease preview */}
        <div className="lg:col-span-2">
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">{state} Residential Lease Agreement</span>
            </div>
            <div
              className="p-6 sm:p-8 bg-white"
              style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        {/* E-sign actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className={`bg-white rounded-2xl p-5 space-y-4 border-2 ${isAuthenticated ? 'border-emerald-300' : 'border-sky-200'}`}>
            {/* Price badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className={`h-5 w-5 ${isAuthenticated ? 'text-emerald-500' : 'text-sky-500'}`} />
                <span className="font-bold text-base text-gray-900">E-Signature</span>
              </div>
              {isAuthenticated ? (
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
              ) : (
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free — 1 on us!</span>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-snug">
              {isAuthenticated
                ? 'Sign below and your tenant gets a secure link to sign. Both of you get a fully executed copy.'
                : 'Sign below and your tenant gets an email with a secure link to sign. Both of you receive the fully executed lease. You get one free e-signature on us!'}
            </p>

            {/* Signature pad */}
            {!sigDataUrl ? (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  Draw your signature <span className="text-red-500">*</span>
                </p>
                <LandlordDrawPad onSave={setSigDataUrl} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-700">Your signature ✓</p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                  <img src={sigDataUrl} alt="Your signature" className="h-8 object-contain" />
                  <button type="button" onClick={() => setSigDataUrl(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-2">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Tenant email warning */}
            {!data.tenantEmail1 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ No tenant email was provided. Go back to Step 2 and add your tenant&apos;s email to use this feature.
              </p>
            )}

            {esignError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{esignError}</p>
            )}

            <button
              onClick={startEsignCheckout}
              disabled={!sigDataUrl || !data.tenantEmail1 || esignLoading}
              className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors ${isAuthenticated ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-500 hover:bg-sky-600'}`}
            >
              {esignLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending invites…</>
              ) : (
                <><Send className="h-4 w-4" /> {isAuthenticated ? 'Send Free E-Signature' : 'Send Free E-Signature'}</>
              )}
            </button>
            <p className="text-center text-[11px] text-gray-400">
              {isAuthenticated ? 'Free with your account · Legally binding' : 'Free · One per email address · Legally binding'}
            </p>
          </div>

          {/* Guest: free-trial alternative */}
          {!isAuthenticated && (
            <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Infinity className="h-5 w-5" />
                <span className="font-bold text-sm">Want unlimited e-signatures?</span>
              </div>
              <p className="text-sky-100 text-xs mb-3 leading-relaxed">
                Start a free 14-day PropertyFlow trial and get unlimited leases + free e-signatures included — no limits, ever.
              </p>
              <a
                href={signUpUrl('esign_screen_trial_upsell')}
                className="block text-center bg-white text-sky-600 font-bold px-4 py-2.5 rounded-xl hover:bg-sky-50 transition-colors text-sm"
              >
                Start Free Trial — No Credit Card →
              </a>
              <p className="mt-1.5 text-center text-xs text-sky-200">14-day trial · Cancel any time</p>
            </div>
          )}

          {/* Feature grid */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Everything included in your trial</p>
            <div className="space-y-3">
              {[
                { icon: <PenLine className="h-4 w-4 text-sky-500" />, title: 'E-Signatures', desc: 'Tenants sign from any device — legally binding' },
                { icon: <Infinity className="h-4 w-4 text-sky-500" />, title: 'Unlimited Leases', desc: 'Generate leases for every property & unit' },
                { icon: <CreditCard className="h-4 w-4 text-sky-500" />, title: 'Online Rent Collection', desc: 'ACH & card, auto-reminders, late fee tracking' },
                { icon: <Users className="h-4 w-4 text-sky-500" />, title: 'Tenant Portal', desc: 'Tenants pay rent, submit requests, view docs' },
                { icon: <Wrench className="h-4 w-4 text-sky-500" />, title: 'Maintenance Tracking', desc: 'Work orders, photos, contractor assignment' },
                { icon: <BarChart3 className="h-4 w-4 text-sky-500" />, title: 'Rental Accounting', desc: 'P&L, rent roll, expense tracking, tax-ready' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{f.title}</p>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href={signUpUrl('esign_screen_features')}
              className="mt-4 block text-center bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              Get All Features Free for 14 Days
            </a>
          </div>

          {/* Legal disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-0.5">Legal disclaimer</p>
            PropertyFlow HQ is software, not a law firm. This lease does not constitute legal advice. Consult a licensed attorney in your state before executing.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────
export default function PublicLeaseWizard({ onLeaseGenerated }: { onLeaseGenerated?: () => void }) {
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = sessionStatus === 'authenticated' && !!session?.user;
  const sessionEmail = session?.user?.email ?? '';

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [stepError, setStepError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [leaseHtml, setLeaseHtml] = useState<string | null>(null);
  const [signingHtml, setSigningHtml] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const set = (k: keyof WizardData, v: string | boolean) => {
    setData((prev) => ({ ...prev, [k]: v }));
    if (stepError) setStepError('');
  };

  // Separate setter for array fields (utilities, includedAreas)
  const setArr = (k: keyof WizardData, v: string[]) => {
    setData((prev) => ({ ...prev, [k]: v }));
    if (stepError) setStepError('');
  };

  const next = () => {
    const err = validateStep(step, data);
    if (err) { setStepError(err); return; }
    setStepError('');
    if (step < 7) setStep((s) => s + 1);
    else generate();
  };

  const prev = () => {
    setStepError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const generate = async () => {
    setLoading(true);
    setApiError('');
    try {
      const tenantNames = [data.tenantName1];
      if (data.tenantName2.trim()) tenantNames.push(data.tenantName2);

      // Grab UTM params from URL so they're stored with the lead
      const urlParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

      // Signed-in: send session email so the server can identify the user
      const effectiveEmail = isSignedIn ? sessionEmail : data.emailGate;

      const payload = {
        ...data,
        emailGate: effectiveEmail,
        tenantNames,
        tenantEmails: data.tenantEmail1 ? [data.tenantEmail1] : [],
        utmSource:   urlParams.get('utm_source')   || undefined,
        utmMedium:   urlParams.get('utm_medium')   || undefined,
        utmCampaign: urlParams.get('utm_campaign') || undefined,
        monthlyRent: Number(data.monthlyRent),
        securityDepositAmount: Number(data.securityDepositAmount) || Number(data.monthlyRent),
        lateFeeAmount: data.lateFeeAmount ? Number(data.lateFeeAmount) : undefined,
        petDeposit: data.petDeposit ? Number(data.petDeposit) : undefined,
        petRent: data.petRent ? Number(data.petRent) : undefined,
        rentDueDay: Number(data.rentDueDay),
        entryNoticeDays: Number(data.entryNoticeDays) || 24,
        moveOutNoticeDays: Number(data.moveOutNoticeDays) || 30,
        // Build additionalTerms array from newline-separated textarea
        additionalTerms: data.additionalTerms
          ? data.additionalTerms.split('\n').map((t) => t.trim()).filter(Boolean)
          : undefined,
        // Build parkingRules / guestPolicy / garbageRules into hoaRules if present
        hoaRules: [
          data.parkingRules ? `Parking: ${data.parkingRules}` : '',
          data.garbageRules ? `Garbage & Trash: ${data.garbageRules}` : '',
          data.laundryAccess ? `Laundry: ${data.laundryAccess}` : '',
          data.guestPolicy ? `Guests: ${data.guestPolicy}` : '',
        ].filter(Boolean).join('\n\n') || undefined,
      };

      const res = await fetch('/api/public/lease/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error || json.message || 'Something went wrong. Please try again.');
        return;
      }

      setIsAuthenticated(json.isAuthenticated ?? false);
      setLeaseHtml(json.html);
      setSigningHtml(json.signingHtml ?? null);
      onLeaseGenerated?.();
    } catch {
      setApiError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Lease generated — full-width success view ────────────────────────────
  if (leaseHtml) {
    return (
      <PublicLeaseSuccess
        leaseHtml={leaseHtml}
        signingHtml={signingHtml ?? leaseHtml}
        state={data.state}
        email={isSignedIn ? sessionEmail : data.emailGate}
        isAuthenticated={isAuthenticated}
        data={{
          landlordLegalName: data.landlordLegalName,
          landlordEmail: data.landlordEmail,
          tenantName1: data.tenantName1,
          tenantEmail1: data.tenantEmail1,
          tenantName2: data.tenantName2,
          tenantEmail2: undefined,
          propertyAddress: data.propertyAddress,
          state: data.state,
          monthlyRent: data.monthlyRent,
        }}
      />
    );
  }

  // ── Wizard UI ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-white" />
          <h2 className="text-lg font-bold text-white">Free Lease Agreement Builder</h2>
        </div>
        <ProgressBar current={step} />
      </div>

      {/* Body */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {step === 1 && 'Step 1 — State & Property Type'}
          {step === 2 && 'Step 2 — Landlord & Tenant'}
          {step === 3 && 'Step 3 — Lease Terms & Rent'}
          {step === 4 && 'Step 4 — Utilities & Bills'}
          {step === 5 && 'Step 5 — Rules & Policies'}
          {step === 6 && 'Step 6 — Pets & Insurance'}
          {step === 7 && 'Step 7 — Generate Your Lease'}
        </h3>

        {step === 1 && <Step1 d={data} set={set} setArr={setArr} />}
        {step === 2 && <Step2 d={data} set={set} />}
        {step === 3 && <Step3 d={data} set={set} />}
        {step === 4 && <Step4 d={data} setArr={setArr} />}
        {step === 5 && <Step5 d={data} set={set} />}
        {step === 6 && <Step6 d={data} set={set} />}
        {step === 7 && <Step7 d={data} set={set} loading={loading} error={apiError} isSignedIn={isSignedIn} sessionEmail={sessionEmail} />}

        {stepError && (
          <div className="mt-4 flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{stepError}</span>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
        <button
          onClick={prev}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-xs text-gray-400">{step} of 7</span>
        <button
          onClick={next}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : step === 7 ? (
            <>
              <Download className="h-4 w-4" />
              Generate Free Lease
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
