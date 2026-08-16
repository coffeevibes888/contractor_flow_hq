'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackHref: string;
  label?: string;
}

export default function BackButton({ fallbackHref, label = 'Back to listings' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // If there's a history entry to go back to, use it.
    // Otherwise fall back to the provided href.
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
