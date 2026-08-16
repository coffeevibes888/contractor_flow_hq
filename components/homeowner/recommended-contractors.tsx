'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRecommendedContractors } from '@/lib/actions/homeowner.actions';
import { Wrench, Star, CheckCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  isPaymentReady: boolean;
  completedJobs: number;
  rating: number;
  matchScore: number;
  matchingServices: string[];
  user: { id: string; name: string | null; image: string | null } | null;
}

interface RecommendedContractorsProps {
  interestedServices: string[];
}

export default function RecommendedContractors({ interestedServices }: RecommendedContractorsProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getRecommendedContractors({ limit: 6 });
      if (result.success && result.contractors) {
        setContractors(result.contractors);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </CardContent>
      </Card>
    );
  }

  if (contractors.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Recommended Contractors
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Wrench className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-700 mb-4">No contractors found matching your preferences yet.</p>
          <Link href="/contractor-marketplace">
            <Button variant="outline">Browse All Contractors</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Recommended For You
        </CardTitle>
        <Link href="/contractor-marketplace" className="text-sm text-sky-600 hover:text-sky-500">
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.map(contractor => (
            <Link key={contractor.id} href={`/contractors/${contractor.id}`}>
              <div className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-sky-400 to-blue-500 flex-shrink-0">
                    {contractor.user?.image ? (
                      <Image src={contractor.user.image} alt={contractor.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white font-bold text-lg">
                        {contractor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{contractor.name}</h4>
                    <div className="flex items-center gap-1 text-sm text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{contractor.rating.toFixed(1)}</span>
                      <span className="text-slate-500">• {contractor.completedJobs} jobs</span>
                    </div>
                  </div>
                  {contractor.matchScore >= 80 && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      {contractor.matchScore}% match
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {contractor.specialties.slice(0, 3).map(spec => (
                    <Badge 
                      key={spec} 
                      variant="secondary" 
                      className={`text-xs ${
                        contractor.matchingServices.includes(spec)
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {spec}
                    </Badge>
                  ))}
                  {contractor.specialties.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500">
                      +{contractor.specialties.length - 3}
                    </Badge>
                  )}
                </div>

                {contractor.isPaymentReady && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Payment verified</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
