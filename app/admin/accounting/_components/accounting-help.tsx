'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, BookOpen } from 'lucide-react';

export interface HelpBlock {
  /** One-sentence plain-English subtitle shown above the report. */
  summary: string;
  /** What this report actually shows (2-3 lines, no jargon). */
  whatItShows: string;
  /** When / why a small landlord would use it. */
  whenToUse: string;
  /** Short list of practical tips for this report. */
  tips?: string[];
  /** Link out to learn more (optional). */
  learnMoreHref?: string;
  learnMoreLabel?: string;
}

interface AccountingHelpProps {
  block: HelpBlock;
  defaultOpen?: boolean;
}

export default function AccountingHelp({ block, defaultOpen = false }: AccountingHelpProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className='rounded-lg border border-sky-100 bg-sky-50/50 overflow-hidden'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sky-50 transition-colors'
        aria-expanded={open}
      >
        <div className='h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0'>
          <HelpCircle className='h-3.5 w-3.5 text-sky-600' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-sky-900'>What is this?</p>
          {!open && <p className='text-xs text-sky-800/70 truncate'>{block.summary}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-sky-600 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className='px-4 pb-4 pt-1 space-y-3 text-sm border-t border-sky-100'>
          <p className='text-gray-700 leading-relaxed'>{block.whatItShows}</p>
          <div>
            <p className='text-xs font-semibold text-sky-900 uppercase tracking-wide mb-1'>
              When to use it
            </p>
            <p className='text-gray-700 leading-relaxed'>{block.whenToUse}</p>
          </div>
          {block.tips && block.tips.length > 0 && (
            <div>
              <p className='text-xs font-semibold text-sky-900 uppercase tracking-wide mb-1'>
                Tips
              </p>
              <ul className='text-gray-700 space-y-1 list-disc list-inside'>
                {block.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {block.learnMoreHref && (
            <a
              href={block.learnMoreHref}
              className='inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 text-xs font-medium'
            >
              <BookOpen className='h-3 w-3' />
              {block.learnMoreLabel || 'Learn more'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
