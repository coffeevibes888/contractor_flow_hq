'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Building2, Wrench } from 'lucide-react';

export default function AudienceTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine which tab is active based on the current route
  const isContractor = pathname === '/contractor';
  const isPM = !isContractor;

  return (
    <div className="relative z-20 w-full flex justify-center items-center gap-3 py-3 px-4 overflow-x-hidden">

      {/* Left hint — visible when contractor is active, desktop only */}
      <div className={`hidden sm:flex items-center gap-2 transition-all duration-300 animate-float ${isContractor ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <span className="text-sm sm:text-base font-bold text-sky-400 whitespace-nowrap drop-shadow-sm">Property Manager? Click here</span>
        <svg className="h-5 w-5 text-sky-400 animate-bounce-x" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </div>

      {/* Toggle pill */}
      <div className="relative z-20 inline-flex items-center gap-1.5 p-1 animate-float">
        {/* PM button */}
        <button
          onClick={() => router.push('/')}
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${
            isPM
              ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40 scale-105'
              : 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white opacity-80 shadow-md shadow-cyan-900/40'
          }`}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          Property Managers
        </button>

        {/* Contractor button */}
        <button
          onClick={() => router.push('/contractor')}
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${
            isContractor
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-600/40 scale-105'
              : 'bg-gradient-to-r from-orange-700 to-orange-600 text-white opacity-80 shadow-md shadow-orange-900/40'
          }`}
        >
          <Wrench className="h-3.5 w-3.5 shrink-0" />
          Contractors
        </button>
      </div>

      {/* Right hint — visible when PM is active, desktop only */}
      <div className={`hidden sm:flex items-center gap-2 transition-all duration-300 animate-float ${isPM ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <svg className="h-5 w-5 text-orange-500 animate-bounce-x" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
        <span className="text-sm sm:text-base font-bold text-orange-500 whitespace-nowrap drop-shadow-sm">Contractor? Click here</span>
      </div>

    </div>
  );
}
