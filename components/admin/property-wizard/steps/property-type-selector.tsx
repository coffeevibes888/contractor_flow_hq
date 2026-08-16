'use client';

import { useState } from 'react';
import { Home, DoorOpen, Building2, Building, Warehouse, TreePine, Castle, Hotel, ArrowRight, Shield, Clock, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';
import {
  PropertyType,
  ListingType,
  RENTAL_PROPERTY_TYPES,
  SALE_PROPERTY_TYPES,
  PROPERTY_TYPE_INFO,
} from '../types';

const PROPERTY_TYPE_ICONS: Record<PropertyType, React.ElementType> = {
  single_family: Home,
  room_rental: DoorOpen,
  apartment_unit: Building2,
  apartment_complex: Hotel,
  commercial: Warehouse,
  condo: Building,
  townhouse: Castle,
  multi_family: Building2,
  land: TreePine,
};

// What business-minded landlords actually want to know before they commit.
// Not a tutorial — three honest answers to the questions they're already asking.
const TRUST_SIGNALS = [
  {
    icon: EyeOff,
    headline: 'Nothing goes live until you say so',
    detail: 'Save your property now, list it publicly when you\'re ready. There\'s a single toggle — off means invisible to tenants, on means it appears on your public listing page where anyone can view it and submit an application. You control it.',
  },
  {
    icon: Clock,
    headline: 'Photos and leases are both optional',
    detail: 'You don\'t need photos or a lease to save a property. Add photos only when you\'re ready to go live. Attach a lease only when you\'re ready to place a tenant — or skip it entirely if you\'re using the platform just for rent collection or maintenance.',
  },
  {
    icon: Shield,
    headline: 'Your bank info is never stored here',
    detail: 'Rent payments run through Stripe — we never see or store your bank credentials. Lease signatures are encrypted. Tenant data stays in your account only.',
  },
];

const FULL_FLOW = [
  { step: '01', color: 'bg-violet-500', title: 'Add your property', body: 'Address and rent — that\'s the minimum. Photos and lease are optional.' },
  { step: '02', color: 'bg-sky-500',    title: 'Go live when ready', body: 'One toggle publishes your listing to the public page. Flip it off any time.' },
  { step: '03', color: 'bg-emerald-500', title: 'Tenants apply online', body: 'Applicants fill out your form. You approve or decline with one click.' },
  { step: '04', color: 'bg-amber-500',  title: 'Lease auto-generated', body: 'If you have a lease template, it drafts itself and goes out for e-signature.' },
  { step: '05', color: 'bg-rose-500',   title: 'Rent deposits to you', body: 'Tenant pays in their portal. Money goes straight to your bank via Stripe.' },
];

export function PropertyTypeSelector() {
  const { state, setPropertyType, setListingType } = useWizard();
  const [showFlow, setShowFlow] = useState(false);

  const propertyTypes = state.listingType === 'rent' ? RENTAL_PROPERTY_TYPES : SALE_PROPERTY_TYPES;

  return (
    <div className="space-y-0">

      {/* ── TRUST SIGNALS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
        {TRUST_SIGNALS.map(({ icon: Icon, headline, detail }) => (
          <div key={headline} className="flex gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex-shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{headline}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── LISTING TYPE TOGGLE ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">What type of property is this?</h2>
          <p className="text-sm text-gray-500 mt-0.5">Select your property type to continue</p>
        </div>
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {(['rent', 'sale'] as ListingType[]).map((type) => (
            <button
              key={type}
              onClick={() => setListingType(type)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                state.listingType === type
                  ? type === 'rent'
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-emerald-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {type === 'rent' ? 'For Rent' : 'For Sale'}
            </button>
          ))}
        </div>
      </div>

      {/* ── PROPERTY TYPE CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {propertyTypes.map((type) => {
          const info = PROPERTY_TYPE_INFO[type];
          const Icon = PROPERTY_TYPE_ICONS[type];
          const isSelected = state.propertyType === type;

          return (
            <button
              key={type}
              onClick={() => setPropertyType(type)}
              className={cn(
                'group relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150',
                isSelected
                  ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                  : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-sm'
              )}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <div className={cn(
                'flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                isSelected
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 text-gray-500 group-hover:bg-violet-100 group-hover:text-violet-600'
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pr-4">
                <p className={cn(
                  'text-sm font-semibold leading-tight',
                  isSelected ? 'text-violet-900' : 'text-gray-800'
                )}>
                  {info.label}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                  {info.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── ENTERPRISE HINT ───────────────────────────────────────────────── */}
      {state.propertyType === 'apartment_complex' && (
        <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Building2 className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Apartment Complex — bulk setup included</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You'll define building structure, unit templates, and generate all units in bulk. Some advanced features require an enterprise plan.
            </p>
          </div>
        </div>
      )}

      {/* ── SELECTED SUMMARY ─────────────────────────────────────────────── */}
      {state.propertyType && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-900">{PROPERTY_TYPE_INFO[state.propertyType].label}</span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          <span className={state.listingType === 'rent' ? 'text-violet-600 font-semibold' : 'text-emerald-600 font-semibold'}>
            {state.listingType === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          <span className="text-gray-400">— click Next to continue</span>
        </div>
      )}

      {/* ── FULL FLOW (collapsible) ───────────────────────────────────────── */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowFlow((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showFlow ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showFlow ? 'Hide' : 'See how the full workflow works after setup'}
        </button>

        {showFlow && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
            {FULL_FLOW.map((item, i) => (
              <div key={item.step} className="relative flex sm:flex-col gap-3 sm:gap-2">
                {i < FULL_FLOW.length - 1 && (
                  <div className="hidden sm:block absolute top-3.5 left-[calc(50%+14px)] right-[-50%] h-px bg-gray-200 z-0" />
                )}
                <div className={`relative z-10 flex-shrink-0 h-7 w-7 rounded-full ${item.color} flex items-center justify-center`}>
                  <span className="text-[10px] font-black text-white">{item.step}</span>
                </div>
                <div className="flex-1 sm:text-center">
                  <p className="text-xs font-semibold text-gray-800 leading-tight mb-0.5">{item.title}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
