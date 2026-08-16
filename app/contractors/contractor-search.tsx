'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContractorSearchProps {
  initialQuery?: string;
  initialSpecialty?: string;
}

export default function ContractorSearch({ initialQuery, initialSpecialty }: ContractorSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery || '');
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('location', location);
    if (initialSpecialty) params.set('specialty', initialSpecialty);
    router.push(`/contractor-marketplace?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row gap-2 bg-slate-400 border border-black rounded-xl p-2 shadow-2xl">
        <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-slate-100 border border-black rounded-lg">
          <Search className="h-5 w-5 text-slate-700" />
          <input
            type="text"
            placeholder="Search contractors or services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-black rounded-lg md:w-48">
          <MapPin className="h-5 w-5 text-slate-700" />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 bg-transparent outline-none text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal"
          />
        </div>
        <Button 
          type="submit"
          size="lg"
          variant="brand"
          className="font-bold px-8 border border-black"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
