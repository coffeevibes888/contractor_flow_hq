'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCurrentLandlordSubdomain } from '@/lib/actions/landlord.actions';
import { Copy, Check, ExternalLink, Share2 } from 'lucide-react';

interface SubdomainFormProps {
  currentSubdomain: string;
  baseUrl: string;
}

export default function SubdomainForm({ currentSubdomain, baseUrl }: SubdomainFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [slugValue, setSlugValue] = useState(currentSubdomain);
  const [copied, setCopied] = useState(false);

  const portalUrl = slugValue ? `${baseUrl}/${slugValue}` : '';

  const handleCopyLink = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(false);
    
    startTransition(async () => {
      const result = await updateCurrentLandlordSubdomain(formData);
      
      if (!result.success) {
        setError(result.message || 'Failed to update portal slug');
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <div className='space-y-4' data-tour="subdomain">
      {/* Show the live portal link prominently if subdomain exists */}
      {currentSubdomain && (
        <div className='rounded-xl border-2 border-emerald-400/50 bg-emerald-500/10 p-4 space-y-3'>
          <div className='flex items-center gap-2'>
            <Share2 className='h-5 w-5 text-emerald-400' />
            <span className='text-sm font-semibold text-emerald-200'>Your Tenant Portal is Live!</span>
          </div>
          
          <div className='flex items-center gap-2 bg-slate-900/60 rounded-lg p-3 border border-white/10'>
            <span className='flex-1 font-mono text-sm text-white truncate'>
              {portalUrl}
            </span>
            <button
              type='button'
              onClick={handleCopyLink}
              className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors'
            >
              {copied ? (
                <>
                  <Check className='h-3.5 w-3.5' />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className='h-3.5 w-3.5' />
                  Copy Link
                </>
              )}
            </button>
            <a
              href={portalUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors'
            >
              <ExternalLink className='h-3.5 w-3.5' />
              Visit
            </a>
          </div>
          
          <p className='text-xs text-emerald-200/80'>
            Share this link with prospective tenants. They can browse listings, apply, and pay rent here.
          </p>
        </div>
      )}

      {/* Form to set/update subdomain */}
      <form action={handleSubmit} className='space-y-3'>
        {error && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800'>
            {error}
          </div>
        )}
        {success && (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
            Portal slug updated successfully!
          </div>
        )}
        <div>
          <label className='block text-sm font-medium text-slate-200/90 mb-2'>
            {currentSubdomain ? 'Change Portal URL' : 'Set Your Portal URL'}
          </label>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-slate-400'>{baseUrl}/</span>
            <input
              type='text'
              name='subdomain'
              value={slugValue}
              onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className='flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100'
              placeholder='your-company'
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          <p className='text-xs text-slate-400 mt-1'>3-50 characters, lowercase letters, numbers, and hyphens only</p>
          {slugValue && slugValue !== currentSubdomain && (
            <p className='text-xs text-violet-300 mt-2'>
              Preview: {baseUrl}/{slugValue}
            </p>
          )}
        </div>

        <button
          type='submit'
          disabled={isPending || slugValue === currentSubdomain}
          className='inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isPending ? 'Saving...' : currentSubdomain ? 'Update URL' : 'Create Portal URL'}
        </button>
      </form>
    </div>
  );
}

